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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const { user_id, new_state, reason } = await req.json();

    if (!user_id || !new_state) {
      throw new Error('user_id and new_state are required');
    }

    const validStates = ['active', 'expired', 'suspended', 'archived'];
    if (!validStates.includes(new_state)) {
      throw new Error(`Invalid state. Must be one of: ${validStates.join(', ')}`);
    }

    // Update subscription state
    const updates: any = {
      state: new_state,
      state_change_reason: reason || `Admin force update by ${user.email}`,
      last_state_change_at: new Date().toISOString(),
    };

    // Set readonly mode for non-active states
    if (new_state !== 'active') {
      updates.readonly_mode = true;
    } else {
      updates.readonly_mode = false;
    }

    // Set grace period end date for expired state
    if (new_state === 'expired') {
      updates.grace_period_ends_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Set archive scheduled date for suspended state
    if (new_state === 'suspended') {
      updates.archive_scheduled_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Set archived date for archived state
    if (new_state === 'archived') {
      updates.archived_at = new Date().toISOString();
    }

    const { data: subscription, error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update(updates)
      .eq('user_id', user_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log the admin action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user_id,
      subscription_id: subscription.id,
      event_type: 'admin_force_status',
      event_data: {
        admin_user_id: user.id,
        admin_email: user.email,
        old_state: subscription.state,
        new_state: new_state,
        reason: reason || 'Admin force update',
      },
    });

    console.log(`✅ Admin ${user.email} forced user ${user_id} subscription to ${new_state}`);

    return new Response(
      JSON.stringify({
        success: true,
        subscription,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error in force-subscription-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
