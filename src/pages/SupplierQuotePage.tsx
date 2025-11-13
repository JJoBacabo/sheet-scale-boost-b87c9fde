import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Package, Check, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Product {
  id: string;
  product_name: string;
  image_url: string | null;
  sku: string | null;
}

interface SupplierQuote {
  product_id: string;
  quoted_price: number | null;
  notes: string | null;
}

interface Session {
  id: string;
  supplier_name: string;
  token: string;
}

const SupplierQuotePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Record<string, SupplierQuote>>({});
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    loadSessionData();
  }, [token]);

  const loadSessionData = async () => {
    try {
      // Get session
      const { data: sessionData, error: sessionError } = await supabase
        .from("supplier_quote_sessions" as any)
        .select("*")
        .eq("token", token)
        .eq("is_active", true)
        .single();

      if (sessionError || !sessionData) {
        toast({
          title: "Invalid Link",
          description: "This quotation link is invalid or expired.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setSession(sessionData as any);

      // Get existing quotes
      const { data: quotesData } = await supabase
        .from("supplier_quotes" as any)
        .select("*")
        .eq("session_id", (sessionData as any).id);

      // Get products for this session
      const existingProductIds = quotesData?.map((q: any) => q.product_id) || [];
      
      if (existingProductIds.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("id, product_name, image_url, sku")
          .in("id", existingProductIds);

        if (productsError) throw productsError;
        setProducts(productsData || []);

        // Build quotes map
        const quotesMap: Record<string, SupplierQuote> = {};
        quotesData?.forEach((quote: any) => {
          quotesMap[quote.product_id] = {
            product_id: quote.product_id,
            quoted_price: quote.quoted_price,
            notes: quote.notes,
          };
        });
        setQuotes(quotesMap);
      }
    } catch (error: any) {
      console.error("Error loading session:", error);
      toast({
        title: "Error",
        description: "Failed to load quotation data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuote = async (productId: string) => {
    if (!session) return;

    const quote = quotes[productId];
    if (!quote?.quoted_price || quote.quoted_price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("supplier_quotes" as any)
        .upsert({
          session_id: session.id,
          product_id: productId,
          quoted_price: quote.quoted_price,
          notes: quote.notes || null,
        } as any);

      if (error) throw error;

      setSavedStatus({ ...savedStatus, [productId]: true });
      toast({
        title: "Saved",
        description: "Your quote has been saved successfully.",
      });

      // Remove saved status after 2 seconds
      setTimeout(() => {
        setSavedStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[productId];
          return newStatus;
        });
      }, 2000);
    } catch (error: any) {
      console.error("Error saving quote:", error);
      toast({
        title: "Error",
        description: "Failed to save quote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateQuote = (productId: string, field: keyof SupplierQuote, value: any) => {
    setQuotes({
      ...quotes,
      [productId]: {
        ...quotes[productId],
        product_id: productId,
        [field]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Supplier Quotation
          </h1>
          <p className="text-muted-foreground">
            Welcome, <span className="font-semibold">{session.supplier_name}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Please provide your quotations for the products below
          </p>
        </div>

        {products.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No products to quote yet.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {products.map((product) => {
              const quote = quotes[product.id] || { product_id: product.id, quoted_price: null, notes: null };
              const isSaved = savedStatus[product.id];

              return (
                <Card key={product.id} className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {product.image_url && (
                      <div className="w-full md:w-32 h-32 flex-shrink-0">
                        <img
                          src={product.image_url}
                          alt={product.product_name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {product.product_name}
                        </h3>
                        {product.sku && (
                          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`price-${product.id}`}>
                            Your Quote Price (€) *
                          </Label>
                          <Input
                            id={`price-${product.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={quote.quoted_price || ""}
                            onChange={(e) =>
                              updateQuote(product.id, "quoted_price", parseFloat(e.target.value) || null)
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`notes-${product.id}`}>
                            Notes (Optional)
                          </Label>
                          <Textarea
                            id={`notes-${product.id}`}
                            placeholder="Add any notes..."
                            value={quote.notes || ""}
                            onChange={(e) =>
                              updateQuote(product.id, "notes", e.target.value)
                            }
                            rows={1}
                          />
                        </div>
                      </div>

                      <Button
                        onClick={() => handleSaveQuote(product.id)}
                        disabled={saving || !quote.quoted_price}
                        className="w-full md:w-auto"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : isSaved ? (
                          <Check className="h-4 w-4 mr-2" />
                        ) : null}
                        {isSaved ? "Saved" : "Save Quote"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierQuotePage;
