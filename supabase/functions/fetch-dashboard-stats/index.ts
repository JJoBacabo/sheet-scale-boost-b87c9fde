import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DashboardStats {
  totalRevenue: number;
  totalAdSpend: number;
  totalSupplierCost: number;
  totalConversions: number;
  averageRoas: number;
  averageCpc: number;
  totalClicks: number;
  profit: number;
  profitMargin: number;
  dailyData: Array<{
    date: string;
    revenue: number;
    adSpend: number;
    cog: number;
    conversions: number;
    clicks: number;
  }>;
}

// Simplified exchange rates
const FALLBACK_RATES: Record<string, number> = {
  'EUR': 1, 'USD': 0.92, 'GBP': 1.17, 'CHF': 1.05, 'BGN': 0.51,
  'RON': 0.20, 'PLN': 0.23, 'CZK': 0.04, 'HUF': 0.0025,
  'SEK': 0.088, 'DKK': 0.134, 'NOK': 0.086,
};

async function getExchangeRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR');
    if (!res.ok) return FALLBACK_RATES;
    
    const data = await res.json();
    if (data.result !== 'success' || !data.rates) return FALLBACK_RATES;
    
    const rates: Record<string, number> = { 'EUR': 1 };
    for (const [currency, rate] of Object.entries(data.rates)) {
      rates[currency] = 1 / (rate as number);
    }
    return rates;
  } catch {
    return FALLBACK_RATES;
  }
}

