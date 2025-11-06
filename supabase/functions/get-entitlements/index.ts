import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Fetch usage
    const { data: usage } = await supabase
      .from('usage_counters')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Build entitlements response
    const entitlements = {
      user_id: user.id,
      plan: {
        code: subscription?.plan_code || 'free',
        name: subscription?.plan_name || 'FREE',
        state: subscription?.state || 'active',
        readonly: subscription?.readonly_mode || false,
      },
      limits: {
        stores: {
          limit: usage?.stores_limit || 1,
          used: usage?.stores_used || 0,
          available: (usage?.stores_limit || 1) - (usage?.stores_used || 0),
        },
        campaigns: {
          limit: usage?.campaigns_limit || 5,
          used: usage?.campaigns_used || 0,
          available: (usage?.campaigns_limit || 5) - (usage?.campaigns_used || 0),
        },
      },
      features: subscription?.features_enabled || [],
      subscription_ends_at: subscription?.current_period_end,
      grace_period_ends_at: subscription?.grace_period_ends_at,
      archive_scheduled_at: subscription?.archive_scheduled_at,
    };

    return new Response(
      JSON.stringify(entitlements),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in get-entitlements:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
