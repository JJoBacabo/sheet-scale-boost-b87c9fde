import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain, x-shopify-topic',
};

interface ShopifyLineItem {
  product_id: number;
  variant_id: number;
  title: string;
  variant_title: string | null;
  quantity: number;
  price: string;
  sku: string | null;
}

interface ShopifyOrderWebhook {
  id: number;
  line_items: ShopifyLineItem[];
  total_price: string;
  created_at: string;
  financial_status: string;
  customer?: {
    email?: string;
  };
}

// Verify Shopify webhook signature
function verifyWebhook(body: string, hmacHeader: string, secret: string): boolean {
  const hash = createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
  return hash === hmacHeader;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get webhook data
    const shopDomain = req.headers.get('x-shopify-shop-domain');
    const topic = req.headers.get('x-shopify-topic');
    const hmac = req.headers.get('x-shopify-hmac-sha256');

    console.log('📨 Webhook received:', { shopDomain, topic });

    if (!shopDomain || !topic || !hmac) {
      console.error('❌ Missing webhook headers');
      return new Response('Missing headers', { status: 400, headers: corsHeaders });
    }

    // Read body as text for signature verification
    const bodyText = await req.text();
    
    // TODO: In production, verify webhook signature with app secret
    // For now, we'll skip verification in development
    // const isValid = verifyWebhook(bodyText, hmac, Deno.env.get('SHOPIFY_WEBHOOK_SECRET') || '');
    // if (!isValid) {
    //   console.error('❌ Invalid webhook signature');
    //   return new Response('Invalid signature', { status: 401, headers: corsHeaders });
    // }

    const webhookData: ShopifyOrderWebhook = JSON.parse(bodyText);

    // Only process orders/create and orders/paid topics
    if (topic !== 'orders/create' && topic !== 'orders/paid') {
      console.log('ℹ️ Ignoring topic:', topic);
      return new Response('OK', { headers: corsHeaders });
    }

    // Only process paid orders
    if (webhookData.financial_status !== 'paid' && webhookData.financial_status !== 'partially_paid') {
      console.log('ℹ️ Order not paid, ignoring');
      return new Response('OK', { headers: corsHeaders });
    }

    console.log(`💰 Processing paid order #${webhookData.id} with ${webhookData.line_items.length} items`);

    // Find user by shop domain
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: integration } = await supabase
      .from('integrations')
      .select('user_id, metadata')
      .eq('integration_type', 'shopify')
      .or(`metadata->>myshopify_domain.eq.${shopDomain},metadata->>shop_domain.eq.${shopDomain}`)
      .single();

    if (!integration) {
      console.error('❌ No integration found for shop:', shopDomain);
      return new Response('Shop not found', { status: 404, headers: corsHeaders });
    }

    console.log('✅ Found user:', integration.user_id);

    // Process each line item
    for (const item of webhookData.line_items) {
      try {
        const productId = String(item.product_id);
        const price = parseFloat(item.price);
        const quantity = item.quantity;
        const revenue = price * quantity;

        // Check if product exists
        const { data: existingProduct } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', integration.user_id)
          .eq('shopify_product_id', productId)
          .maybeSingle();

        if (existingProduct) {
          // Update existing product - increment sales
          // IMPORTANT: Preserve cost_price and profit_margin if they were manually set
          const newQuantitySold = (existingProduct.quantity_sold || 0) + quantity;
          const newTotalRevenue = (existingProduct.total_revenue || 0) + revenue;
          
          // Preserve cost_price if it was manually set (not null and not 0)
          const preservedCostPrice = (existingProduct.cost_price !== null && existingProduct.cost_price !== 0) 
            ? existingProduct.cost_price 
            : null;
          
          // Recalculate profit_margin if cost_price is preserved
          let preservedProfitMargin = existingProduct.profit_margin;
          if (preservedCostPrice && price > 0) {
            preservedProfitMargin = ((price - preservedCostPrice) / price) * 100;
          }

          await supabase
            .from('products')
            .update({
              quantity_sold: newQuantitySold,
              total_revenue: newTotalRevenue,
              selling_price: price, // Update with latest price
              cost_price: preservedCostPrice, // Preserve manually set cost
              profit_margin: preservedProfitMargin, // Preserve or recalculate margin
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingProduct.id);

          console.log(`📊 Updated product ${item.title}: +${quantity} sales, +€${revenue.toFixed(2)}, cost_price preserved: ${preservedCostPrice !== null}`);
        } else {
        // Create new product entry
        const profitMargin = 30; // Default margin
        await supabase
          .from('products')
          .insert({
            user_id: integration.user_id,
            shopify_product_id: productId,
            product_name: item.title,
            sku: item.sku || `SHOPIFY-${productId}`,
            selling_price: price,
            cost_price: null, // Will be fetched on next full sync
            profit_margin: null,
            quantity_sold: quantity,
            total_revenue: revenue,
            image_url: null, // Will be fetched on next sync
          });

          console.log(`✨ Created new product ${item.title}: ${quantity} sales, €${revenue.toFixed(2)}`);
        }
      } catch (error) {
        console.error(`❌ Error processing item ${item.title}:`, error);
      }
    }

    console.log('✅ Webhook processed successfully');
    return new Response('OK', { headers: corsHeaders });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
