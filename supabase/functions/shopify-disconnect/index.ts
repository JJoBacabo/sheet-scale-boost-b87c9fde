import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { keep_products = true } = await req.json().catch(() => ({ keep_products: true }));

    console.log('🔌 Disconnecting Shopify for user:', user.id);
    console.log('📦 Keep products:', keep_products);

    // Delete integration
    const { error: deleteError } = await supabase
      .from('integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('integration_type', 'shopify');

    if (deleteError) {
      console.error('❌ Error deleting integration:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Erro ao desconectar Shopify' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let productsDeleted = 0;

    // Delete products if requested
    if (!keep_products) {
      const { data: deletedProducts, error: deleteProductsError } = await supabase
        .from('products')
        .delete()
        .eq('user_id', user.id)
        .not('shopify_product_id', 'is', null)
        .select('id');

      if (deleteProductsError) {
        console.error('❌ Error deleting products:', deleteProductsError);
      } else {
        productsDeleted = deletedProducts?.length || 0;
      }
    }

    console.log('✅ Shopify disconnected successfully');

    return new Response(
      JSON.stringify({
        success: true,
        products_kept: keep_products,
        products_deleted: productsDeleted,
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
