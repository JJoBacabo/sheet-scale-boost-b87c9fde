import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { decryptToken } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Migration script to update store_currency for existing Shopify integrations
 * This fetches the currency from Shopify API and updates the metadata
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
      return new Response(
        JSON.stringify({ error: 'Utilizador inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body to check for specific integration_id
    const body = await req.json().catch(() => ({}));
    const specificIntegrationId = body.integration_id;

    // Fetch Shopify integrations - either a specific one or all user's integrations
    let query = supabase
      .from('integrations')
      .select('*')
      .eq('integration_type', 'shopify')
      .eq('user_id', user.id);
    
    if (specificIntegrationId) {
      query = query.eq('id', specificIntegrationId);
    }

    const { data: integrations, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching integrations:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar integrações' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      total: integrations?.length || 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const integration of integrations || []) {
      const metadata = integration.metadata as any;
      
      // Skip if already has store_currency
      if (metadata?.store_currency) {
        console.log(`⏭️ Skipping integration ${integration.id} - already has currency: ${metadata.store_currency}`);
        results.skipped++;
        continue;
      }

      try {
        // Decrypt access token
        const accessToken = await decryptToken(integration.access_token);
        const shopifyDomain = metadata?.connected_domain || metadata?.myshopify_domain;

        if (!shopifyDomain) {
          console.error(`❌ No domain found for integration ${integration.id}`);
          results.errors.push(`Integration ${integration.id}: No domain`);
          continue;
        }

        // Fetch shop data from Shopify
        console.log(`🔍 Fetching currency for ${shopifyDomain}`);
        const shopResponse = await fetch(
          `https://${shopifyDomain}/admin/api/2024-01/shop.json`,
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!shopResponse.ok) {
          console.error(`❌ Failed to fetch shop data for ${shopifyDomain}: ${shopResponse.status}`);
          results.errors.push(`Integration ${integration.id}: API error ${shopResponse.status}`);
          continue;
        }

        const { shop } = await shopResponse.json();
        const storeCurrency = shop.currency;

        // Update metadata with store_currency
        const updatedMetadata = {
          ...metadata,
          store_currency: storeCurrency,
        };

        const { error: updateError } = await supabase
          .from('integrations')
          .update({ metadata: updatedMetadata })
          .eq('id', integration.id);

        if (updateError) {
          console.error(`❌ Error updating integration ${integration.id}:`, updateError);
          results.errors.push(`Integration ${integration.id}: ${updateError.message}`);
          continue;
        }

        console.log(`✅ Updated integration ${integration.id} with currency: ${storeCurrency}`);
        results.updated++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error processing integration ${integration.id}:`, error);
        results.errors.push(`Integration ${integration.id}: ${errorMessage}`);
      }
    }

    // Return the updated currency if only one integration was processed
    const response: any = {
      success: true,
      results,
      message: `Processadas ${results.total} integrações: ${results.updated} atualizadas, ${results.skipped} ignoradas, ${results.errors.length} erros`,
    };

    // If specific integration was requested and updated, include the currency
    if (specificIntegrationId && results.updated === 1 && integrations && integrations.length > 0) {
      const metadata = integrations[0].metadata as any;
      response.store_currency = metadata?.store_currency;
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
