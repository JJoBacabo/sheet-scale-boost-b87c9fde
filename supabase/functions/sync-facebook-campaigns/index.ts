import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      const meResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_id,account_status&access_token=${accessToken}`
      );
      const meData = await meResponse.json();
      if (meData.error) {
        console.error('Facebook API error fetching ad accounts:', meData.error);
        // Check for rate limiting
        if (meData.error.code === 80004 || meData.error.error_subcode === 2446079) {
          return new Response(JSON.stringify({ 
            error: 'Facebook API rate limit reached. Please wait a few minutes and try again.',
            code: 'RATE_LIMIT_EXCEEDED'
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: meData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!meData.data || meData.data.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'No ad account found. Please check your Facebook Ads connection and permissions.',
          suggestion: 'Try reconnecting your Facebook Ads account in the Integrations page.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetAdAccountId = meData.data[0].id;
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
    
    while (nextUrl) {
      const campaignsResponse = await fetch(nextUrl);
      const campaignsData = await campaignsResponse.json();

      if (campaignsData.error) {
        console.error('Facebook API error fetching campaigns:', campaignsData.error);
        // Check for rate limiting
        if (campaignsData.error.code === 80004 || campaignsData.error.error_subcode === 2446079) {
          return new Response(JSON.stringify({ 
            error: 'Facebook API rate limit reached. Please wait a few minutes and try again.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: 300
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '300' },
          });
        }
        return new Response(JSON.stringify({ error: campaignsData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (campaignsData.data) {
        allCampaigns = allCampaigns.concat(campaignsData.data);
      }

      nextUrl = campaignsData.paging?.next || null;
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

        // Get revenue from products (if linked)
        let totalRevenue = 0;
        if (shopifyIntegrationId) {
          // Try to match campaign name with product name
          const { data: products } = await supabaseClient
            .from('products')
            .select('total_revenue')
            .eq('user_id', user.id)
            .eq('integration_id', shopifyIntegrationId)
            .ilike('product_name', `%${fbCampaign.name}%`)
            .limit(1);
          
          if (products && products.length > 0) {
            totalRevenue = parseFloat(products[0].total_revenue || 0);
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

          // Get product price and COG if available
          let productPrice = 0;
          let cog = 0;
          if (shopifyIntegrationId) {
            const { data: products } = await supabaseClient
              .from('products')
              .select('selling_price, cost_price')
              .eq('user_id', user.id)
              .eq('integration_id', shopifyIntegrationId)
              .ilike('product_name', `%${fbCampaign.name}%`)
              .limit(1);
            
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

