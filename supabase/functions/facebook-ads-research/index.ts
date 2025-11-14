import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      searchTerms,
      datePeriod = 30,
      minImpressions = 0, 
      countries = []
    } = await req.json();

    // Initialize Supabase client for authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get Facebook Ads Library token from Supabase Secrets
    const facebookToken = Deno.env.get('FACEBOOK_ADS_LIBRARY_TOKEN');
    
    if (!facebookToken) {
      throw new Error('Facebook Ads Library token not configured. Please contact support.');
    }

    console.log('Searching ads with params:', { searchTerms, datePeriod, minImpressions, countries });

    const startDateThreshold = new Date();
    startDateThreshold.setDate(startDateThreshold.getDate() - datePeriod);
    console.log('Date filter: ads after', startDateThreshold.toISOString());

    let allFilteredAds: any[] = [];
    let nextCursor: string | null = null;
    let pageCount = 0;
    const maxPages = 10; // Limit to prevent infinite loops

    do {
      const params = new URLSearchParams({
        access_token: facebookToken,
        ad_active_status: 'ALL',
        fields: 'id,ad_creative_bodies,ad_creative_link_captions,ad_creative_link_titles,ad_creative_link_descriptions,ad_snapshot_url,ad_delivery_start_time,ad_delivery_stop_time,page_name,impressions,spend',
        limit: '100'
      });

      // Add search_terms only if provided
      if (searchTerms && searchTerms.trim()) {
        params.append('search_terms', searchTerms.trim());
      }

      if (countries.length > 0) {
        params.append('ad_reached_countries', JSON.stringify(countries));
      }

      if (nextCursor) {
        params.append('after', nextCursor);
      }

      const url = `https://graph.facebook.com/v24.0/ads_archive?${params.toString()}`;
      
      console.log(`Fetching page ${pageCount + 1}...`);
      console.log('Full URL (without token):', url.replace(facebookToken, 'REDACTED'));
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Facebook API error:', errorText);
        console.error('Request details:', {
          status: response.status,
          statusText: response.statusText,
          url: url.replace(facebookToken, 'REDACTED')
        });
        
        // Parse error to provide more helpful message
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.code === 1 || errorJson.error?.type === 'OAuthException') {
            throw new Error('Facebook token is invalid or expired. Please reconnect your Facebook account in Integrations.');
          }
        } catch (parseError) {
          // If can't parse, use original error
        }
        
        throw new Error(`Facebook API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        break;
      }

      // Filter ads based on criteria
      const filteredAds = data.data.filter((ad: any) => {
        // Filter by date period
        if (ad.ad_delivery_start_time) {
          const adStartDate = new Date(ad.ad_delivery_start_time);
          if (adStartDate < startDateThreshold) {
            return false;
          }
        }

        // Check impressions
        if (ad.impressions) {
          const impressionValue = parseInt(ad.impressions.lower_bound || ad.impressions.upper_bound || '0');
          if (impressionValue < minImpressions) {
            return false;
          }
        } else if (minImpressions > 0) {
          return false;
        }

        // Calculate days active
        if (ad.ad_delivery_start_time) {
          const startDate = new Date(ad.ad_delivery_start_time);
          const endDate = ad.ad_delivery_stop_time ? new Date(ad.ad_delivery_stop_time) : new Date();
          const daysActive = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          ad.days_active = daysActive;
        }

        // Calculate spend amount
        if (ad.spend) {
          const spendValue = parseInt(ad.spend.lower_bound || ad.spend.upper_bound || '0');
          ad.spend_amount = spendValue;
        }

        return true;
      });

      allFilteredAds = allFilteredAds.concat(filteredAds);
      console.log(`Page ${pageCount + 1}: Found ${filteredAds.length} matching ads (total: ${allFilteredAds.length})`);

      nextCursor = data.paging?.cursors?.after || null;
      pageCount++;

    } while (nextCursor && pageCount < maxPages);

    console.log(`Search complete. Total matching ads: ${allFilteredAds.length}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        ads: allFilteredAds,
        totalPages: pageCount,
        totalResults: allFilteredAds.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in facebook-ads-research:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
