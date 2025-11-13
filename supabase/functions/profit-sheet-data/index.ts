import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DayData {
  date: string;
  revenue: number;
  cog: number;
  adSpend: number;
  shopifyRefunds: number;
  otherExpenses: number;
  manualRefunds: number;
}

// Fallback currency conversion rates (used if API fails)
const fallbackCurrencyRates: Record<string, number> = {
  'EUR': 1,
  'USD': 0.92,
  'GBP': 1.17,
  'CAD': 0.67,
  'AUD': 0.61,
  'BRL': 0.18,
  'CHF': 1.07,
  'SEK': 0.088,
  'NOK': 0.088,
  'DKK': 0.134,
  'PLN': 0.23,
  'CZK': 0.040,
  'HUF': 0.0025,
  'RON': 0.20,
  'BGN': 0.51,
  'HRK': 0.13,
  'RUB': 0.010,
  'TRY': 0.029,
  'INR': 0.011,
  'CNY': 0.13,
  'JPY': 0.0062,
  'KRW': 0.00069,
  'MXN': 0.053,
  'ARS': 0.0010,
  'CLP': 0.0010,
  'COP': 0.00024,
  'PEN': 0.25,
  'ZAR': 0.051,
  'EGP': 0.019,
  'NGN': 0.0013,
  'KES': 0.0071,
  'MAD': 0.092,
  'SGD': 0.69,
  'HKD': 0.12,
  'MYR': 0.21,
  'THB': 0.027,
  'IDR': 0.000058,
  'PHP': 0.016,
  'VND': 0.000037,
  'NZD': 0.55,
};

