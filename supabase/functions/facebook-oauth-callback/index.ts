import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { encryptToken } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const appOrigin = 'https://sheet-scale-boost.lovable.app';
  const redirectPath = '/facebook-callback';

  try {
    const url = new URL(req.url);
    console.log('📥 Callback received:', url.toString());
    
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    const errorCode = url.searchParams.get('error_code');
    const errorMessage = url.searchParams.get('error_message');

    // Check for Facebook errors first (before trying to use the code)
    if (error || errorDescription || errorCode || errorMessage) {
      const fbError = errorMessage || errorDescription || error || 'Facebook authentication failed';
      console.log('❌ OAuth error from Facebook:', fbError);
      const redirectUrl = `${appOrigin}${redirectPath}?facebook_error=${encodeURIComponent(fbError)}`;
      return Response.redirect(redirectUrl, 302);
    }
    
    if (!code || !state) {
      console.error('Missing parameters - code:', !!code, 'state:', !!state);
      const redirectUrl = `${appOrigin}${redirectPath}?facebook_error=${encodeURIComponent('Missing authorization code or state parameter')}`;
      return Response.redirect(redirectUrl, 302);
    }
    
    console.log('✅ Got code and state, proceeding with token exchange');

    const appId = Deno.env.get('FACEBOOK_APP_ID');
    const appSecret = Deno.env.get('FACEBOOK_APP_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const redirectUri = `${supabaseUrl}/functions/v1/facebook-oauth-callback`;

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${appId}&` +
      `client_secret=${appSecret}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `code=${code}`
    );

    const tokenData = await tokenResponse.json();
    console.log('📦 Token response status:', tokenResponse.status);
    
    if (!tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      const errorMsg = tokenData.error?.message || 'Failed to exchange code for token';
      throw new Error(errorMsg);
    }
    
    console.log('✅ Successfully got access token');

    // Get long-lived token
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${appId}&` +
      `client_secret=${appSecret}&` +
      `fb_exchange_token=${tokenData.access_token}`
    );

    const longLivedData = await longLivedResponse.json();
    const accessToken = longLivedData.access_token || tokenData.access_token;
    const expiresIn = longLivedData.expires_in || tokenData.expires_in || 5184000; // default 60 days
    
    console.log('🔑 Got long-lived token, expires in:', expiresIn, 'seconds');

    // Decode and parse state to get user_id
    let userId: string;
    try {
      const decodedState = atob(state);
      const stateData = JSON.parse(decodedState);
      userId = stateData.userId;
      console.log('✅ Decoded user ID from state:', userId);
    } catch (err) {
      console.error('❌ Failed to decode state:', err);
      throw new Error('Invalid state parameter');
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Encrypt the access token before storing
    const encryptedToken = await encryptToken(accessToken);

    // Fetch user's ad accounts to store metadata
    let adAccountsMetadata = {};
    try {
      const meResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_id,account_status&access_token=${accessToken}`
      );
      const meData = await meResponse.json();
      
      if (meData.data && meData.data.length > 0) {
        adAccountsMetadata = {
          ad_accounts: meData.data,
          primary_account_name: meData.data[0].name,
          primary_account_id: meData.data[0].id,
        };
        console.log('✅ Fetched ad accounts:', meData.data.length);
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch ad accounts:', err);
    }

    // Save to integrations table
    // Insert new integration (allows multiple Facebook accounts per user)
    const { error: insertError } = await supabaseAdmin
      .from('integrations')
      .insert({
        user_id: userId,
        integration_type: 'facebook_ads',
        access_token: encryptedToken,
        expires_at: expiresAt,
        connected_at: new Date().toISOString(),
        metadata: adAccountsMetadata,
      });

    if (insertError) {
      console.error('❌ Database error:', insertError);
      throw new Error(`Database error: ${insertError.message}`);
    }

    console.log('✅ Token saved successfully to database for user:', userId);

    // Direct HTTP redirect to dashboard with success parameter
    const redirectUrl = `${appOrigin}${redirectPath}?facebook_connected=true`;
    console.log('🔄 Redirecting to:', redirectUrl);
    return Response.redirect(redirectUrl, 302);

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's the "authorization code has been used" error
    if (errorMessage.includes('authorization code has been used') || 
        errorMessage.includes('This authorization code has been used')) {
      console.log('⚠️ Authorization code already used, redirecting...');
      const redirectUrl = `${appOrigin}${redirectPath}?facebook_error=${encodeURIComponent('Esta sessão já foi processada. Por favor, tente conectar novamente.')}`;
      return Response.redirect(redirectUrl, 302);
    }
    
    // Direct HTTP redirect to dashboard with error parameter
    const redirectUrl = `${appOrigin}${redirectPath}?facebook_error=${encodeURIComponent(errorMessage)}`;
    console.log('🔄 Redirecting to:', redirectUrl);
    return Response.redirect(redirectUrl, 302);
  }
});
