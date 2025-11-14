import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all quotes with values
    const { data: quotes, error: quotesError } = await supabaseClient
      .from("supplier_quotes")
      .select("product_id, quoted_price")
      .not("quoted_price", "is", null);

    if (quotesError) throw quotesError;

    let updated = 0;
    
    // Update each product with its quote
    for (const quote of quotes || []) {
      const { error: updateError } = await supabaseClient
        .from("products")
        .update({ 
          cost_price: quote.quoted_price,
          updated_at: new Date().toISOString()
        })
        .eq("id", quote.product_id);

      if (!updateError) {
        updated++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${updated} quotes to products`,
        updated 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error syncing quotes:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});