// Fetch live currency rates from API
async function fetchCurrencyRates(): Promise<Record<string, number>> {
  try {
    console.log('💱 Fetching live currency rates...');
    const response = await fetch('https://open.er-api.com/v6/latest/EUR');
    
    if (!response.ok) {
      throw new Error(`Currency API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.result === 'success' && data.rates) {
      // Convert rates to EUR base (API returns rates FROM EUR)
      // We need rates TO EUR, so we invert them
      const rates: Record<string, number> = { 'EUR': 1 };
      
      for (const [currency, rate] of Object.entries(data.rates)) {
        rates[currency] = 1 / (rate as number);
      }
      
      console.log(`✅ Fetched ${Object.keys(rates).length} currency rates`);
      return rates;
    }
    
    throw new Error('Invalid currency API response');
  } catch (error) {
    console.error('⚠️ Failed to fetch live rates, using fallback:', error);
    return fallbackCurrencyRates;
  }
}

function convertToEUR(amount: number, currency: string, rates: Record<string, number>): number {
  const rate = rates[currency.toUpperCase()] || 1;
  return amount * rate;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    console.log('📊 Fetching profit data:', { shopifyIntegrationId, adAccountId, dateFrom, dateTo });

    // Fetch live currency rates
    const currencyRates = await fetchCurrencyRates();

    // Get Shopify integration
    const { data: shopifyIntegration, error: shopifyError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('id', shopifyIntegrationId)
      .eq('user_id', user.id)
      .eq('integration_type', 'shopify')
      .single();

    if (shopifyError || !shopifyIntegration) {
      throw new Error('Shopify integration not found');
    }

    // Get store currency from integration metadata
    const storeCurrency = shopifyIntegration.metadata?.store_currency || 'EUR';
    console.log('💱 Store currency:', storeCurrency);

    // Get Facebook integration
    const { data: facebookIntegration, error: facebookError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_type', 'facebook_ads')
      .single();

    if (facebookError || !facebookIntegration) {
      throw new Error('Facebook Ads integration not found');
    }

    // Decrypt tokens
    const shopifyToken = await decryptToken(shopifyIntegration.access_token);
    const facebookToken = await decryptToken(facebookIntegration.access_token);

    // Get Shopify domain
    const shopifyDomain = shopifyIntegration.metadata?.myshopify_domain || 
                         shopifyIntegration.metadata?.connected_domain;

    if (!shopifyDomain) {
      throw new Error('Shopify domain not found');
    }

    console.log('🏪 Fetching data from Shopify:', shopifyDomain);

    // Fetch Shopify orders with financial details
    const ordersUrl = `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&created_at_min=${dateFrom}T00:00:00Z&created_at_max=${dateTo}T23:59:59Z&limit=250`;
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

    console.log(`📦 Found ${orders.length} orders from Shopify`);

    // Get products for COG
    const { data: products } = await supabaseClient
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_id', shopifyIntegrationId);

    // Create a map of product SKU/ID to cost
    const productCostMap = new Map();
    products?.forEach(product => {
      if (product.shopify_product_id) {
        productCostMap.set(product.shopify_product_id, product.cost_price || 0);
      }
      if (product.sku) {
        productCostMap.set(product.sku, product.cost_price || 0);
      }
    });

    // Fetch Facebook Ads data
    console.log('📱 Fetching Facebook Ads data');
    const fbStartDate = dateFrom.replace(/-/g, '');
    const fbEndDate = dateTo.replace(/-/g, '');
    
    const insightsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
      `fields=spend,date_start&` +
      `time_range={"since":"${dateFrom}","until":"${dateTo}"}&` +
      `time_increment=1&` +
      `access_token=${facebookToken}`;

    const fbResponse = await fetch(insightsUrl);
    const fbData = await fbResponse.json();

    if (fbData.error) {
      console.error('Facebook API error:', fbData.error);
      throw new Error(`Facebook API error: ${fbData.error.message}`);
    }

    const fbSpendByDay = new Map();
    fbData.data?.forEach((insight: any) => {
      fbSpendByDay.set(insight.date_start, parseFloat(insight.spend || 0));
    });

    console.log(`💰 Found ${fbSpendByDay.size} days with ad spend`);

    // Get manual entries from database
    const { data: manualEntries } = await supabaseClient
      .from('profit_sheet_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('shopify_integration_id', shopifyIntegrationId)
      .eq('ad_account_id', adAccountId)
      .gte('date', dateFrom)
      .lte('date', dateTo);

    const manualEntriesMap = new Map();
    manualEntries?.forEach(entry => {
      manualEntriesMap.set(entry.date, {
        otherExpenses: parseFloat(entry.other_expenses || 0),
        manualRefunds: parseFloat(entry.manual_refunds || 0),
      });
    });

    // Aggregate data by day
    const dayDataMap = new Map<string, DayData>();
    
    // Track currencies found
    const currenciesFound = new Set<string>();

    // Process orders
    orders.forEach((order: any) => {
      const orderDate = order.created_at.split('T')[0];
      const orderCurrency = order.currency || order.presentment_currency || 'EUR';
      currenciesFound.add(orderCurrency);
      
      if (!dayDataMap.has(orderDate)) {
        dayDataMap.set(orderDate, {
          date: orderDate,
          revenue: 0,
          cog: 0,
          adSpend: 0,
          shopifyRefunds: 0,
          otherExpenses: 0,
          manualRefunds: 0,
        });
      }

      const dayData = dayDataMap.get(orderDate)!;

      // Add revenue (convert to EUR)
      const orderRevenue = parseFloat(order.total_price || 0);
      dayData.revenue += convertToEUR(orderRevenue, orderCurrency, currencyRates);

      // Calculate COG
      order.line_items?.forEach((item: any) => {
        const productId = item.product_id?.toString();
        const sku = item.sku;
        const quantity = item.quantity || 1;

        let cost = 0;
        if (productId && productCostMap.has(productId)) {
          cost = productCostMap.get(productId);
        } else if (sku && productCostMap.has(sku)) {
          cost = productCostMap.get(sku);
        }

        dayData.cog += cost * quantity;
      });

      // Add refunds (convert to EUR)
      if (order.refunds && order.refunds.length > 0) {
        order.refunds.forEach((refund: any) => {
          refund.refund_line_items?.forEach((refundItem: any) => {
            const refundAmount = parseFloat(refundItem.subtotal || 0);
            dayData.shopifyRefunds += convertToEUR(refundAmount, orderCurrency, currencyRates);
          });
        });
      }
    });
    
    console.log('💱 Currencies detected:', Array.from(currenciesFound).join(', '));

    // Add Facebook ad spend (FB returns the spend in the account's currency)
    // Get ad account currency from metadata
    const fbCurrency = facebookIntegration.metadata?.currency || 'EUR';
    console.log('💱 Facebook Ads currency:', fbCurrency);
    
    fbSpendByDay.forEach((spend, date) => {
      if (!dayDataMap.has(date)) {
        dayDataMap.set(date, {
          date,
          revenue: 0,
          cog: 0,
          adSpend: 0,
          shopifyRefunds: 0,
          otherExpenses: 0,
          manualRefunds: 0,
        });
      }
      // Convert FB spend to EUR
      dayDataMap.get(date)!.adSpend = convertToEUR(spend, fbCurrency, currencyRates);
    });

    // Add manual entries
    manualEntriesMap.forEach((entry, date) => {
      if (!dayDataMap.has(date)) {
        dayDataMap.set(date, {
          date,
          revenue: 0,
          cog: 0,
          adSpend: 0,
          shopifyRefunds: 0,
          otherExpenses: 0,
          manualRefunds: 0,
        });
      }
      const dayData = dayDataMap.get(date)!;
      dayData.otherExpenses = entry.otherExpenses;
      dayData.manualRefunds = entry.manualRefunds;
    });

    // Convert to array and sort by date
    const profitData = Array.from(dayDataMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`✅ Returning ${profitData.length} days of data`);

    return new Response(
      JSON.stringify({ data: profitData, storeCurrency }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});