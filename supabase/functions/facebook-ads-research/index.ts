import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
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
    const { 
      searchTerms,
      accessToken,
      datePeriod = 30,
      minImpressions = 0, 
      countries = []
    } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    // Priority: Custom token > Generated App Token > Fallback secret
    let cleanToken: string | null = null;
    let tokenSource = '';

    // 1. Try custom token from request
    if (accessToken) {
      cleanToken = accessToken.trim();
      tokenSource = 'custom token from request';
      console.log('Using custom token from request');
    } 
    // 2. Generate App Access Token via Facebook Graph API
    else {
      const appId = Deno.env.get('FACEBOOK_APP_ID');
      const appSecret = Deno.env.get('FACEBOOK_APP_SECRET');
      
      if (!appId || !appSecret) {
        throw new Error('Facebook App ID and Secret must be configured');
      }
      
      console.log('Generating App Access Token...');
      
      try {
        // Get a proper app access token from Facebook
        const tokenResponse = await fetch(
          `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
        );
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Failed to get app token:', errorText);
          throw new Error(`Failed to get app access token: ${errorText}`);
        }
        
        const tokenData = await tokenResponse.json();
        cleanToken = tokenData.access_token;
        tokenSource = 'Generated App Access Token from Facebook';
        console.log('Successfully generated App Access Token');
      } catch (error) {
        console.error('Error generating app token:', error);
        
        // Fallback to secret token if app token generation fails
        const secretToken = Deno.env.get('FACEBOOK_ADS_LIBRARY_TOKEN');
        if (secretToken) {
          cleanToken = secretToken.trim();
          tokenSource = 'Supabase secret (fallback)';
          console.log('Using fallback token from Supabase secrets');
        } else {
          throw new Error('Could not generate app token and no fallback token available');
        }
      }
    }
    
    if (!cleanToken) {
      throw new Error('No valid token available');
    }

    console.log('Token info:', { 
      hasToken: true, 
      tokenLength: cleanToken.length,
      tokenStart: cleanToken.substring(0, 10),
      tokenEnd: cleanToken.substring(cleanToken.length - 10),
      source: tokenSource
    });
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
        access_token: cleanToken!,
        ad_active_status: 'ALL',
        search_terms: searchTerms || '',
        fields: 'id,ad_creative_bodies,ad_creative_link_captions,ad_creative_link_titles,ad_creative_link_descriptions,ad_snapshot_url,ad_delivery_start_time,ad_delivery_stop_time,page_name,impressions,spend',
        limit: '100'
      });

      if (countries.length > 0) {
        params.append('ad_reached_countries', JSON.stringify(countries));
      }

      if (nextCursor) {
        params.append('after', nextCursor);
      }

      const url = `https://graph.facebook.com/v24.0/ads_archive?${params.toString()}`;
      
      console.log(`Fetching page ${pageCount + 1}...`);
      console.log('Full URL (without token):', url.replace(cleanToken!, 'REDACTED'));
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Facebook API error:', errorText);
        console.error('Request details:', {
          status: response.status,
          statusText: response.statusText,
          url: url.replace(cleanToken!, 'REDACTED')
        });
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
