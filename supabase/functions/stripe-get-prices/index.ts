import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    console.log('🔍 Checking for existing products...');

    // Get all products with their prices
    const products = await stripe.products.list({ limit: 100 });
    const existingProducts = products.data.filter((p: Stripe.Product) => 
      ['beginner', 'basic', 'standard', 'expert'].includes(p.metadata?.plan_type)
    );

    console.log(`📦 Found ${existingProducts.length} existing products`);

    // If we have all 4 products, return their prices
    if (existingProducts.length === 4) {
      const priceConfig: Record<string, { monthly: string; annual: string }> = {};

      for (const product of existingProducts) {
        const prices = await stripe.prices.list({
          product: product.id,
          limit: 10,
        });

        const monthlyPrice = prices.data.find((p: Stripe.Price) => p.recurring?.interval === 'month');
        const annualPrice = prices.data.find((p: Stripe.Price) => p.recurring?.interval === 'year');

        if (monthlyPrice && annualPrice && product.metadata?.plan_type) {
          priceConfig[product.metadata.plan_type] = {
            monthly: monthlyPrice.id,
            annual: annualPrice.id,
          };
        }
      }

      console.log('✅ Returning existing price configuration');
      return new Response(
        JSON.stringify({ priceConfig, created: false }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // If products don't exist, create them
    console.log('🚀 Creating new products and prices...');

    const productDefinitions = [
      {
        name: 'Beginner',
        description: 'Basic Daily ROAS - Sem automação',
        monthlyPrice: 499, // €4.99
        annualPrice: 4491, // €44.91 (was €59.88)
        storeLimit: 0,
        campaignLimit: 0,
        features: ['basic_daily_roas'],
      },
      {
        name: 'Basic',
        description: 'Daily ROAS Profit Sheet - 1 loja, 15 campanhas',
        monthlyPrice: 1499, // €14.99
        annualPrice: 13491, // €134.91 (was €179.88)
        storeLimit: 1,
        campaignLimit: 15,
        features: ['daily_roas_profit_sheet'],
      },
      {
        name: 'Standard',
        description: 'Daily ROAS + Campaigns + Quotation - 2 lojas, 40 campanhas',
        monthlyPrice: 3499, // €34.99
        annualPrice: 31491, // €314.91 (was €419.88)
        storeLimit: 2,
        campaignLimit: 40,
        features: ['daily_roas_profit_sheet', 'campaigns', 'quotation'],
      },
      {
        name: 'Expert',
        description: 'Tudo incluído - 4 lojas, campanhas ilimitadas',
        monthlyPrice: 4999, // €49.99
        annualPrice: 44991, // €449.91 (was €599.88)
        storeLimit: 4,
        campaignLimit: -1, // -1 means unlimited
        features: ['daily_roas_profit_sheet', 'campaigns', 'quotation', 'product_research'],
      },
    ];

    const priceConfig: Record<string, { monthly: string; annual: string }> = {};

    for (const productData of productDefinitions) {
      console.log(`📦 Creating product: ${productData.name}`);

      const product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
        metadata: {
          plan_type: productData.name.toLowerCase(),
          store_limit: productData.storeLimit.toString(),
          campaign_limit: productData.campaignLimit.toString(),
          features: JSON.stringify(productData.features),
        },
      });

      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: productData.monthlyPrice,
        currency: 'eur',
        recurring: {
          interval: 'month',
        },
        metadata: {
          billing_period: 'monthly',
          plan_name: productData.name.toLowerCase(),
          store_limit: productData.storeLimit.toString(),
          campaign_limit: productData.campaignLimit.toString(),
          features: JSON.stringify(productData.features),
        },
      });

      const annualPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: productData.annualPrice,
        currency: 'eur',
        recurring: {
          interval: 'year',
        },
        metadata: {
          billing_period: 'annual',
          plan_name: productData.name.toLowerCase(),
          store_limit: productData.storeLimit.toString(),
          campaign_limit: productData.campaignLimit.toString(),
          features: JSON.stringify(productData.features),
        },
      });

      priceConfig[productData.name.toLowerCase()] = {
        monthly: monthlyPrice.id,
        annual: annualPrice.id,
      };

      console.log(`✅ Created ${productData.name}: monthly=${monthlyPrice.id}, annual=${annualPrice.id}`);
    }

    console.log('✅ All products and prices created successfully!');

    return new Response(
      JSON.stringify({
        priceConfig,
        created: true,
        message: 'Products and prices created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
