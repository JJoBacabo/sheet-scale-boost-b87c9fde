import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`📨 Webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        
        const { data: plan } = await supabaseAdmin
          .from('plans')
          .select('*')
          .eq('stripe_price_id', subscription.items.data[0].price.id)
          .single();

        const userId = session.metadata?.user_id;
        if (!userId || !plan) {
          console.error('Missing user_id or plan');
          break;
        }

        await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_price_id: subscription.items.data[0].price.id,
          plan_name: plan.name,
          plan_code: plan.code,
          billing_period: plan.cadence,
          status: 'active',
          state: 'active' as any,
          readonly_mode: false,
          grace_period_ends_at: null,
          archive_scheduled_at: null,
          store_limit: plan.store_limit,
          campaign_limit: plan.campaign_limit,
          features_enabled: plan.features_enabled,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: false,
          state_change_reason: 'checkout_completed',
        }, { onConflict: 'user_id' });

        await supabaseAdmin.from('profiles').update({
          subscription_plan: plan.code,
          subscription_status: 'active',
        }).eq('user_id', userId);

        console.log(`✅ Subscription activated for user ${userId}`);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const { data: plan } = await supabaseAdmin
          .from('plans')
          .select('*')
          .eq('stripe_price_id', subscription.items.data[0].price.id)
          .single();

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'active',
            state: 'active' as any,
            readonly_mode: false,
            grace_period_ends_at: null,
            archive_scheduled_at: null,
            plan_name: plan?.name,
            plan_code: plan?.code,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            state_change_reason: 'invoice_paid',
          })
          .eq('stripe_subscription_id', subscription.id);

        console.log(`✅ Invoice paid, reactivated subscription ${subscription.id}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: plan } = await supabaseAdmin
          .from('plans')
          .select('*')
          .eq('stripe_price_id', subscription.items.data[0].price.id)
          .single();

        let newState = 'active';
        let readonlyMode = false;

        if (['canceled', 'unpaid', 'incomplete_expired', 'past_due'].includes(subscription.status)) {
          newState = 'expired';
          readonlyMode = true;
        }

        const updateData: any = {
          status: subscription.status,
          state: newState,
          readonly_mode: readonlyMode,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          state_change_reason: 'subscription_updated',
        };

        if (plan && newState === 'active') {
          updateData.plan_name = plan.name;
          updateData.plan_code = plan.code;
          updateData.store_limit = plan.store_limit;
          updateData.campaign_limit = plan.campaign_limit;
          updateData.features_enabled = plan.features_enabled;
          updateData.grace_period_ends_at = null;
          updateData.archive_scheduled_at = null;
        }

        await supabaseAdmin
          .from('subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', subscription.id);

        console.log(`✅ Updated subscription ${subscription.id} to state: ${newState}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'past_due',
            state: 'expired' as any,
            readonly_mode: true,
            state_change_reason: 'payment_failed',
          })
          .eq('stripe_subscription_id', invoice.subscription as string);

        console.log(`⚠️  Payment failed for subscription ${invoice.subscription}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            state: 'expired' as any,
            readonly_mode: true,
            grace_period_ends_at: gracePeriodEnd.toISOString(),
            state_change_reason: 'subscription_deleted',
          })
          .eq('stripe_subscription_id', subscription.id);

        console.log(`🗑️  Subscription deleted: ${subscription.id}`);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
