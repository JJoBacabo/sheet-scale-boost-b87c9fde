import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { encryptToken } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyShop {
  id: number;
  name: string;
  email: string;
  domain: string;
  myshopify_domain: string;
  currency: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
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
      console.error('❌ Invalid user:', userError);
      return new Response(
        JSON.stringify({ error: 'Utilizador inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { store_name, access_token } = await req.json();

    console.log('🔗 Connecting to Shopify store:', store_name);

    if (!store_name || !access_token) {
      return new Response(
        JSON.stringify({ error: 'store_name e access_token são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean store name (remove protocol and trailing slashes)
    let cleanStoreName = store_name.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    
    // Try to determine the correct domain
    let shopifyDomain = cleanStoreName;
    let testDomains: string[] = [];
    
    // If it's already a full domain (contains .), use it directly
    if (cleanStoreName.includes('.')) {
      testDomains.push(cleanStoreName);
      
      // Also try extracting the store name and adding .myshopify.com
      if (cleanStoreName.includes('.myshopify.com')) {
        const storeName = cleanStoreName.split('.myshopify.com')[0];
        testDomains.push(`${storeName}.myshopify.com`);
      } else {
        // For custom domains, also try adding .myshopify.com to the first part
        const firstPart = cleanStoreName.split('.')[0];
        testDomains.push(`${firstPart}.myshopify.com`);
      }
    } else {
      // If no dots, assume it's just the store name
      testDomains.push(`${cleanStoreName}.myshopify.com`);
    }

    console.log('🏪 Testing domains:', testDomains);

    let shop: ShopifyShop | null = null;
    let successDomain: string | null = null;

    // Try each domain
    for (const domain of testDomains) {
      console.log(`🔍 Trying domain: ${domain}`);
      
      const shopResponse = await fetch(
        `https://${domain}/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': access_token,
            'Content-Type': 'application/json',
          },
        }
      );

      if (shopResponse.ok) {
        const data = await shopResponse.json();
        shop = data.shop;
        successDomain = domain;
        console.log(`✅ Successfully connected to: ${domain}`);
        break;
      } else {
        console.log(`❌ Failed to connect to ${domain}: ${shopResponse.status}`);
      }
    }

    if (!shop || !successDomain) {
      console.error('❌ Could not connect to any Shopify domain');
      return new Response(
        JSON.stringify({ 
          error: `Não foi possível conectar à loja Shopify. Verifique o URL da loja e o token de acesso. Domínios testados: ${testDomains.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract clean store name from successful domain
    const finalStoreName = successDomain.includes('.myshopify.com') 
      ? successDomain.split('.myshopify.com')[0]
      : successDomain.split('.')[0];

    console.log('✅ Successfully connected to Shopify shop:', shop.name);
    console.log('📝 Final store name:', finalStoreName);

    // Encrypt the access token
    const encryptedToken = await encryptToken(access_token);

    // Check if this specific store is already connected
    const { data: existingStoreIntegration } = await supabase
      .from('integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('integration_type', 'shopify')
      .eq('metadata->>myshopify_domain', shop.myshopify_domain)
      .maybeSingle();

    if (existingStoreIntegration) {
      // Update the existing integration for this specific store
      const { error: updateError } = await supabase
        .from('integrations')
        .update({
          access_token: encryptedToken,
          metadata: {
            store_name: finalStoreName,
            shop_domain: shop.domain,
            shop_email: shop.email,
            shop_name: shop.name,
            myshopify_domain: shop.myshopify_domain,
            connected_domain: successDomain,
            store_currency: shop.currency,
          },
          connected_at: new Date().toISOString(),
        })
        .eq('id', existingStoreIntegration.id);
      
      console.log(`💱 Store currency set to: ${shop.currency}`);

      if (updateError) {
        console.error('❌ Error updating integration:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar integração' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Shopify integration updated successfully');
    } else {
      // Insert new integration - allows multiple stores per user
      const { error: insertError } = await supabase
        .from('integrations')
        .insert({
          user_id: user.id,
          integration_type: 'shopify',
          access_token: encryptedToken,
          metadata: {
            store_name: finalStoreName,
            shop_domain: shop.domain,
            shop_email: shop.email,
            shop_name: shop.name,
            myshopify_domain: shop.myshopify_domain,
            connected_domain: successDomain,
            store_currency: shop.currency,
          },
        });
      
      console.log(`💱 Store currency set to: ${shop.currency}`);

      if (insertError) {
        console.error('❌ Error inserting integration:', insertError);
        return new Response(
          JSON.stringify({ error: 'Erro ao guardar integração' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ New Shopify integration added successfully');
    }

    console.log('✅ Shopify integration saved successfully');

    // Register webhooks for real-time order updates
    try {
      const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/shopify-webhook`;
      
      // Register orders/paid webhook
      const webhookResponse = await fetch(`https://${shop.myshopify_domain}/admin/api/2024-10/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            topic: 'orders/paid',
            address: webhookUrl,
            format: 'json',
          }
        }),
      });

      if (webhookResponse.ok) {
        console.log('✅ Webhook registered successfully');
      } else {
        console.warn('⚠️ Could not register webhook:', await webhookResponse.text());
      }
    } catch (webhookError) {
      console.warn('⚠️ Webhook registration failed:', webhookError);
      // Don't fail the connection if webhook fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        shop: {
          name: shop.name,
          email: shop.email,
          domain: shop.domain,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
