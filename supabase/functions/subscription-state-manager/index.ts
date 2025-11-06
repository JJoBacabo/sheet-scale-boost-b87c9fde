import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Starting subscription state manager...');

    const now = new Date();
    const results: {
      expired: number;
      suspended: number;
      archived: number;
      errors: string[];
    } = {
      expired: 0,
      suspended: 0,
      archived: 0,
      errors: [],
    };

    // ============================================
    // 1. ACTIVE → EXPIRED (period ended, no renewal)
    // ============================================
    const { data: toExpire, error: expireError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('state', 'active')
      .lt('current_period_end', now.toISOString())
      .neq('status', 'active'); // Stripe status not active = not renewed

    if (expireError) {
      console.error('❌ Error fetching subscriptions to expire:', expireError);
      results.errors.push(expireError.message);
    }

    if (toExpire && toExpire.length > 0) {
      console.log(`⏱️  Found ${toExpire.length} subscriptions to expire`);
      
      for (const sub of toExpire) {
        const gracePeriodEnd = new Date(now);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7); // D+7

        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            state: 'expired',
            readonly_mode: true,
            grace_period_ends_at: gracePeriodEnd.toISOString(),
            state_change_reason: 'subscription_period_ended',
          })
          .eq('id', sub.id);

        if (updateError) {
          console.error(`❌ Error expiring subscription ${sub.id}:`, updateError);
          results.errors.push(updateError.message);
        } else {
          results.expired++;
          console.log(`✅ Expired subscription ${sub.id} for user ${sub.user_id}`);

          // Log to subscription history
          await supabaseAdmin.from('subscription_history').insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            event_type: 'expired',
            plan_name: sub.plan_name,
            billing_period: sub.billing_period,
            status: 'expired',
            metadata: { reason: 'period_ended' },
          });
        }
      }
    }

    // ============================================
    // 2. EXPIRED → SUSPENDED (D+7 grace period ended)
    // ============================================
    const { data: toSuspend, error: suspendError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('state', 'expired')
      .lt('grace_period_ends_at', now.toISOString());

    if (suspendError) {
      console.error('❌ Error fetching subscriptions to suspend:', suspendError);
      results.errors.push(suspendError.message);
    }

    if (toSuspend && toSuspend.length > 0) {
      console.log(`🚫 Found ${toSuspend.length} subscriptions to suspend`);
      
      for (const sub of toSuspend) {
        const archiveScheduled = new Date(now);
        archiveScheduled.setDate(archiveScheduled.getDate() + 7); // D+14 total

        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            state: 'suspended',
            archive_scheduled_at: archiveScheduled.toISOString(),
            state_change_reason: 'grace_period_ended',
          })
          .eq('id', sub.id);

        if (updateError) {
          console.error(`❌ Error suspending subscription ${sub.id}:`, updateError);
          results.errors.push(updateError.message);
        } else {
          results.suspended++;
          console.log(`✅ Suspended subscription ${sub.id} for user ${sub.user_id}`);

          await supabaseAdmin.from('subscription_history').insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            event_type: 'suspended',
            plan_name: sub.plan_name,
            billing_period: sub.billing_period,
            status: 'suspended',
            metadata: { reason: 'grace_period_ended' },
          });
        }
      }
    }

    // ============================================
    // 3. SUSPENDED → ARCHIVED (D+14 total, anonymize data)
    // ============================================
    const { data: toArchive, error: archiveError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('state', 'suspended')
      .lt('archive_scheduled_at', now.toISOString());

    if (archiveError) {
      console.error('❌ Error fetching subscriptions to archive:', archiveError);
      results.errors.push(archiveError.message);
    }

    if (toArchive && toArchive.length > 0) {
      console.log(`🗄️  Found ${toArchive.length} subscriptions to archive`);
      
      for (const sub of toArchive) {
        // Get user data for snapshot
        const { data: userData, error: userError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', sub.user_id)
          .single();

        if (!userError && userData) {
          // Create encrypted snapshot
          const snapshot = JSON.stringify({
            profile: userData,
            subscription: sub,
            timestamp: now.toISOString(),
          });

          await supabaseAdmin.from('archived_user_data').insert({
            original_user_id: sub.user_id,
            encrypted_snapshot: new TextEncoder().encode(snapshot), // In production, encrypt this
            metadata: { plan_name: sub.plan_name, archived_reason: 'inactivity' },
          });

          // Anonymize profile data (RGPD compliance)
          await supabaseAdmin
            .from('profiles')
            .update({
              full_name: 'Anonymized User',
              company_name: null,
            })
            .eq('user_id', sub.user_id);
        }

        // Mark subscription as archived
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            state: 'archived',
            archived_at: now.toISOString(),
            state_change_reason: 'inactive_period_ended',
          })
          .eq('id', sub.id);

        if (updateError) {
          console.error(`❌ Error archiving subscription ${sub.id}:`, updateError);
          results.errors.push(updateError.message);
        } else {
          results.archived++;
          console.log(`✅ Archived subscription ${sub.id} and anonymized user ${sub.user_id}`);

          await supabaseAdmin.from('subscription_history').insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            event_type: 'archived',
            plan_name: sub.plan_name,
            billing_period: sub.billing_period,
            status: 'archived',
            metadata: { reason: 'inactivity', anonymized: true },
          });
        }
      }
    }

    console.log('✅ Subscription state manager completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Fatal error in subscription state manager:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
