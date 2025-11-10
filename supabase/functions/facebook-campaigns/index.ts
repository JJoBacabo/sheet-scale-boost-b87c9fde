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

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    
    // Validate input
    const allowedActions = ['list', 'update', 'pause', 'activate', 'delete', 'listAdAccounts', 'getAdSets', 'getCreatives'];
    const { action, campaignId, updates, adAccountId: requestedAdAccountId } = requestBody;
    
    if (!action || !allowedActions.includes(action)) {
      console.error('Invalid action:', action);
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be one of: ' + allowedActions.join(', ') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Actions that don't require campaignId
    const noIdActions = ['list', 'listAdAccounts'];
    const requiresId = !noIdActions.includes(action);
    
    if (requiresId && (!campaignId || !/^\d+$/.test(campaignId))) {
      console.error('Invalid or missing campaignId for action:', action, campaignId);
      return new Response(
        JSON.stringify({ error: 'Campaign ID is required for this action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Facebook Ads integration
    const { data: integration } = await supabaseClient
      .from('integrations')
      .select('access_token')
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

    // Fetch user's ad account
    const meResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_id,account_status&access_token=${accessToken}`
    );
    const meData = await meResponse.json();

    if (meData.error) {
      console.error('Facebook API Error:', meData.error);
      return new Response(JSON.stringify({ error: meData.error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adAccountId = meData.data[0]?.id;
    if (!adAccountId) {
      return new Response(JSON.stringify({ error: 'No ad account found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle different actions
    if (action === 'listAdAccounts') {
      // Return all ad accounts
      return new Response(JSON.stringify({ adAccounts: meData.data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list') {
      // Use requested ad account or default to first one
      const targetAdAccountId = requestedAdAccountId || adAccountId;
      const { datePreset, dateFrom, dateTo } = requestBody;
      
      // Build insights parameters based on date selection
      let insightsParams = '';
      if (datePreset === 'lifetime') {
        // For lifetime, get daily breakdown for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const since = thirtyDaysAgo.toISOString().split('T')[0];
        const until = new Date().toISOString().split('T')[0];
        insightsParams = `.time_range({'since':'${since}','until':'${until}'}).time_increment(1)`;
      } else if (datePreset && datePreset !== 'custom') {
        // Facebook API expects date presets like: today, yesterday, last_7d, last_30d, etc.
        insightsParams = `.date_preset(${datePreset}).time_increment(1)`;
      } else if (dateFrom && dateTo) {
        insightsParams = `.time_range({'since':'${dateFrom}','until':'${dateTo}'}).time_increment(1)`;
      } else {
        insightsParams = `.date_preset(last_30d).time_increment(1)`;
      }
      
      // Fetch campaigns with detailed insights including all metrics
      // time_increment(1) gives us daily breakdown
      // Using limit=500 to get more campaigns per request and handle pagination
      let allCampaigns: any[] = [];
      let nextUrl = `https://graph.facebook.com/v18.0/${targetAdAccountId}/campaigns?limit=500&fields=id,name,status,objective,daily_budget,lifetime_budget,spend_cap,created_time,updated_time,start_time,stop_time,insights${insightsParams}{date_start,date_stop,impressions,clicks,spend,actions,action_values,cpc,cpm,ctr,cpp,frequency,reach,social_spend,video_play_actions,cost_per_action_type,conversion_values,conversions}&access_token=${accessToken}`;
      
      // Fetch all pages of campaigns
      while (nextUrl) {
        const campaignsResponse = await fetch(nextUrl);
        const campaignsData = await campaignsResponse.json();

        if (campaignsData.error) {
          console.error('Facebook API Error:', campaignsData.error);
          return new Response(JSON.stringify({ error: campaignsData.error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Add campaigns from this page to the total
        if (campaignsData.data) {
          allCampaigns = allCampaigns.concat(campaignsData.data);
        }

        // Check if there's a next page
        nextUrl = campaignsData.paging?.next || null;
        
        console.log(`Fetched ${campaignsData.data?.length || 0} campaigns. Total so far: ${allCampaigns.length}`);
      }

      console.log(`Successfully fetched ${allCampaigns.length} total campaigns`);

      // Fetch images for campaigns in batches to avoid rate limiting
      // Process in batches of 10 to avoid timeout and rate limits
      const BATCH_SIZE = 10;
      const imageMap = new Map();
      
      for (let i = 0; i < allCampaigns.length; i += BATCH_SIZE) {
        const batch = allCampaigns.slice(i, i + BATCH_SIZE);
        console.log(`Fetching images for batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} campaigns)`);
        
        const imagePromises = batch.map(async (campaign) => {
          try {
            // Method 1: Try to get image from ads
            const adsResponse = await fetch(
              `https://graph.facebook.com/v18.0/${campaign.id}/ads?limit=3&fields=creative{id,image_url,thumbnail_url,object_story_spec}&access_token=${accessToken}`
            );
            const adsData = await adsResponse.json();
            
            if (adsData.error) {
              console.warn(`API error for campaign ${campaign.id}:`, adsData.error.message);
            }
            
            if (adsData.data && adsData.data.length > 0) {
              // Try each ad until we find one with an image
              for (const ad of adsData.data) {
                if (ad.creative) {
                  const creative = ad.creative;
                  
                  // Check for image_url or thumbnail_url
                  if (creative.image_url || creative.thumbnail_url) {
                    return {
                      campaignId: campaign.id,
                      image_url: creative.image_url || creative.thumbnail_url || null,
                      thumbnail_url: creative.thumbnail_url || creative.image_url || null,
                    };
                  }
                  
                  // Check object_story_spec for image (for page posts)
                  if (creative.object_story_spec?.link_data?.image_url) {
                    return {
                      campaignId: campaign.id,
                      image_url: creative.object_story_spec.link_data.image_url,
                      thumbnail_url: creative.object_story_spec.link_data.image_url,
                    };
                  }
                  
                  if (creative.object_story_spec?.video_data?.image_url) {
                    return {
                      campaignId: campaign.id,
                      image_url: creative.object_story_spec.video_data.image_url,
                      thumbnail_url: creative.object_story_spec.video_data.image_url,
                    };
                  }
                }
              }
            }
            
            // Method 2: Try to get image from ad sets (if ads didn't work)
            const adSetsResponse = await fetch(
              `https://graph.facebook.com/v18.0/${campaign.id}/adsets?limit=1&fields=id&access_token=${accessToken}`
            );
            const adSetsData = await adSetsResponse.json();
            
            if (adSetsData.data && adSetsData.data.length > 0) {
              const adSetId = adSetsData.data[0].id;
              const adSetAdsResponse = await fetch(
                `https://graph.facebook.com/v18.0/${adSetId}/ads?limit=1&fields=creative{image_url,thumbnail_url,object_story_spec}&access_token=${accessToken}`
              );
              const adSetAdsData = await adSetAdsResponse.json();
              
              if (adSetAdsData.data && adSetAdsData.data.length > 0 && adSetAdsData.data[0].creative) {
                const creative = adSetAdsData.data[0].creative;
                if (creative.image_url || creative.thumbnail_url) {
                  return {
                    campaignId: campaign.id,
                    image_url: creative.image_url || creative.thumbnail_url || null,
                    thumbnail_url: creative.thumbnail_url || creative.image_url || null,
                  };
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching image for campaign ${campaign.id}:`, error);
          }
          return { campaignId: campaign.id, image_url: null, thumbnail_url: null };
        });

        // Wait for batch to complete
        const batchResults = await Promise.allSettled(imagePromises);
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            const { campaignId, image_url, thumbnail_url } = result.value;
            if (image_url || thumbnail_url) {
              imageMap.set(campaignId, {
                image_url: image_url,
                thumbnail_url: thumbnail_url,
              });
            }
          }
        });
        
        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < allCampaigns.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`Found images for ${imageMap.size} out of ${allCampaigns.length} campaigns`);

      // Merge images into campaigns
      const campaignsWithImages = allCampaigns.map((campaign) => {
        const imageData = imageMap.get(campaign.id);
        return imageData
          ? { ...campaign, ...imageData }
          : campaign;
      });

      return new Response(JSON.stringify({ 
        campaigns: campaignsWithImages,
        adAccountId: targetAdAccountId,
        total: campaignsWithImages.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getAdSets' && campaignId) {
      // Get ad sets for a campaign
      const adSetsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${campaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,optimization_goal,billing_event,targeting,created_time,updated_time&access_token=${accessToken}`
      );
      const adSetsData = await adSetsResponse.json();

      if (adSetsData.error) {
        return new Response(JSON.stringify({ error: adSetsData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ adSets: adSetsData.data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getCreatives' && campaignId) {
      // Get creatives for a campaign via ads
      const adsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${campaignId}/ads?fields=id,name,status,creative{id,name,title,body,image_url,thumbnail_url,object_story_spec}&access_token=${accessToken}`
      );
      const adsData = await adsResponse.json();

      if (adsData.error) {
        return new Response(JSON.stringify({ error: adsData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ads: adsData.data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update' && campaignId) {
      // Update campaign
      const updateResponse = await fetch(
        `https://graph.facebook.com/v18.0/${campaignId}?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );
      const updateData = await updateResponse.json();

      if (updateData.error) {
        return new Response(JSON.stringify({ error: updateData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, data: updateData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'pause' && campaignId) {
      // Pause campaign
      const pauseResponse = await fetch(
        `https://graph.facebook.com/v18.0/${campaignId}?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PAUSED' }),
        }
      );
      const pauseData = await pauseResponse.json();

      return new Response(JSON.stringify({ success: true, data: pauseData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'activate' && campaignId) {
      // Activate campaign
      const activateResponse = await fetch(
        `https://graph.facebook.com/v18.0/${campaignId}?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE' }),
        }
      );
      const activateData = await activateResponse.json();

      return new Response(JSON.stringify({ success: true, data: activateData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete' && campaignId) {
      // Delete campaign
      const deleteResponse = await fetch(
        `https://graph.facebook.com/v18.0/${campaignId}?access_token=${accessToken}`,
        {
          method: 'DELETE',
        }
      );
      const deleteData = await deleteResponse.json();

      return new Response(JSON.stringify({ success: true, data: deleteData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
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