import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Loader2, Check } from "lucide-react";

interface Product {
  id: string;
  product_name: string;
  image_url: string | null;
}

interface SupplierQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  selectedStore: string;
  onSuccess: () => void;
}

export const SupplierQuoteModal = ({
  open,
  onOpenChange,
  userId,
  selectedStore,
  onSuccess,
}: SupplierQuoteModalProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [password, setPassword] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (open) {
      loadProducts();
    } else {
      // Reset on close
      setSelectedProducts(new Set());
      setSupplierName("");
      setSupplierEmail("");
      setPassword("");
      setGeneratedLink("");
      setCopied(false);
    }
  }, [open, selectedStore]);

  const loadProducts = async () => {
    try {
      let query = supabase
        .from("products")
        .select("id, product_name, image_url, integration_id")
        .eq("user_id", userId);

      // Filter by selected store if not "all"
      if (selectedStore !== "all") {
        query = query.eq("integration_id", selectedStore);
      }

      const { data, error } = await query.order("product_name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error loading products:", error);
      toast({
        title: t("common.error"),
        description: "Failed to load products",
        variant: "destructive",
      });
    }
  };

  const toggleProduct = (productId: string) => {
    const newSet = new Set(selectedProducts);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setSelectedProducts(newSet);
  };

  const selectAllProducts = () => {
    const allProductIds = new Set(products.map(p => p.id));
    setSelectedProducts(allProductIds);
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  const generateToken = () => {
    return crypto.randomUUID();
  };

  const handleCreateSession = async () => {
    if (!supplierName.trim()) {
      toast({
        title: t("common.error"),
        description: "Please enter supplier name",
        variant: "destructive",
      });
      return;
    }

    if (selectedProducts.size === 0) {
      toast({
        title: t("common.error"),
        description: "Please select at least one product",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const token = generateToken();

      // Create session
      const { data: sessionData, error: sessionError } = await supabase
        .from("supplier_quote_sessions" as any)
        .insert({
          user_id: userId,
          token,
          supplier_name: supplierName.trim(),
          supplier_email: supplierEmail.trim() || null,
          password: password.trim() || null,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create quote entries for selected products
      const quoteEntries = Array.from(selectedProducts).map((productId) => ({
        session_id: (sessionData as any).id,
        product_id: productId,
        quoted_price: null,
      }));

      const { error: quotesError } = await supabase
        .from("supplier_quotes" as any)
        .insert(quoteEntries as any);

      if (quotesError) throw quotesError;

      const link = `${window.location.origin}/supplier-quote/${token}`;
      setGeneratedLink(link);

      // Send email if email is provided
      if (supplierEmail.trim()) {
        try {
          setSendingEmail(true);
          const { error: emailError } = await supabase.functions.invoke(
            "send-supplier-quote-email",
            {
              body: {
                supplierEmail: supplierEmail.trim(),
                supplierName: supplierName.trim(),
                quoteLink: link,
                hasPassword: !!password.trim(),
              },
            }
          );

          if (emailError) {
            console.error("Email error:", emailError);
            toast({
              title: "Warning",
              description: "Session created but email failed to send",
              variant: "default",
            });
          } else {
            toast({
              title: t("common.success"),
              description: "Quotation session created and email sent!",
            });
          }
        } catch (emailErr) {
          console.error("Email sending error:", emailErr);
        } finally {
          setSendingEmail(false);
        }
      } else {
        toast({
          title: t("common.success"),
          description: "Quotation session created successfully",
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error creating session:", error);
      toast({
        title: t("common.error"),
        description: "Failed to create quotation session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("supplierQuotes.createSession")}</DialogTitle>
          <DialogDescription>
            {t("supplierQuotes.createSessionDescription")}
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supplier-name">{t("supplierQuotes.supplierName")} *</Label>
                <Input
                  id="supplier-name"
                  placeholder="Enter supplier name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-email">{t("supplierQuotes.supplierEmail")}</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  placeholder="supplier@example.com (optional)"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  If provided, an email will be sent with the quote link
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password Protection (Optional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Leave empty for no password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  If set, supplier will need this password to access the quote
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("supplierQuotes.selectProducts")} *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllProducts}
                    disabled={products.length === 0}
                  >
                    {t("supplierQuotes.selectAll")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    disabled={selectedProducts.size === 0}
                  >
                    {t("supplierQuotes.clearSelection")}
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {products.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("supplierQuotes.noProducts")}
                  </p>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={() => toggleProduct(product.id)}
                      />
                      <label
                        htmlFor={`product-${product.id}`}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.product_name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <span className="text-sm">{product.product_name}</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedProducts.size} {selectedProducts.size === 1 ? "product" : "products"} selected
              </p>
            </div>

            <Button
              onClick={handleCreateSession}
              disabled={loading || sendingEmail}
              className="w-full"
            >
              {(loading || sendingEmail) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {sendingEmail ? "Sending email..." : t("supplierQuotes.createSession")}
                </>
              ) : (
                t("supplierQuotes.createSession")
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <Label>{t("supplierQuotes.generatedLink")}</Label>
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly />
                <Button onClick={copyLink} variant="outline" size="icon">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("supplierQuotes.shareLinkWithSupplier")}
              </p>
            </div>

            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="w-full"
            >
              {t("common.close")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
