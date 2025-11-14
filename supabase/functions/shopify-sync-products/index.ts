import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { decryptToken } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyVariant {
  id: number;
  sku: string | null;
  price: string;
  compare_at_price: string | null;
  title: string;
  cost?: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  image?: { src: string };
  variants: Array<ShopifyVariant>;
}

interface ShopifyLineItem {
  product_id: number;
  variant_id: number;
  title: string;
  variant_title: string | null;
  quantity: number;
  price: string;
  sku: string | null;
  cost?: string;
}

interface ShopifyOrder {
  id: number;
  line_items: ShopifyLineItem[];
  total_price: string;
  created_at: string;
  financial_status: string;
}

interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

interface ProductSale {
  product_id: number;
  product_name: string;
  variants: string[];
  total_quantity: number;
  total_revenue: number;
  image_url: string | null;
  sku: string | null;
  avg_price: number;
  last_sold_at: string | null;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function syncProductsInBackground(
  userId: string,
  integrationId: string,
  accessToken: string,
  shopifyDomain: string,
  supabaseUrl: string,
  supabaseKey: string
) {
  console.log('🔄 Background sync started - fetching orders for:', userId, 'integration:', integrationId);
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const stats = { total: 0, created: 0, updated: 0, skipped: 0, errors: [] as string[] };
  
  // Fetch store currency from integration metadata
  const { data: integrationData } = await supabase
    .from('integrations')
    .select('metadata')
    .eq('id', integrationId)
    .single();
  
  let storeCurrency = (integrationData?.metadata as any)?.store_currency || 'EUR';
  console.log('💱 Store currency from integration metadata:', storeCurrency);
  
  // Fetch real store currency from Shopify API and update if different
  try {
    const shopResponse = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (shopResponse.ok) {
      const { shop } = await shopResponse.json();
      const realStoreCurrency = shop.currency;
      console.log('💱 Real store currency from Shopify:', realStoreCurrency);
      
      // Update integration metadata if currency changed or was missing
      if (realStoreCurrency && realStoreCurrency !== storeCurrency) {
        console.log(`🔄 Updating store currency from ${storeCurrency} to ${realStoreCurrency}`);
        
        const updatedMetadata = {
          ...(integrationData?.metadata || {}),
          store_currency: realStoreCurrency,
        };
        
        const { error: updateError } = await supabase
          .from('integrations')
          .update({ metadata: updatedMetadata })
          .eq('id', integrationId);
        
        if (updateError) {
          console.error('❌ Failed to update store currency:', updateError);
        } else {
          storeCurrency = realStoreCurrency;
          console.log('✅ Store currency updated successfully');
        }
      }
    }
  } catch (error) {
    console.error('⚠️ Could not fetch store currency from Shopify, using fallback:', error);
  }
  
  // Step 1: Fetch all orders (with sales data)
  const allOrders: ShopifyOrder[] = [];
  let pageInfo: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    try {
      const url: string = pageInfo
        ? `https://${shopifyDomain}/admin/api/2024-10/orders.json?status=any&limit=250&page_info=${pageInfo}`
        : `https://${shopifyDomain}/admin/api/2024-10/orders.json?status=any&limit=250`;

      const response: Response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ Shopify Orders API error:', response.status);
        break;
      }

      const data: ShopifyOrdersResponse = await response.json();
      allOrders.push(...data.orders);

      const linkHeader: string | null = response.headers.get('Link');
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match: RegExpMatchArray | null = linkHeader.match(/page_info=([^&>]+)/);
        pageInfo = match ? match[1] : null;
        hasNextPage = !!pageInfo;
        await sleep(500);
      } else {
        hasNextPage = false;
      }
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      break;
    }
  }

  console.log(`📦 Fetched ${allOrders.length} orders from Shopify`);

  // Step 2: Aggregate sales by product
  const productSalesMap = new Map<number, ProductSale>();

  for (const order of allOrders) {
    // Only process paid orders
    if (order.financial_status !== 'paid' && order.financial_status !== 'partially_paid') continue;

    for (const item of order.line_items) {
      const productId = item.product_id;
      
      if (!productSalesMap.has(productId)) {
        productSalesMap.set(productId, {
          product_id: productId,
          product_name: item.title,
          variants: [],
          total_quantity: 0,
          total_revenue: 0,
          image_url: null,
          sku: item.sku,
          avg_price: 0,
          last_sold_at: null,
        });
      }

      const sale = productSalesMap.get(productId)!;
      sale.total_quantity += item.quantity;
      sale.total_revenue += parseFloat(item.price) * item.quantity;
      
      // Update last_sold_at with the most recent order date
      if (!sale.last_sold_at || new Date(order.created_at) > new Date(sale.last_sold_at)) {
        sale.last_sold_at = order.created_at;
      }
      
      // Add variant if not already present
      if (item.variant_title && !sale.variants.includes(item.variant_title)) {
        sale.variants.push(item.variant_title);
      }
    }
  }

  console.log(`📊 Aggregated sales for ${productSalesMap.size} products`);

  // Step 3: Fetch product details (for images and additional data)
  const productIds = Array.from(productSalesMap.keys());
  
  console.log(`🖼️ Fetching images for ${productIds.length} products...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const productId of productIds) {
    try {
      const url = `https://${shopifyDomain}/admin/api/2024-10/products/${productId}.json`;
      
      const response: Response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const product = data.product;
        const sale = productSalesMap.get(productId);
        
        if (sale && product) {
          // Get the first image from the images array or the main image
          if (product.images && product.images.length > 0) {
            sale.image_url = product.images[0].src;
            successCount++;
            console.log(`✅ Image found for ${sale.product_name}: ${sale.image_url}`);
          } else if (product.image && product.image.src) {
            sale.image_url = product.image.src;
            successCount++;
            console.log(`✅ Image (from image field) found for ${sale.product_name}: ${sale.image_url}`);
          } else {
            failCount++;
            console.log(`⚠️ No image found for ${sale.product_name} (Product ID: ${productId})`);
          }
        }
      } else {
        failCount++;
        console.error(`❌ Failed to fetch product ${productId}: ${response.status} ${response.statusText}`);
      }
      
      // Rate limiting - Shopify allows 2 requests per second
      await sleep(550);
    } catch (error) {
      failCount++;
      console.error(`❌ Error fetching product ${productId}:`, error);
    }
  }
  
  console.log(`📊 Image fetch results: ${successCount} success, ${failCount} failed out of ${productIds.length} products`);

  // Step 4: Save to database (only products with sales)
  stats.total = productSalesMap.size;

  for (const [productId, sale] of productSalesMap.entries()) {
    try {
      const avgPrice = sale.total_quantity > 0 ? sale.total_revenue / sale.total_quantity : 0;
      
      // Try to get actual cost from Shopify product data
      let costPrice: number | null = null;
      let profitMargin: number | null = null;

      // Fetch product details to get cost
      try {
        const productResponse = await fetch(
          `https://${shopifyDomain}/admin/api/2024-10/products/${productId}.json`,
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          }
        );

        if (productResponse.ok) {
          const productData = await productResponse.json();
          const variant = productData.product?.variants?.[0];
          
          // Use inventory_item_id to get cost
          if (variant?.inventory_item_id) {
            const inventoryResponse = await fetch(
              `https://${shopifyDomain}/admin/api/2024-10/inventory_items/${variant.inventory_item_id}.json`,
              {
                headers: {
                  'X-Shopify-Access-Token': accessToken,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (inventoryResponse.ok) {
              const inventoryData = await inventoryResponse.json();
              const inventoryCost = inventoryData.inventory_item?.cost;
              
              if (inventoryCost) {
                costPrice = parseFloat(inventoryCost);
                profitMargin = avgPrice > 0 ? ((avgPrice - costPrice) / avgPrice) * 100 : null;
              }
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch cost for product ${productId}:`, error);
      }

      // If no cost found, leave as null (don't estimate)
      if (!costPrice) {
        costPrice = null;
        profitMargin = null;
      }

      const productData = {
        user_id: userId,
        integration_id: integrationId,
        shopify_product_id: String(productId),
        product_name: sale.product_name,
        sku: sale.sku || `SHOPIFY-${productId}`,
        selling_price: avgPrice,
        cost_price: costPrice,
        profit_margin: profitMargin,
        quantity_sold: sale.total_quantity,
        total_revenue: sale.total_revenue,
        image_url: sale.image_url,
        last_sold_at: sale.last_sold_at,
      };

      const { data: existingProduct } = await supabase
        .from('products')
        .select('id, cost_price')
        .eq('user_id', userId)
        .eq('integration_id', integrationId)
        .eq('shopify_product_id', String(productId))
        .maybeSingle();

      if (existingProduct) {
        // Preserve existing cost_price if it was manually set by user
        // Only update cost_price if it's null or 0 (not manually set)
        const updateData = { ...productData };
        if (existingProduct.cost_price !== null && existingProduct.cost_price !== 0) {
          // User has manually set cost_price, preserve it
          updateData.cost_price = existingProduct.cost_price;
          // Recalculate profit_margin with preserved cost_price
          if (updateData.selling_price && updateData.cost_price) {
            updateData.profit_margin = ((updateData.selling_price - updateData.cost_price) / updateData.selling_price) * 100;
          }
        }
        
        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', existingProduct.id);

        if (!updateError) stats.updated++;
        else stats.errors.push(`${sale.product_name}: ${updateError.message}`);
      } else {
        const { error: insertError } = await supabase
          .from('products')
          .insert(productData);

        if (!insertError) stats.created++;
        else stats.errors.push(`${sale.product_name}: ${insertError.message}`);
      }
    } catch (error) {
      console.error(`❌ Error saving product ${sale.product_name}:`, error);
      stats.errors.push(`${sale.product_name}: ${error instanceof Error ? error.message : 'Erro'}`);
    }
  }

  console.log('✅ Background sync completed:', stats);
  return stats;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Invalid user:', userError);
      return new Response(
        JSON.stringify({ error: 'Utilizador inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Starting Shopify product sync for user:', user.id);

    // Get integration_id from request body (if provided)
    const body = await req.json().catch(() => ({}));
    const requestedIntegrationId = body.integration_id;

    console.log('📦 Requested integration_id:', requestedIntegrationId);

    // Fetch Shopify integration(s)
    let integration;
    
    if (requestedIntegrationId) {
      // Fetch specific integration
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('integration_type', 'shopify')
        .eq('id', requestedIntegrationId)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Error fetching integration:', error);
      }
      
      integration = data;
    } else {
      // Fetch first available integration
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('integration_type', 'shopify')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('❌ Error fetching integrations:', error);
      }
      
      // Get first integration from array
      integration = data && data.length > 0 ? data[0] : null;
    }

    if (!integration) {
      console.error('❌ No Shopify integration found for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Integração Shopify não encontrada. Conecte sua loja primeiro.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Found integration:', integration.id);

    // Decrypt access token
    const accessToken = await decryptToken(integration.access_token);
    const shopifyDomain = integration.metadata.myshopify_domain || `${integration.metadata.store_name}.myshopify.com`;

    console.log('🏪 Starting background sync from:', shopifyDomain);

    // Start background sync without blocking response
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // Run sync in background
    syncProductsInBackground(user.id, integration.id, accessToken, shopifyDomain, supabaseUrl, supabaseKey).catch(error => {
      console.error('❌ Background sync error:', error);
    });

    // Return immediate response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sincronização iniciada em background',
        stats: { message: 'Os produtos serão sincronizados nos próximos minutos' }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