function convertToEUR(amount: number, currency: string, rates: Record<string, number>): number {
  return amount * (rates[currency.toUpperCase()] || 1);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { shopifyIntegrationId, adAccountId, dateFrom, dateTo } = await req.json();

    console.log('📊 Fetching dashboard stats:', { shopifyIntegrationId, adAccountId, dateFrom, dateTo });

    // Fetch live exchange rates
    const exchangeRates = await getExchangeRates();

    // Initialize result
    const stats: DashboardStats = {
      totalRevenue: 0,
      totalAdSpend: 0,
      totalSupplierCost: 0,
      totalConversions: 0,
      averageRoas: 0,
      averageCpc: 0,
      totalClicks: 0,
      profit: 0,
      profitMargin: 0,
      dailyData: [],
    };

    const dailyMap = new Map<string, any>();

    // ===== FETCH SHOPIFY DATA (Revenue + COG) =====
    if (shopifyIntegrationId && shopifyIntegrationId !== 'all') {
      const { data: shopifyIntegration, error: shopifyError } = await supabaseClient
        .from('integrations')
        .select('*')
        .eq('id', shopifyIntegrationId)
        .eq('user_id', user.id)
        .single();

      if (shopifyError || !shopifyIntegration) {
        throw new Error('Shopify integration not found');
      }

      // Decrypt access token
      const shopifyToken = await decryptToken(shopifyIntegration.access_token);

      const shopifyDomain = shopifyIntegration.metadata?.myshopify_domain ||
                           shopifyIntegration.metadata?.shop_domain ||
                           shopifyIntegration.metadata?.connected_domain;

      if (!shopifyDomain) {
        throw new Error('Shopify domain not found');
      }

      console.log('🏪 Fetching orders from Shopify:', shopifyDomain);

      // Fetch shop info to get currency
      const shopUrl = `https://${shopifyDomain}/admin/api/2024-01/shop.json`;
      const shopResponse = await fetch(shopUrl, {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
      });

      if (!shopResponse.ok) {
        throw new Error(`Shopify API error: ${shopResponse.statusText}`);
      }

      const shopData = await shopResponse.json();
      const shopCurrency = shopData.shop?.currency || 'EUR';
      console.log('💱 Shop currency:', shopCurrency);

      // Fetch orders
      const ordersUrl = `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&created_at_min=${dateFrom}T00:00:00Z&created_at_max=${dateTo}T23:59:59Z&limit=250&financial_status=paid`;
      const ordersResponse = await fetch(ordersUrl, {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
      });

      if (!ordersResponse.ok) {
        throw new Error(`Shopify API error: ${ordersResponse.statusText}`);
      }

      const ordersData = await ordersResponse.json();
      const orders = ordersData.orders || [];

      console.log(`📦 Found ${orders.length} paid orders from Shopify`);

      // Get products for COG
      const { data: products } = await supabaseClient
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .eq('integration_id', shopifyIntegrationId);

      const productCostMap = new Map();
      products?.forEach((product: any) => {
        if (product.shopify_product_id) {
          productCostMap.set(product.shopify_product_id, product.cost_price || 0);
        }
        if (product.sku) {
          productCostMap.set(product.sku, product.cost_price || 0);
        }
      });

      // Process orders by day
      for (const order of orders) {
        const orderDate = order.created_at.split('T')[0];
        
        if (!dailyMap.has(orderDate)) {
          dailyMap.set(orderDate, {
            date: orderDate,
            revenue: 0,
            adSpend: 0,
            cog: 0,
            conversions: 0,
            clicks: 0,
          });
        }

        const dayData = dailyMap.get(orderDate);
        
        // Add revenue - convert to EUR if needed
        const revenueInShopCurrency = parseFloat(order.total_price || 0);
        const revenue = convertToEUR(revenueInShopCurrency, shopCurrency, exchangeRates);
        console.log(`💰 Order revenue: ${revenueInShopCurrency} ${shopCurrency} = ${revenue.toFixed(2)} EUR`);
        dayData.revenue += revenue;
        dayData.conversions += 1;

        // Calculate COG for this order
        let orderCog = 0;
        for (const item of order.line_items || []) {
          const quantity = item.quantity || 0;
          const productId = item.product_id?.toString();
          const sku = item.sku;
          
          let costPrice = 0;
          if (productId && productCostMap.has(productId)) {
            costPrice = productCostMap.get(productId);
          } else if (sku && productCostMap.has(sku)) {
            costPrice = productCostMap.get(sku);
          }
          
          orderCog += costPrice * quantity;
        }
        
        dayData.cog += orderCog;
      }

      console.log(`💰 Processed ${dailyMap.size} days of Shopify data`);
    }

    // ===== FETCH FACEBOOK ADS DATA (Ad Spend) =====
    if (adAccountId && adAccountId !== 'all') {
      const { data: fbIntegration, error: fbError } = await supabaseClient
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('integration_type', 'facebook_ads')
        .single();

      if (fbError || !fbIntegration) {
        throw new Error('Facebook integration not found');
      }

      // Decrypt access token
      const facebookToken = await decryptToken(fbIntegration.access_token);

      console.log('📱 Fetching Facebook Ads data');

      // Fetch insights with spend, clicks, and purchases
      const insightsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
        `fields=spend,clicks,actions,date_start&` +
        `time_range={"since":"${dateFrom}","until":"${dateTo}"}&` +
        `time_increment=1&` +
        `access_token=${facebookToken}`;

      const fbResponse = await fetch(insightsUrl);
      const fbData = await fbResponse.json();

      if (fbData.error) {
        console.error('Facebook API error:', fbData.error);
        throw new Error(`Facebook API error: ${fbData.error.message}`);
      }

      console.log(`📊 Facebook API returned ${fbData.data?.length || 0} days of data`);

      // Process Facebook data by day
      for (const insight of fbData.data || []) {
        const date = insight.date_start;
        const spend = parseFloat(insight.spend || 0);
        const clicks = parseInt(insight.clicks || 0);

        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            date,
            revenue: 0,
            adSpend: 0,
            cog: 0,
            conversions: 0,
            clicks: 0,
          });
        }

        const dayData = dailyMap.get(date);
        dayData.adSpend += spend;
        dayData.clicks += clicks;
      }

      console.log(`💰 Processed ${fbData.data?.length || 0} days of Facebook Ads data`);
    }

    // ===== CALCULATE TOTALS =====
    stats.dailyData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    for (const day of stats.dailyData) {
      stats.totalRevenue += day.revenue;
      stats.totalAdSpend += day.adSpend;
      stats.totalSupplierCost += day.cog;
      stats.totalConversions += day.conversions;
      stats.totalClicks += day.clicks;
    }

    // Calculate metrics
    stats.averageRoas = stats.totalAdSpend > 0 ? stats.totalRevenue / stats.totalAdSpend : 0;
    stats.averageCpc = stats.totalClicks > 0 ? stats.totalAdSpend / stats.totalClicks : 0;
    stats.profit = stats.totalRevenue - stats.totalSupplierCost - stats.totalAdSpend;
    stats.profitMargin = stats.totalRevenue > 0 ? (stats.profit / stats.totalRevenue) * 100 : 0;

    console.log('✅ Dashboard stats calculated:', {
      totalRevenue: stats.totalRevenue,
      totalAdSpend: stats.totalAdSpend,
      totalSupplierCost: stats.totalSupplierCost,
      totalConversions: stats.totalConversions,
      totalClicks: stats.totalClicks,
      averageRoas: stats.averageRoas,
      averageCpc: stats.averageCpc,
      profit: stats.profit,
      profitMargin: stats.profitMargin,
    });

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error fetching dashboard stats:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
