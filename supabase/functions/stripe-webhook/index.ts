import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    console.error('❌ Missing signature or webhook secret');
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`📨 Webhook received: ${event.type}`);

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0].price.id;
        const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });

        const userId = session.metadata?.user_id;
        const planName = session.metadata?.plan_name;
        const billingPeriod = session.metadata?.billing_period;

        if (!userId) {
          console.error('❌ No user_id in session metadata');
          break;
        }

        // Extract limits and features from price metadata
        const storeLimit = parseInt(price.metadata?.store_limit || '0');
        const campaignLimit = parseInt(price.metadata?.campaign_limit || '0');
        const features = price.metadata?.features ? JSON.parse(price.metadata.features) : [];

        console.log(`📊 Plan limits - Stores: ${storeLimit}, Campaigns: ${campaignLimit}, Features:`, features);

        // Upsert subscription with limits
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            plan_name: planName || 'unknown',
            billing_period: billingPeriod || 'monthly',
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            store_limit: storeLimit,
            campaign_limit: campaignLimit,
            features_enabled: features,
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single();

        if (subError) {
          console.error('❌ Error upserting subscription:', subError);
        } else {
          console.log(`✅ Subscription created/updated for user ${userId}`);
          
          // Record subscription history
          await supabase
            .from('subscription_history')
            .insert({
              user_id: userId,
              subscription_id: subData.id,
              event_type: 'created',
              plan_name: planName || 'unknown',
              billing_period: billingPeriod || 'monthly',
              status: subscription.status,
              period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              stripe_subscription_id: subscription.id,
              metadata: { 
                store_limit: storeLimit, 
                campaign_limit: campaignLimit,
                features: features 
              }
            });
          
          // Update profile with subscription plan
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              subscription_plan: planName || 'unknown',
              subscription_status: 'active',
            })
            .eq('user_id', userId);

          if (profileError) {
            console.error('❌ Error updating profile:', profileError);
          } else {
            console.log(`✅ Profile updated with plan: ${planName}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0].price.id;
        const price = await stripe.prices.retrieve(priceId);
        
        // Extract limits and features
        const storeLimit = parseInt(price.metadata?.store_limit || '0');
        const campaignLimit = parseInt(price.metadata?.campaign_limit || '0');
        const features = price.metadata?.features ? JSON.parse(price.metadata.features) : [];
        const planName = price.metadata?.plan_name || 'unknown';

        console.log(`🔄 Updating subscription - Plan: ${planName}, Status: ${subscription.status}`);
        
        // Check if subscription is being cancelled or expired
        const isExpired = subscription.status === 'canceled' || subscription.status === 'unpaid';
        const shouldRevertToFree = isExpired || (subscription.cancel_at_period_end && new Date(subscription.current_period_end * 1000) <= new Date());
        
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            store_limit: shouldRevertToFree ? 0 : storeLimit,
            campaign_limit: shouldRevertToFree ? 0 : campaignLimit,
            features_enabled: shouldRevertToFree ? [] : features,
            plan_name: shouldRevertToFree ? 'trial' : planName,
          })
          .eq('stripe_subscription_id', subscription.id)
          .select()
          .single();

        if (subError) {
          console.error('❌ Error updating subscription:', subError);
        } else {
          console.log(`✅ Subscription updated: ${subscription.id}`);
          
          // Record subscription history
          if (subData) {
            const eventType = shouldRevertToFree ? 'expired' : 'renewed';
            await supabase
              .from('subscription_history')
              .insert({
                user_id: subData.user_id,
                subscription_id: subData.id,
                event_type: eventType,
                plan_name: shouldRevertToFree ? 'trial' : planName,
                billing_period: subData.billing_period,
                status: subscription.status,
                period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                stripe_subscription_id: subscription.id,
                metadata: { 
                  store_limit: shouldRevertToFree ? 0 : storeLimit, 
                  campaign_limit: shouldRevertToFree ? 0 : campaignLimit,
                  features: shouldRevertToFree ? [] : features 
                }
              });
          }
          
          // Update profile
          const { data: profileSub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .single();

          if (profileSub) {
            await supabase
              .from('profiles')
              .update({
                subscription_plan: shouldRevertToFree ? 'trial' : planName,
                subscription_status: subscription.status === 'active' ? 'active' : 'inactive',
              })
              .eq('user_id', profileSub.user_id);
            
            if (shouldRevertToFree) {
              console.log(`🔄 Reverted user ${profileSub.user_id} to FREE plan`);
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const { data: subData, error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
          })
          .eq('stripe_subscription_id', subscription.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating subscription:', error);
        } else {
          console.log(`✅ Subscription canceled: ${subscription.id}`);
          
          // Record subscription history
          if (subData) {
            await supabase
              .from('subscription_history')
              .insert({
                user_id: subData.user_id,
                subscription_id: subData.id,
                event_type: 'canceled',
                plan_name: 'trial',
                billing_period: subData.billing_period,
                status: 'canceled',
                period_start: subData.current_period_start,
                period_end: subData.current_period_end,
                stripe_subscription_id: subscription.id,
                metadata: {}
              });
          }
          
          // Update profile to trial
          const { data: canceledSub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .single();

          if (canceledSub) {
            await supabase
              .from('profiles')
              .update({
                subscription_plan: 'trial',
                subscription_status: 'inactive',
              })
              .eq('user_id', canceledSub.user_id);
          }
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});