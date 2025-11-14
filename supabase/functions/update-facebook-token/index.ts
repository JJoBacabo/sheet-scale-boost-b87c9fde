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
    const { token } = await req.json();

    if (!token) {
      throw new Error('Token is required');
    }

    // Initialize Supabase client
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

    // Calculate expiration date (60 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    // Update the token
    const { data, error } = await supabase
      .from('integrations')
      .update({
        access_token: token,
        expires_at: expiresAt.toISOString()
      })
      .eq('user_id', user.id)
      .eq('integration_type', 'facebook_ads')
      .select();

    if (error) {
      throw error;
    }

    console.log('Token updated successfully:', {
      userId: user.id,
      expiresAt: expiresAt.toISOString(),
      updated: data?.length || 0
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Facebook token updated successfully',
        expiresAt: expiresAt.toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error updating token:', error);
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
