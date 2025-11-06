import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('🔍 Checking for expired subscriptions and trials...');

    // Get all active subscriptions where current_period_end has passed
    const { data: expiredSubs, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lt('current_period_end', new Date().toISOString());

    if (fetchError) {
      console.error('❌ Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    // Get all profiles with expired trials (trial_ends_at has passed and subscription_plan is 'trial')
    const { data: expiredTrials, error: trialsError } = await supabase
      .from('profiles')
      .select('*')
      .eq('subscription_plan', 'trial')
      .lt('trial_ends_at', new Date().toISOString());

    if (trialsError) {
      console.error('❌ Error fetching expired trials:', trialsError);
      throw trialsError;
    }

    const totalExpired = (expiredSubs?.length || 0) + (expiredTrials?.length || 0);
    console.log(`📊 Found ${expiredSubs?.length || 0} expired subscriptions and ${expiredTrials?.length || 0} expired trials`);

    if (totalExpired === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired subscriptions or trials found',
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    // Process expired subscriptions
    if (expiredSubs && expiredSubs.length > 0) {
      for (const sub of expiredSubs) {
        console.log(`⏰ Processing expired subscription for user ${sub.user_id}`);
        
        // Update subscription to inactive and plan to trial (FREE)
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            status: 'inactive',
            plan_name: 'trial',
          })
          .eq('id', sub.id);

        if (subError) {
          console.error(`❌ Error updating subscription ${sub.id}:`, subError);
          results.push({ user_id: sub.user_id, type: 'subscription', success: false, error: subError.message });
          continue;
        }

        // Record subscription history
        await supabase
          .from('subscription_history')
          .insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            event_type: 'expired',
            plan_name: 'trial',
            billing_period: sub.billing_period,
            status: 'inactive',
            period_start: sub.current_period_start,
            period_end: sub.current_period_end,
            stripe_subscription_id: sub.stripe_subscription_id,
            metadata: {}
          });

        // Update profile to FREE plan
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            subscription_plan: 'trial',
            subscription_status: 'inactive',
          })
          .eq('user_id', sub.user_id);

        if (profileError) {
          console.error(`❌ Error updating profile for user ${sub.user_id}:`, profileError);
          results.push({ user_id: sub.user_id, type: 'subscription', success: false, error: profileError.message });
          continue;
        }

        console.log(`✅ Reverted subscription for user ${sub.user_id} to FREE plan`);
        results.push({ user_id: sub.user_id, type: 'subscription', success: true, plan_name: sub.plan_name });
      }
    }

    // Process expired trials
    if (expiredTrials && expiredTrials.length > 0) {
      for (const profile of expiredTrials) {
        console.log(`⏰ Processing expired trial for user ${profile.user_id}`);
        
        // Update profile to FREE plan (keep trial status but mark as expired)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'inactive',
          })
          .eq('user_id', profile.user_id);

        if (profileError) {
          console.error(`❌ Error updating profile for user ${profile.user_id}:`, profileError);
          results.push({ user_id: profile.user_id, type: 'trial', success: false, error: profileError.message });
          continue;
        }

        // Record trial expiration in history (without subscription_id since it's a trial)
        await supabase
          .from('subscription_history')
          .insert({
            user_id: profile.user_id,
            subscription_id: null,
            event_type: 'expired',
            plan_name: 'trial',
            billing_period: 'trial',
            status: 'inactive',
            period_start: profile.created_at,
            period_end: profile.trial_ends_at,
            stripe_subscription_id: null,
            metadata: { 
              trial_expired: true,
              trial_duration_days: 10 
            }
          });

        console.log(`✅ Expired trial for user ${profile.user_id}`);
        results.push({ user_id: profile.user_id, type: 'trial', success: true });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${totalExpired} expired items`,
        count: totalExpired,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in check-expired-subscriptions:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
