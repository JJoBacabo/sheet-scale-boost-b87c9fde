import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to make Facebook API calls with retry and exponential backoff
async function fetchWithRetry(
  url: string,
  options: { maxRetries?: number; retryDelay?: number } = {}
): Promise<Response> {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      const data = await response.json();

      // Check for rate limit error (80004)
      if (data.error && data.error.code === 80004) {
        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s, etc.
          const delay = retryDelay * Math.pow(2, attempt);
          console.log(`⚠️ Rate limit hit (80004). Waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          // Max retries reached
          return new Response(JSON.stringify({
            error: 'Facebook API rate limit exceeded',
            message: data.error.message || 'Too many calls to this ad-account. Please wait a few minutes and try again.',
            errorCode: data.error.code,
            retryAfter: 300, // Suggest waiting 5 minutes
          }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Other errors - return as is
      if (data.error) {
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Success - return the data wrapped in a Response-like object
      return {
        json: async () => data,
        status: response.status,
        ok: response.ok,
      } as any;

    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`⚠️ Request failed. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to fetch after retries');
}

// Helper to add delay between API calls
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    const { adAccountId, datePreset = 'last_30d', dateFrom, dateTo } = requestBody;

    // Get Facebook Ads integration
    const { data: integration } = await supabaseClient
      .from('integrations')
      .select('access_token, metadata')
      .eq('user_id', user.id)
      .eq('integration_type', 'facebook_ads')
      .single();

    if (!integration || !integration.access_token) {
      return new Response(JSON.stringify({ error: 'Facebook Ads not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decrypt the access token
    const accessToken = await decryptToken(integration.access_token);

    // Get ad account ID
    let targetAdAccountId = adAccountId;
    if (!targetAdAccountId) {
      // Try to get from integration metadata first
      if (integration.metadata?.ad_account_id) {
        targetAdAccountId = integration.metadata.ad_account_id;
      } else {
        // Fallback to fetching from API
        const meResponse = await fetchWithRetry(
          `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_id,account_status&access_token=${accessToken}`
        );
        
        // Check if it's a rate limit response
        if (meResponse.status === 429) {
          const rateLimitData = await meResponse.json();
          return new Response(JSON.stringify({ 
            error: rateLimitData.error || 'Facebook API rate limit exceeded',
            message: rateLimitData.message || 'Too many calls to this ad-account. Please wait a few minutes and try again.',
            errorCode: rateLimitData.errorCode,
            retryAfter: rateLimitData.retryAfter,
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const meData = await meResponse.json();
        if (meData.error) {
          return new Response(JSON.stringify({ 
            error: `Facebook API error: ${meData.error.message || meData.error.error_user_msg || 'Unknown error'}`,
            errorCode: meData.error.code,
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (!meData.data || meData.data.length === 0) {
          return new Response(JSON.stringify({ error: 'No ad account found. Please connect an ad account in your Facebook Ads account.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        targetAdAccountId = meData.data[0].id;
      }
    }

    // Build insights parameters
    let insightsParams = '';
    if (datePreset === 'lifetime') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const since = thirtyDaysAgo.toISOString().split('T')[0];
      const until = new Date().toISOString().split('T')[0];
      insightsParams = `.time_range({'since':'${since}','until':'${until}'}).time_increment(1)`;
    } else if (datePreset && datePreset !== 'custom') {
      insightsParams = `.date_preset(${datePreset}).time_increment(1)`;
    } else if (dateFrom && dateTo) {
      insightsParams = `.time_range({'since':'${dateFrom}','until':'${dateTo}'}).time_increment(1)`;
    } else {
      insightsParams = `.date_preset(last_30d).time_increment(1)`;
    }

    // Fetch campaigns with insights
    let allCampaigns: any[] = [];
    let nextUrl = `https://graph.facebook.com/v18.0/${targetAdAccountId}/campaigns?limit=500&fields=id,name,status,objective,daily_budget,lifetime_budget,spend_cap,created_time,updated_time,start_time,stop_time,insights${insightsParams}{date_start,date_stop,impressions,clicks,spend,actions,action_values,cpc,cpm,ctr,cpp,frequency,reach,social_spend,video_play_actions,cost_per_action_type,conversion_values,conversions}&access_token=${accessToken}`;
    let pageCount = 0;
    
    while (nextUrl) {
      pageCount++;
      console.log(`📥 Fetching campaigns page ${pageCount}...`);
      
      const campaignsResponse = await fetchWithRetry(nextUrl);
      
      // Check if it's a rate limit response
      if (campaignsResponse.status === 429) {
        const rateLimitData = await campaignsResponse.json();
        return new Response(JSON.stringify({ 
          error: rateLimitData.error || 'Facebook API rate limit exceeded',
          message: rateLimitData.message || 'Too many calls to this ad-account. Please wait a few minutes and try again.',
          errorCode: rateLimitData.errorCode,
          retryAfter: rateLimitData.retryAfter,
          campaignsProcessed: allCampaigns.length,
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const campaignsData = await campaignsResponse.json();

      if (campaignsData.error) {
        // Check for rate limit error code
        if (campaignsData.error.code === 80004) {
          return new Response(JSON.stringify({ 
            error: 'Facebook API rate limit exceeded',
            message: campaignsData.error.message || 'Too many calls to this ad-account. Please wait a few minutes and try again.',
            errorCode: campaignsData.error.code,
            retryAfter: 300,
            campaignsProcessed: allCampaigns.length,
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        return new Response(JSON.stringify({ 
          error: campaignsData.error.message || 'Facebook API error',
          errorCode: campaignsData.error.code,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (campaignsData.data) {
        allCampaigns = allCampaigns.concat(campaignsData.data);
      }

      nextUrl = campaignsData.paging?.next || null;
      
      // Add delay between pages to avoid rate limiting (200ms delay)
      if (nextUrl) {
        await delay(200);
      }
    }

    console.log(`📊 Fetched ${allCampaigns.length} campaigns from Facebook`);

    // Get Shopify integration to link products
    const { data: shopifyIntegration } = await supabaseClient
      .from('integrations')
      .select('id, metadata')
      .eq('user_id', user.id)
      .eq('integration_type', 'shopify')
      .maybeSingle();

    const shopifyIntegrationId = shopifyIntegration?.id;

    // Process and save each campaign
    let savedCampaigns = 0;
    let savedDailyData = 0;
    const errors: string[] = [];

    for (const fbCampaign of allCampaigns) {
      try {
        // Calculate totals from insights
        const insights = fbCampaign.insights?.data || [];
        const totalSpent = insights.reduce((sum: number, i: any) => sum + parseFloat(i.spend || 0), 0);
        const totalImpressions = insights.reduce((sum: number, i: any) => sum + parseInt(i.impressions || 0, 10), 0);
        const totalClicks = insights.reduce((sum: number, i: any) => sum + parseInt(i.clicks || 0, 10), 0);
        const totalConversions = insights.reduce((sum: number, i: any) => {
          const purchases = i.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
          return sum + parseInt(purchases, 10);
        }, 0);
        const avgCpc = totalClicks > 0 ? totalSpent / totalClicks : 0;

        // Get revenue and supplier cost from products
        let totalRevenue = 0;
        let supplierCost = 0;
        let matchedProduct: any = null;
        
        // Try to match campaign name with product name (with or without Shopify integration)
        const productQuery = supabaseClient
          .from('products')
          .select('total_revenue, cost_price, selling_price')
          .eq('user_id', user.id)
          .ilike('product_name', `%${fbCampaign.name}%`);
        
        // If Shopify integration exists, filter by it, otherwise get all products
        if (shopifyIntegrationId) {
          productQuery.eq('integration_id', shopifyIntegrationId);
        }
        
        const { data: products } = await productQuery.limit(1);
        
        if (products && products.length > 0) {
          matchedProduct = products[0];
          totalRevenue = parseFloat(matchedProduct.total_revenue || 0);
          // Calculate supplier cost from total revenue and cost price
          if (matchedProduct.cost_price && matchedProduct.selling_price) {
            const unitsSold = matchedProduct.total_revenue > 0 && matchedProduct.selling_price > 0
              ? matchedProduct.total_revenue / matchedProduct.selling_price
              : 0;
            supplierCost = unitsSold * parseFloat(matchedProduct.cost_price || 0);
          }
        }

        const roas = totalSpent > 0 ? totalRevenue / totalSpent : 0;

        // Check if campaign exists
        const { data: existingCampaign } = await supabaseAdmin
          .from('campaigns')
          .select('id')
          .eq('user_id', user.id)
          .eq('campaign_name', fbCampaign.name)
          .eq('platform', 'facebook')
          .maybeSingle();

        // Upsert campaign
        const campaignData = {
          user_id: user.id,
          campaign_name: fbCampaign.name,
          platform: 'facebook',
          status: fbCampaign.status?.toLowerCase() || 'active',
          total_spent: totalSpent,
          total_revenue: totalRevenue,
          roas: roas,
          cpc: avgCpc,
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
          updated_at: new Date().toISOString(),
        };

        let campaignError;
        if (existingCampaign) {
          const { error } = await supabaseAdmin
            .from('campaigns')
            .update(campaignData)
            .eq('id', existingCampaign.id);
          campaignError = error;
        } else {
          const { error } = await supabaseAdmin
            .from('campaigns')
            .insert(campaignData);
          campaignError = error;
        }

        if (campaignError) {
          console.error(`Error saving campaign ${fbCampaign.name}:`, campaignError);
          errors.push(`Campaign ${fbCampaign.name}: ${campaignError.message}`);
          continue;
        }

        savedCampaigns++;

        // Save daily insights to daily_roas
        for (const insight of insights) {
          const insightDate = insight.date_start || insight.date_stop;
          if (!insightDate) continue;

          const daySpent = parseFloat(insight.spend || 0);
          const dayClicks = parseInt(insight.clicks || 0, 10);
          const dayCpc = dayClicks > 0 ? daySpent / dayClicks : 0;
          const purchases = insight.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
          const addToCart = insight.actions?.find((a: any) => a.action_type === 'add_to_cart')?.value || 0;

          // Get product price and supplier cost (COG) from products
          let productPrice = 0;
          let cog = 0;
          
          // Use the matched product from campaign level if available, otherwise search again
          if (matchedProduct) {
            productPrice = parseFloat(matchedProduct.selling_price || 0);
            cog = parseFloat(matchedProduct.cost_price || 0);
          } else {
            // Try to match campaign name with product name (with or without Shopify integration)
            const productQuery = supabaseClient
              .from('products')
              .select('selling_price, cost_price')
              .eq('user_id', user.id)
              .ilike('product_name', `%${fbCampaign.name}%`);
            
            // If Shopify integration exists, filter by it, otherwise get all products
            if (shopifyIntegrationId) {
              productQuery.eq('integration_id', shopifyIntegrationId);
            }
            
            const { data: products } = await productQuery.limit(1);
            
            if (products && products.length > 0) {
              productPrice = parseFloat(products[0].selling_price || 0);
              cog = parseFloat(products[0].cost_price || 0);
            }
          }

          const unitsSold = parseInt(purchases, 10);
          const dayRevenue = unitsSold * productPrice;
          const dayCOG = unitsSold * cog;
          const marginEuros = dayRevenue - daySpent - dayCOG;
          const marginPercentage = dayRevenue > 0 ? (marginEuros / dayRevenue) * 100 : 0;
          const dayRoas = daySpent > 0 ? dayRevenue / daySpent : 0;

          // Upsert daily ROAS
          const { error: dailyError } = await supabaseAdmin
            .from('daily_roas')
            .upsert({
              user_id: user.id,
              campaign_id: fbCampaign.id,
              campaign_name: fbCampaign.name,
              date: insightDate,
              total_spent: daySpent,
              cpc: dayCpc,
              atc: parseInt(addToCart, 10),
              purchases: parseInt(purchases, 10),
              product_price: productPrice,
              cog: cog,
              units_sold: unitsSold,
              roas: dayRoas,
              margin_euros: marginEuros,
              margin_percentage: marginPercentage,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,campaign_id,date',
              ignoreDuplicates: false,
            });

          if (!dailyError) {
            savedDailyData++;
          }
        }
      } catch (err) {
        console.error(`Error processing campaign ${fbCampaign.name}:`, err);
        errors.push(`Campaign ${fbCampaign.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      campaignsProcessed: allCampaigns.length,
      campaignsSaved: savedCampaigns,
      dailyDataSaved: savedDailyData,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

