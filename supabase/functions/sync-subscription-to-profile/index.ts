import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting subscription sync to profiles...');

    // Get all active subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('user_id, plan_code, status')
      .eq('status', 'active');

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      throw subsError;
    }

    console.log(`Found ${subscriptions?.length || 0} active subscriptions`);

    let updated = 0;
    let errors = 0;

    // Update each user's profile
    for (const sub of subscriptions || []) {
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_plan: sub.plan_code,
            subscription_status: 'active',
          })
          .eq('user_id', sub.user_id);

        if (updateError) {
          console.error(`Error updating profile for user ${sub.user_id}:`, updateError);
          errors++;
        } else {
          console.log(`✓ Updated profile for user ${sub.user_id} to plan ${sub.plan_code}`);
          updated++;
        }
      } catch (err) {
        console.error(`Exception updating user ${sub.user_id}:`, err);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${updated} profiles, ${errors} errors`,
        updated,
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
