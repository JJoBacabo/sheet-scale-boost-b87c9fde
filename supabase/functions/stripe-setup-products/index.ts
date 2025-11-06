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

    console.log('🚀 Starting Stripe products and prices setup...');

    const products = [
      {
        name: 'Beginner',
        description: 'ROAS Diário Básico - Sem automação',
        monthlyPrice: 499, // €4.99 in cents
        annualPrice: 4491, // €44.91 in cents
      },
      {
        name: 'Basic',
        description: 'Daily ROAS Profit Sheet - 1 loja, 15 campanhas',
        monthlyPrice: 1499, // €14.99
        annualPrice: 13491, // €134.91
      },
      {
        name: 'Standard',
        description: 'Basic + Campanhas + Cotação - 2 lojas, 40 campanhas',
        monthlyPrice: 3499, // €34.99
        annualPrice: 31491, // €314.91
      },
      {
        name: 'Expert',
        description: 'Tudo incluído - 5 lojas, 100+ campanhas',
        monthlyPrice: 5999, // €59.99
        annualPrice: 53991, // €539.91
      },
    ];

    const results = [];

    for (const productData of products) {
      console.log(`📦 Creating product: ${productData.name}`);

      // Create or get product
      const product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
        metadata: {
          plan_type: productData.name.toLowerCase(),
        },
      });

      console.log(`✅ Product created: ${product.id}`);

      // Create monthly price
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
        },
      });

      console.log(`💰 Monthly price created: ${monthlyPrice.id}`);

      // Create annual price
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
        },
      });

      console.log(`💰 Annual price created: ${annualPrice.id}`);

      results.push({
        product: productData.name,
        productId: product.id,
        monthlyPriceId: monthlyPrice.id,
        annualPriceId: annualPrice.id,
      });
    }

    console.log('✅ All products and prices created successfully!');
    console.log('\n📋 Price IDs to add to Settings.tsx:\n');
    
    const priceConfig = results.reduce((acc, result) => {
      acc[result.product.toLowerCase()] = {
        monthly: result.monthlyPriceId,
        annual: result.annualPriceId,
      };
      return acc;
    }, {} as Record<string, { monthly: string; annual: string }>);

    console.log('const STRIPE_PRICES = ' + JSON.stringify(priceConfig, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Products and prices created successfully',
        results,
        priceConfig,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error setting up products:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error && typeof error === 'object' && 'raw' in error ? (error as any).raw?.message : 'No additional details',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});