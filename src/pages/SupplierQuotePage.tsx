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
}

interface Session {
  id: string;
  supplier_name: string;
  has_password: boolean;
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
  const [passwordInput, setPasswordInput] = useState("");
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    loadSessionData();
  }, [token]);

  const loadSessionData = async () => {
    try {
      // Get session info using secure RPC (doesn't expose password)
      const { data: sessionData, error: sessionError } = await supabase
        .rpc('get_supplier_session_info', { session_token: token });

      if (sessionError || !sessionData || sessionData.length === 0) {
        toast({
          title: "Invalid Link",
          description: "This quotation link is invalid or expired.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const sessionInfo = sessionData[0];
      setSession({
        id: sessionInfo.session_id,
        supplier_name: sessionInfo.supplier_name,
        has_password: sessionInfo.has_password,
      });

      // Check if password protection is enabled
      if (sessionInfo.has_password) {
        // Password is required, stop here until verified
        setLoading(false);
        return;
      }

      // No password, proceed to load quotes
      await loadQuotes({ id: sessionInfo.session_id });
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

  const loadQuotes = async (sessionData: any) => {
    try {
      // Get existing quotes
      const { data: quotesData } = await supabase
        .from("supplier_quotes" as any)
        .select("*")
        .eq("session_id", (sessionData as any).id);

      // Get products for this session using the secure function
      // This only returns product_name and image_url, not sensitive financial data
      const existingProductIds = quotesData?.map((q: any) => q.product_id) || [];
      
      if (existingProductIds.length > 0) {
        // Use the secure function to get only safe product data
        const productPromises = existingProductIds.map((productId: string) =>
          supabase.rpc('get_product_for_quote', { product_id: productId })
        );
        
        const productResults = await Promise.all(productPromises);
        const productsData: Product[] = [];
        
        productResults.forEach((result) => {
          if (result.data && result.data.length > 0) {
            productsData.push({
              id: result.data[0].id,
              product_name: result.data[0].product_name,
              image_url: result.data[0].image_url,
              sku: null, // SKU is no longer exposed to suppliers
            });
          }
        });

        setProducts(productsData);

        // Build quotes map
        const quotesMap: Record<string, SupplierQuote> = {};
        quotesData?.forEach((quote: any) => {
          quotesMap[quote.product_id] = {
            product_id: quote.product_id,
            quoted_price: quote.quoted_price,
          };
        });
        setQuotes(quotesMap);
      }
    } catch (error: any) {
      console.error("Error loading quotes:", error);
      toast({
        title: "Error",
        description: "Failed to load quotation data.",
        variant: "destructive",
      });
    }
  };

  const handlePasswordSubmit = async () => {
    if (!session || !passwordInput.trim()) {
      setPasswordError(true);
      return;
    }

    try {
      // Verify password server-side using secure RPC
      const { data, error } = await supabase.rpc('verify_supplier_session_password', {
        session_token: token,
        input_password: passwordInput.trim()
      });

      if (error) {
        console.error("Password verification error:", error);
        setPasswordError(true);
        toast({
          title: "Error",
          description: "Failed to verify password. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data && data.length > 0 && data[0].is_valid) {
        setIsPasswordVerified(true);
        setPasswordError(false);
        setLoading(true);
        await loadQuotes({ id: data[0].session_id });
        setLoading(false);
      } else {
        setPasswordError(true);
        toast({
          title: "Invalid Password",
          description: "The password you entered is incorrect.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Password verification error:", error);
      setPasswordError(true);
      toast({
        title: "Error",
        description: "Failed to verify password. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAllQuotes = async () => {
    if (!session) return;

    // Validate all quotes
    const quotesToSave = Object.entries(quotes).filter(([_, quote]) => 
      quote.quoted_price && quote.quoted_price > 0
    );

    if (quotesToSave.length === 0) {
      toast({
        title: "No Quotes",
        description: "Please enter at least one valid price.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Save all quotes at once
      const upsertPromises = quotesToSave.map(([productId, quote]) =>
        supabase
          .from("supplier_quotes" as any)
          .upsert(
            {
              session_id: session.id,
              product_id: productId,
              quoted_price: quote.quoted_price,
            },
            {
              onConflict: 'session_id,product_id'
            }
          )
      );

      const results = await Promise.all(upsertPromises);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error("Failed to save some quotes");
      }

      // Mark all as saved
      const newSavedStatus: Record<string, boolean> = {};
      quotesToSave.forEach(([productId]) => {
        newSavedStatus[productId] = true;
      });
      setSavedStatus(newSavedStatus);

      toast({
        title: "Success",
        description: `${quotesToSave.length} quote(s) saved successfully.`,
      });

      // Remove saved status after 3 seconds
      setTimeout(() => {
        setSavedStatus({});
      }, 3000);
    } catch (error: any) {
      console.error("Error saving quotes:", error);
      toast({
        title: "Error",
        description: "Failed to save quotes. Please try again.",
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

  if (loading && !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show password prompt if password is required and not yet verified
  if (session?.has_password && !isPasswordVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Password Required</h1>
              <p className="text-muted-foreground">
                This quotation is password protected. Please enter the password to continue.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError(false);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handlePasswordSubmit();
                    }
                  }}
                  className={passwordError ? "border-destructive" : ""}
                />
                {passwordError && (
                  <p className="text-sm text-destructive">
                    Incorrect password. Please try again.
                  </p>
                )}
              </div>

              <Button 
                onClick={handlePasswordSubmit} 
                className="w-full"
                disabled={!passwordInput.trim()}
              >
                Continue
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

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
          <>
            <div className="space-y-4">
              {products.map((product) => {
                const quote = quotes[product.id] || { product_id: product.id, quoted_price: null };
                const isSaved = savedStatus[product.id];

                return (
                  <Card key={product.id} className="p-6 relative">
                    {isSaved && (
                      <div className="absolute top-4 right-4">
                        <Check className="h-5 w-5 text-green-600" />
                      </div>
                    )}
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
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            
            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                onClick={handleSaveAllQuotes}
                disabled={saving}
                className="min-w-[200px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Save All Quotes
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SupplierQuotePage;
