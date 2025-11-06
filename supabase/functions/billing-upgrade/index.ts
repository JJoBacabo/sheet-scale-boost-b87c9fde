import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

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

    // Rate limiting - 10 requests per minute per user
    const rateLimit = checkRateLimit(user.id, { windowMs: 60000, maxRequests: 10 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(user.id, rateLimit.resetTime);
    }

    const { plan_code } = await req.json();

    if (!plan_code) {
      throw new Error('Plan code is required');
    }

    // Get plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('code', plan_code)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      throw new Error('Plan not found');
    }

    // Create Stripe checkout session via existing function
    const { data: checkoutData, error: checkoutError } = await supabaseAdmin.functions.invoke(
      'stripe-create-checkout',
      {
        body: {
          priceId: plan.stripe_price_id,
          planName: plan.name,
          billingPeriod: plan.cadence,
        },
        headers: {
          Authorization: authHeader,
        },
      }
    );

    if (checkoutError || !checkoutData?.url) {
      throw new Error('Failed to create checkout session');
    }

    console.log(`✅ Created upgrade checkout for user ${user.id} to plan ${plan_code}`);

    return new Response(
      JSON.stringify({ url: checkoutData.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error in billing-upgrade:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
