import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingOverlay } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { Search, Package, DollarSign, TrendingUp, ShoppingBag, RefreshCw, ChevronDown, Edit2, Check, X, Calendar, Download, ArrowUp, ArrowDown, Activity, Eye, AlertTriangle, Send, Filter } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { Card3D } from "@/components/ui/Card3D";
import { Button3D } from "@/components/ui/Button3D";
import { StoreSelector } from "@/components/StoreSelector";
import { StoreCurrencySelector } from "@/components/StoreCurrencySelector";
import { SupplierQuoteModal } from "@/components/SupplierQuoteModal";
import { SupplierQuoteList } from "@/components/SupplierQuoteList";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays, isWithinInterval } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  product_name: string;
  sku: string | null;
  cost_price: number | null;
  selling_price: number | null;
  quantity_sold: number;
  total_revenue: number;
  profit_margin: number | null;
  image_url: string | null;
  shopify_product_id: string | null;
  integration_id: string | null;
  created_at: string;
  updated_at: string;
  last_sold_at: string | null;
  integrations?: {
    metadata: any;
  } | null;
}

const Products = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [hasShopifyIntegration, setHasShopifyIntegration] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [editingCost, setEditingCost] = useState<string | null>(null);
  const [tempCostPrice, setTempCostPrice] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [datePreset, setDatePreset] = useState("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedStore, setSelectedStore] = useState("all");
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteRefreshTrigger, setQuoteRefreshTrigger] = useState(0);
  const [storeCurrency, setStoreCurrency] = useState<string>("EUR");
  const [showOnlyWithoutCost, setShowOnlyWithoutCost] = useState(false);
  const { selectedCurrency, convertBetween, formatAmount } = useCurrency();

  const toggleProduct = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        checkShopifyIntegration(session.user.id);
        fetchProducts(session.user.id, true); // Force refresh on mount
        
        // Silent auto-sync on page load
        silentAutoSync(session);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else if (session.user) {
        // Refresh data when auth state changes
        checkShopifyIntegration(session.user.id);
        fetchProducts(session.user.id, true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Refetch products when selected store changes
  useEffect(() => {
    if (user) {
      // Don't force refresh when changing store - just fetch with new filter
      // This prevents clearing products and causing flickering
      fetchProducts(user.id, false);
    }
  }, [selectedStore]);

  // Real-time updates for products
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setProducts((prev) => {
              // Check if product already exists
              const exists = prev.find(p => p.id === payload.new.id);
              if (exists) {
                // Product already exists, update it instead of adding duplicate
                return prev.map(p => p.id === payload.new.id ? (payload.new as Product) : p);
              }
              
              // Check if we should show this product based on current filters
              const newProduct = payload.new as Product;
              if (selectedStore !== "all" && newProduct.integration_id !== selectedStore) {
                // Product is from different store, don't add it
                return prev;
              }
              
              // Add new product to the beginning
              return [newProduct, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setProducts((prev) => {
              const newProduct = payload.new as Product;
              const existingIndex = prev.findIndex(p => p.id === newProduct.id);
              
              if (existingIndex >= 0) {
                // Product exists in list, update it
                // Check if product should still be visible based on store filter
                if (selectedStore !== "all" && newProduct.integration_id !== selectedStore) {
                  // Product moved to different store, remove it
                  return prev.filter(p => p.id !== newProduct.id);
                }
                
                // Update existing product in place (don't move to top to avoid flickering)
                const updated = [...prev];
                updated[existingIndex] = newProduct;
                return updated;
              } else {
                // Product doesn't exist in list, check if we should add it
                if (selectedStore !== "all" && newProduct.integration_id !== selectedStore) {
                  // Product is from different store, don't add it
                  return prev;
                }
                
                // Add product to the beginning
                return [newProduct, ...prev];
              }
            });
          } else if (payload.eventType === 'DELETE') {
            setProducts((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedStore]); // Include selectedStore in dependencies to filter correctly

  // Real-time updates for integrations (to detect store changes)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('integrations-changes-products')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'integrations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Integration update detected:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Check if it's a Shopify integration
            const integration = payload.new as any;
            if (integration.integration_type === 'shopify') {
              console.log('🏪 Shopify integration changed, refreshing...');
              checkShopifyIntegration(user.id);
              fetchProducts(user.id, true);
            }
          } else if (payload.eventType === 'DELETE') {
            // Integration was deleted
            const integration = payload.old as any;
            if (integration.integration_type === 'shopify') {
              console.log('🏪 Shopify integration removed');
              setHasShopifyIntegration(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  // Update store currency when selected store changes
  useEffect(() => {
    const updateStoreCurrency = async () => {
      if (selectedStore === "all") {
        setStoreCurrency("EUR"); // Default to EUR for "all stores"
        return;
      }

      try {
        const { data, error } = await supabase
          .from('integrations')
          .select('metadata')
          .eq('id', selectedStore)
          .single();

        if (error) throw error;

        const metadata = data?.metadata as any;
        if (metadata?.store_currency) {
          setStoreCurrency(metadata.store_currency);
        } else {
          setStoreCurrency("EUR"); // Default to EUR if not set
        }
      } catch (error) {
        console.error('Error fetching store currency:', error);
        setStoreCurrency("EUR");
      }
    };

    updateStoreCurrency();
  }, [selectedStore]);

  const checkShopifyIntegration = async (userId: string) => {
    const { data } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("integration_type", "shopify")
      .maybeSingle();
    
    setHasShopifyIntegration(!!data);
  };

  const silentAutoSync = async (session: any) => {
    if (!session) return;
    
    try {
      // Check if there's a Shopify integration
      const { data: integrations } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('integration_type', 'shopify');
      
      if (integrations && integrations.length > 0) {
        // Sync silently in background without showing toasts
        console.log('🔄 Starting silent auto-sync...');
        
        for (const integration of integrations) {
          await supabase.functions.invoke('shopify-sync-products', {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            },
            body: { integration_id: integration.id }
          });
        }
        
        console.log('✅ Silent auto-sync completed');
        
        // Refresh products after sync completes (wait a bit for background sync)
        setTimeout(() => {
          if (session.user) {
            fetchProducts(session.user.id, true);
          }
        }, 12000);
      }
    } catch (err) {
      console.error('Silent auto-sync error:', err);
    }
  };

  const fetchProducts = async (userId: string, forceRefresh = false) => {
    // Don't clear products when just changing store filter - this causes flickering
    // Only clear if explicitly forcing a full refresh (like after sync)
    
    let query = supabase
      .from("products")
      .select(`
        *,
        integrations (
          metadata
        )
      `)
      .eq("user_id", userId);

    // Filter by selected store if not "all"
    if (selectedStore !== "all") {
      query = query.eq("integration_id", selectedStore);
    }

    const { data, error } = await query.order("updated_at", { ascending: false });

    if (error) {
      toast({
        title: t("settings.errorLoadingProducts"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (!data || data.length === 0) {
      // Only clear if we explicitly want to show empty state
      if (forceRefresh) {
        setProducts([]);
      }
      return;
    }

    // Remove duplicates based on shopify_product_id and integration_id
    // Keep the most recent one, but also consider integration_id to avoid removing products from different stores
    const uniqueProducts = (data || []).reduce((acc, product) => {
      // For products with shopify_product_id, check for duplicates
      if (product.shopify_product_id) {
        const existing = acc.find(p => 
          p.shopify_product_id === product.shopify_product_id &&
          p.integration_id === product.integration_id // Same store
        );
        
        if (!existing) {
          acc.push(product);
        } else {
          // Keep the one with the most recent updated_at
          const existingDate = new Date(existing.updated_at || existing.created_at).getTime();
          const newDate = new Date(product.updated_at || product.created_at).getTime();
          if (newDate > existingDate) {
            const index = acc.indexOf(existing);
            acc[index] = product;
          }
        }
      } else {
        // Products without shopify_product_id - check by id only
        const existing = acc.find(p => p.id === product.id);
        if (!existing) {
          acc.push(product);
        }
      }
      
      return acc;
    }, [] as Product[]);
    
    // Only update state if we have products or if force refresh
    setProducts(uniqueProducts);
  };

  const handleSyncShopifyProducts = async () => {
    if (!user) return;
    
    setSyncing(true);
    
    try {
      const body = selectedStore !== "all" ? { integration_id: selectedStore } : {};
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: t('settings.error'),
          description: t('settings.integrationsPage.loginRequired'),
          variant: "destructive",
        });
        setSyncing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('shopify-sync-products', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body
      });
      
      if (error || data?.error) {
        const errorMsg = data?.error || error?.message || t("settings.unknownError");
        
        // Check if it's a permissions error (404 = endpoint not found or no permission)
        if (errorMsg.includes("404")) {
          toast({
            title: `⚠️ ${t("settings.insufficientShopifyPermissions")}`,
            description: t("settings.shopifyPermissionsDesc"),
            variant: "destructive",
            duration: 15000,
          });
        } else {
          toast({
            title: t("settings.errorSyncing"),
            description: errorMsg,
            variant: "destructive",
          });
        }
      } else if (data?.stats) {
        // Check if it's the background sync message
        if (data.stats.message) {
          toast({
            title: `✅ ${t("settings.syncStarted")}`,
            description: t("settings.syncStartedDesc"),
            duration: 6000,
          });
          
          // Auto-refresh after 10 seconds
          setTimeout(async () => {
            await fetchProducts(user.id);
            toast({
              title: t("settings.listUpdated"),
              description: t("settings.productsSyncedSuccess"),
            });
          }, 10000);
        } else {
          // Legacy response with detailed stats
          toast({
            title: `✅ ${t("settings.productsSynced")}`,
            description: t("settings.syncStats")
              .replace('{{created}}', String(data.stats.created))
              .replace('{{updated}}', String(data.stats.updated))
              .replace('{{total}}', String(data.stats.total)),
          });
          await fetchProducts(user.id);
        }
      }
    } catch (err) {
      toast({
        title: t("settings.errorSyncing"),
        description: t("settings.syncFailed"),
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // First filter by store (if applicable), then by search/date
  const storeFilteredProducts = selectedStore === "all" 
    ? products 
    : products.filter(p => p.integration_id === selectedStore);

  const filteredProducts = storeFilteredProducts
    .filter((p) => {
      // Search filter
      const matchesSearch = p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Date filter - using last_sold_at from Shopify, fallback to created_at if not available
      const soldDate = p.last_sold_at || p.created_at;
      const matchesDate = !dateRange.from || !dateRange.to || 
        isWithinInterval(new Date(soldDate), { start: dateRange.from, end: dateRange.to });
      
      // Cost filter - show only products without cost if filter is enabled
      const matchesCostFilter = !showOnlyWithoutCost || !p.cost_price || p.cost_price === 0;
      
      return matchesSearch && matchesDate && matchesCostFilter;
    })
    .sort((a, b) => {
      // Sort by last_sold_at descending (most recent sales first)
      // This keeps order stable during edits since last_sold_at only changes with new sales
      const dateA = a.last_sold_at ? new Date(a.last_sold_at).getTime() : new Date(a.created_at).getTime();
      const dateB = b.last_sold_at ? new Date(b.last_sold_at).getTime() : new Date(b.created_at).getTime();
      return dateB - dateA;
    });

  const calculateProfit = (product: Product) => {
    const revenue = product.total_revenue || 0;
    const cost = (product.cost_price || 0) * (product.quantity_sold || 0);
    return revenue - cost;
  };
  
  // Check if there are products without cost price
  const hasProductsWithoutCost = filteredProducts.some(p => !p.cost_price || p.cost_price === 0);
  
  const totalStats = {
    totalProducts: filteredProducts.length,
    totalRevenue: filteredProducts.reduce((sum, p) => sum + (p.total_revenue || 0), 0),
    totalProfit: filteredProducts.reduce((sum, p) => sum + calculateProfit(p), 0),
    avgMargin: filteredProducts.length > 0
      ? filteredProducts.reduce((sum, p) => sum + (p.profit_margin || 0), 0) / filteredProducts.length
      : 0,
  };

  const handleEditCost = (productId: string, currentCost: number | null) => {
    setEditingCost(productId);
    // Show current cost or empty string (not "0") to allow user to see and edit the actual value
    setTempCostPrice(currentCost !== null && currentCost !== 0 ? currentCost.toFixed(2) : "");
  };

  const handleCancelEditCost = () => {
    setEditingCost(null);
    setTempCostPrice("");
  };

  const handleSaveCost = async (productId: string) => {
    if (!user) {
      console.error('❌ [handleSaveCost] No user found');
      return;
    }
    
    // Handle empty string or whitespace - treat as 0
    const trimmedValue = tempCostPrice.trim();
    if (trimmedValue === '' || trimmedValue === '.') {
      // User wants to clear the cost
      toast({
        title: `ℹ️ ${t("settings.invalidValue")}`,
        description: "Por favor, introduza um valor válido (ex: 10.50)",
        variant: "destructive",
      });
      return;
    }
    
    const costValue = parseFloat(trimmedValue);
    console.log('📝 [handleSaveCost] Starting save:', { productId, costValue, tempCostPrice: trimmedValue });
    
    // Validate input
    if (isNaN(costValue) || costValue < 0) {
      console.warn('⚠️ [handleSaveCost] Invalid cost value:', costValue);
      toast({
        title: `❌ ${t("settings.invalidValue")}`,
        description: "Por favor, introduza um valor numérico válido maior ou igual a 0",
        variant: "destructive",
      });
      return;
    }
    
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      console.error('❌ [handleSaveCost] Product not found:', productId);
      return;
    }

    console.log('📦 [handleSaveCost] Product found:', {
      id: product.id,
      name: product.product_name,
      currentCostPrice: product.cost_price,
      sellingPrice: product.selling_price,
      quantitySold: product.quantity_sold
    });

    // Calculate new profit margin
    const sellingPrice = product.selling_price || 0;
    const newMargin = sellingPrice > 0 ? ((sellingPrice - costValue) / sellingPrice) * 100 : 0;
    
    console.log('💰 [handleSaveCost] Calculated values:', {
      costValue,
      sellingPrice,
      newMargin: newMargin.toFixed(2) + '%'
    });

    try {
      console.log('💾 [handleSaveCost] Updating product in database...');
      // Update product
      const { data: updatedData, error } = await supabase
        .from("products")
        .update({ 
          cost_price: costValue,
          profit_margin: newMargin,
          updated_at: new Date().toISOString()
        })
        .eq("id", productId)
        .select()
        .single();

      if (error) {
        console.error('❌ [handleSaveCost] Error updating product cost:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          productId,
          costValue
        });
        toast({
          title: t("settings.errorUpdatingQuote"),
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (!updatedData) {
        console.error('❌ [handleSaveCost] No data returned from update:', {
          productId,
          costValue
        });
        toast({
          title: t("common.error"),
          description: t("settings.errorUpdatingQuoteDesc"),
          variant: "destructive",
        });
        return;
      }

      console.log('✅ [handleSaveCost] Product updated successfully:', {
        id: updatedData.id,
        cost_price: updatedData.cost_price,
        profit_margin: updatedData.profit_margin,
        updated_at: updatedData.updated_at
      });

      // Update local state immediately for better UX
      // Use the data returned from the update to ensure consistency
      setProducts(prev => {
        const productIndex = prev.findIndex(p => p.id === productId);
        if (productIndex >= 0) {
          // Update existing product with new data
          const updated = [...prev];
          updated[productIndex] = {
            ...updated[productIndex],
            ...updatedData,
            cost_price: costValue, // Ensure cost_price is set to the value we saved
            profit_margin: newMargin, // Ensure profit_margin is set to the calculated value
          };
          return updated;
        }
        // If product not found in list, add it (shouldn't happen, but safe fallback)
        return [...prev, { ...product, ...updatedData, cost_price: costValue, profit_margin: newMargin }];
      });

      console.log('🔄 [handleSaveCost] Local state updated, now updating Daily ROAS...');
      // Update Daily ROAS entries
      await updateDailyROASForProduct(product.product_name, costValue, sellingPrice);

      console.log('✅ [handleSaveCost] All updates completed successfully');
      toast({
        title: `✅ ${t("settings.quoteUpdated")}`,
        description: t("settings.quoteUpdatedDesc"),
        duration: 3000, // 3 segundos
      });
      setEditingCost(null);
      setTempCostPrice("");
      
      // Não precisamos chamar fetchProducts aqui porque:
      // 1. Já atualizamos o estado local imediatamente
      // 2. O real-time update vai detectar a mudança automaticamente
      // 3. Evita loops infinitos de atualização
    } catch (err) {
      console.error('❌ [handleSaveCost] Exception caught:', {
        error: err,
        productId,
        costValue,
        stack: err instanceof Error ? err.stack : undefined
      });
      toast({
        title: t("common.error"),
        description: t("settings.errorUpdatingQuoteDesc"),
        variant: "destructive",
      });
    }
  };

  const updateDailyROASForProduct = async (productName: string, newCostPrice: number, sellingPrice: number) => {
    try {
      console.log('♻️ [updateDailyROASForProduct] Starting update:', {
        productName,
        newCostPrice,
        sellingPrice,
        userId: user!.id
      });
      
      // Fetch all daily_roas entries
      console.log('📥 [updateDailyROASForProduct] Fetching daily_roas entries...');
      const { data: dailyData, error: fetchError } = await supabase
        .from('daily_roas')
        .select('*')
        .eq('user_id', user!.id);
      
      if (fetchError) {
        console.error('❌ [updateDailyROASForProduct] Error fetching daily data:', {
          error: fetchError,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint
        });
        return;
      }
      
      console.log(`📊 [updateDailyROASForProduct] Found ${dailyData?.length || 0} total daily_roas entries`);
      
      // Find matching entries using multiple strategies:
      // 1. Match by product_price (most reliable - same selling price = same product)
      // 2. Match by product name in campaign name (fallback)
      const cleanProductName = productName.toLowerCase().replace(/[^a-z0-9]/g, '');
      console.log('🔍 [updateDailyROASForProduct] Searching for matches:', {
        productName,
        cleanProductName,
        sellingPrice,
        totalEntries: dailyData?.length || 0
      });
      
      const affectedEntries = (dailyData || []).filter(entry => {
        // Strategy 1: Match by product_price (most reliable)
        const entryProductPrice = Number(entry.product_price) || 0;
        const priceMatch = Math.abs(entryProductPrice - sellingPrice) < 0.01; // Allow small floating point differences
        
        // Strategy 2: Match by name (fallback if price doesn't match)
        const cleanCampaign = entry.campaign_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const nameMatch = cleanCampaign.includes(cleanProductName) || cleanProductName.includes(cleanCampaign);
        
        // Also try matching by extracting key words from product name
        const productWords = cleanProductName.split(/\s+/).filter(w => w.length > 3); // Words longer than 3 chars
        const nameMatchByWords = productWords.length > 0 && productWords.some(word => cleanCampaign.includes(word));
        
        const matches = priceMatch || nameMatch || nameMatchByWords;
        
        if (matches) {
          console.log('✅ [updateDailyROASForProduct] Match found:', {
            entryId: entry.id,
            campaignName: entry.campaign_name,
            date: entry.date,
            currentCOG: entry.cog,
            unitsSold: entry.purchases || entry.units_sold,
            entryProductPrice,
            sellingPrice,
            matchType: priceMatch ? 'price' : (nameMatch ? 'name' : 'name-words')
          });
        }
        return matches;
      });
      
      console.log(`🎯 [updateDailyROASForProduct] Found ${affectedEntries.length} Daily ROAS entries to update`);
      
      if (affectedEntries.length === 0) {
        console.warn('⚠️ [updateDailyROASForProduct] No matching entries found for product:', productName);
        return;
      }
      
      // Update each entry
      let successCount = 0;
      let errorCount = 0;
      
      for (const entry of affectedEntries) {
        const unitsSold = entry.purchases || entry.units_sold || 0;
        const oldCOG = entry.cog || 0;
        const newCOG = newCostPrice * unitsSold;
        const totalRevenue = sellingPrice * unitsSold;
        const totalSpent = entry.total_spent || 0;
        const newMarginEuros = totalRevenue - newCOG - totalSpent;
        const newMarginPercentage = totalRevenue > 0 ? (newMarginEuros / totalRevenue) * 100 : 0;
        const newROAS = totalSpent > 0 ? totalRevenue / totalSpent : 0;
        
        console.log(`♻️ [updateDailyROASForProduct] Updating entry ${entry.id}:`, {
          campaignName: entry.campaign_name,
          date: entry.date,
          oldCOG,
          newCOG,
          unitsSold,
          totalRevenue,
          totalSpent,
          newMarginEuros,
          newMarginPercentage: newMarginPercentage.toFixed(2) + '%',
          newROAS: newROAS.toFixed(2) + 'x'
        });
        
        const { data: updatedEntry, error: updateError } = await supabase
          .from('daily_roas')
          .update({
            cog: newCOG,
            margin_euros: newMarginEuros,
            margin_percentage: newMarginPercentage,
            roas: newROAS,
            product_price: sellingPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.id)
          .select()
          .single();
        
        if (updateError) {
          errorCount++;
          console.error('❌ [updateDailyROASForProduct] Error updating daily_roas entry:', {
            entryId: entry.id,
            error: updateError,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint
          });
        } else {
          successCount++;
          console.log('✅ [updateDailyROASForProduct] Entry updated successfully:', {
            entryId: entry.id,
            cog: updatedEntry?.cog,
            margin_euros: updatedEntry?.margin_euros,
            margin_percentage: updatedEntry?.margin_percentage,
            roas: updatedEntry?.roas
          });
        }
      }
      
      console.log(`✅ [updateDailyROASForProduct] Daily ROAS update completed: ${successCount} successful, ${errorCount} errors`);
    } catch (err) {
      console.error('❌ [updateDailyROASForProduct] Exception caught:', {
        error: err,
        productName,
        newCostPrice,
        sellingPrice,
        stack: err instanceof Error ? err.stack : undefined
      });
    }
  };

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    
    switch (preset) {
      case 'today':
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        setDateRange({ from: todayStart, to: todayEnd });
        break;
      case 'yesterday':
        const yesterdayStart = new Date(now);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(now);
        yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
        yesterdayEnd.setHours(23, 59, 59, 999);
        setDateRange({ from: yesterdayStart, to: yesterdayEnd });
        break;
      case 'last_7d':
        const last7Start = new Date(now);
        last7Start.setDate(last7Start.getDate() - 7);
        last7Start.setHours(0, 0, 0, 0);
        setDateRange({ from: last7Start, to: now });
        break;
      case 'last_14d':
        const last14Start = new Date(now);
        last14Start.setDate(last14Start.getDate() - 14);
        last14Start.setHours(0, 0, 0, 0);
        setDateRange({ from: last14Start, to: now });
        break;
      case 'last_30d':
        const last30Start = new Date(now);
        last30Start.setDate(last30Start.getDate() - 30);
        last30Start.setHours(0, 0, 0, 0);
        setDateRange({ from: last30Start, to: now });
        break;
      case 'last_90d':
        const last90Start = new Date(now);
        last90Start.setDate(last90Start.getDate() - 90);
        last90Start.setHours(0, 0, 0, 0);
        setDateRange({ from: last90Start, to: now });
        break;
      case 'all':
        setDateRange({ from: undefined, to: undefined });
        break;
      default:
        break;
    }
  };

  const handleExportSoldProducts = () => {
    // Filter products that have sales
    const soldProducts = products.filter(p => (p.quantity_sold || 0) > 0);
    
    if (soldProducts.length === 0) {
      toast({
        title: t('products.noProductsSold'),
        description: t('products.noProductsToExport'),
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = [
      t('products.exportHeaders.productName'),
      t('products.exportHeaders.sku'),
      t('products.exportHeaders.costPrice'),
      t('products.exportHeaders.sellingPrice'),
      t('products.exportHeaders.quantitySold'),
      t('products.exportHeaders.totalRevenue'),
      t('products.exportHeaders.profitMargin'),
      t('products.exportHeaders.createdAt')
    ];
    const rows = soldProducts.map(p => [
      p.product_name,
      p.sku || '-',
      p.cost_price?.toFixed(2) || '0.00',
      p.selling_price?.toFixed(2) || '0.00',
      p.quantity_sold || 0,
      (p.total_revenue || 0).toFixed(2),
      (p.profit_margin || 0).toFixed(2),
      format(new Date(p.created_at), 'dd/MM/yyyy HH:mm')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${t('products.exportFileName')}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: t('products.exportCompleted'),
      description: t('products.exportSuccess', { count: soldProducts.length }),
    });
  };

  if (loading) {
    return <LoadingOverlay message={t('products.loading')} />;
  }

  // Calcular estatísticas com mudanças
  const statsData = [
    {
      label: t('products.totalProducts') || "Total Products",
      value: totalStats.totalProducts,
      change: 5.2,
      icon: Package,
      color: "text-primary"
    },
    {
      label: t('products.totalRevenue') || "Total Revenue",
      value: formatAmount(totalStats.totalRevenue, storeCurrency),
      change: 12.5,
      icon: DollarSign,
      color: "text-emerald-500"
    },
    {
      label: t('products.totalProfit') || "Total Profit",
      value: formatAmount(hasProductsWithoutCost ? 0 : totalStats.totalProfit, storeCurrency),
      change: totalStats.totalProfit > 0 ? 8.3 : -2.1,
      icon: TrendingUp,
      color: totalStats.totalProfit > 0 ? "text-emerald-500" : "text-red-500",
      warning: hasProductsWithoutCost,
      warningMessage: t('products.incompleteCosts')
    },
    {
      label: t('products.avgMargin') || "Avg Margin",
      value: hasProductsWithoutCost ? t('products.incompleteCosts') : `${totalStats.avgMargin.toFixed(1)}%`,
      change: 3.7,
      icon: hasProductsWithoutCost ? AlertTriangle : Activity,
      color: hasProductsWithoutCost ? "text-warning" : "text-blue-500",
      warning: hasProductsWithoutCost
    }
  ];

  return (
    <PageLayout
      title={t('products.title')}
      subtitle={t('products.subtitle')}
      actions={
        <div className="flex items-center gap-2">
          {hasShopifyIntegration && (
            <Button3D
              variant="gradient"
              size="sm"
              onClick={handleSyncShopifyProducts}
              disabled={syncing}
              glow
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? t('products.syncing') : t('products.syncShopify')}
            </Button3D>
          )}
          <Button3D
            variant="glass"
            size="sm"
            onClick={handleExportSoldProducts}
            disabled={products.filter(p => (p.quantity_sold || 0) > 0).length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('products.exportSold')}
          </Button3D>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats Cards - Modern Design */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {statsData.map((stat, index) => {
              const Icon = stat.icon;
              const isPositive = stat.change > 0;
              const isWarning = stat.warning;
              const isProfitStat = stat.label === (t('products.totalProfit') || "Total Profit");
              
              // Define gradient backgrounds for each stat
              const gradients = [
                'bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-transparent',
                'bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-transparent',
                'bg-gradient-to-br from-purple-500/10 via-purple-400/5 to-transparent',
                'bg-gradient-to-br from-orange-500/10 via-orange-400/5 to-transparent',
              ];
              
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <Card className={`
                    relative overflow-hidden p-6 
                    border border-border/50 
                    backdrop-blur-sm
                    ${gradients[index]}
                    hover:border-primary/40 hover:shadow-lg
                    transition-all duration-300
                    group
                  `}>
                    {/* Background Glow Effect */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />
                    
                    {/* Warning Triangle for Profit */}
                    {isWarning && isProfitStat && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <TooltipProvider>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <div className="cursor-help relative">
                                <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-pulse" />
                                <AlertTriangle className="w-16 h-16 text-destructive relative z-10 drop-shadow-lg" strokeWidth={2} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-destructive text-destructive-foreground border-destructive max-w-xs">
                              <p className="font-semibold">{stat.warningMessage}</p>
                              <p className="text-xs mt-1 opacity-90">{t('dashboard.clickToAddQuotes')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                    
                    {/* Icon and Change Badge */}
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div className={`
                        w-12 h-12 rounded-2xl 
                        flex items-center justify-center
                        ${stat.color}
                        bg-gradient-to-br from-white/10 to-white/5
                        shadow-lg
                        group-hover:scale-110 group-hover:rotate-3
                        transition-all duration-300
                      `}>
                        <Icon className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                      
                      {!isWarning && (
                        <div className={`
                          flex items-center gap-1.5 
                          px-2.5 py-1 rounded-full
                          text-xs font-semibold
                          ${isPositive 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }
                        `}>
                          {isPositive ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                          {Math.abs(stat.change)}%
                        </div>
                      )}
                    </div>
                    
                    {/* Value and Label */}
                    <div className="space-y-1 relative z-10">
                      <h3 className={`
                        text-2xl md:text-3xl font-bold 
                        ${isWarning && isProfitStat 
                          ? 'text-muted-foreground/60' 
                          : 'bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent'
                        }
                      `}>
                        {stat.value}
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium">
                        {stat.label}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Supplier Quotation Section */}
        {user && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <Card3D className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {t("supplierQuotes.title")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("supplierQuotes.description")}
                  </p>
                </div>
                <Button onClick={() => setQuoteModalOpen(true)}>
                  {t("supplierQuotes.requestQuote")}
                </Button>
              </div>
              <SupplierQuoteList userId={user.id} refreshTrigger={quoteRefreshTrigger} />
            </Card3D>

            <SupplierQuoteModal
              open={quoteModalOpen}
              onOpenChange={setQuoteModalOpen}
              userId={user.id}
              selectedStore={selectedStore}
              onSuccess={() => setQuoteRefreshTrigger((prev) => prev + 1)}
            />
          </motion.section>
        )}

        {/* Search and Filters - Simplified */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('products.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {/* Store Selector */}
              <div className="min-w-[160px]">
                <StoreSelector value={selectedStore} onChange={setSelectedStore} />
              </div>
              
              {/* Store Currency Selector - only show when a specific store is selected */}
              {selectedStore !== "all" && (
                <StoreCurrencySelector 
                  integrationId={selectedStore}
                  currentCurrency={storeCurrency}
                  onUpdate={() => {
                    if (user) fetchProducts(user.id, true);
                  }}
                />
              )}

              {/* Date Preset */}
              <Select value={datePreset} onValueChange={handleDatePresetChange}>
                <SelectTrigger className="w-[140px] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('products.allPeriods')}</SelectItem>
                  <SelectItem value="today">{t('products.today')}</SelectItem>
                  <SelectItem value="yesterday">{t('products.yesterday')}</SelectItem>
                  <SelectItem value="last_7d">{t('products.last7Days')}</SelectItem>
                  <SelectItem value="last_14d">{t('products.last14Days')}</SelectItem>
                  <SelectItem value="last_30d">{t('products.last30Days')}</SelectItem>
                  <SelectItem value="last_90d">{t('products.last90Days')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Picker */}
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 px-3">
                    <Calendar className="w-4 h-4 mr-2" />
                    {dateRange.from && dateRange.to ? (
                      `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")}`
                    ) : (
                      t('products.customize')
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range) {
                        setDateRange({ from: range.from, to: range.to });
                        setDatePreset("custom");
                      }
                    }}
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              {/* Filter: Only Without Cost */}
              <div className="flex items-center gap-2 h-10 px-3 border border-border rounded-md bg-card">
                <Switch
                  id="filter-without-cost"
                  checked={showOnlyWithoutCost}
                  onCheckedChange={setShowOnlyWithoutCost}
                />
                <Label 
                  htmlFor="filter-without-cost" 
                  className="text-sm cursor-pointer flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  {t('products.withoutCost')}
                </Label>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Products Grid */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {filteredProducts.length === 0 ? (
            <Card3D intensity="low" className="p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <Package className="w-12 h-12 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    {products.length === 0 ? t('products.noProductsSold') : t('products.noProducts')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {products.length === 0
                      ? hasShopifyIntegration 
                        ? t('products.syncSalesToSeeProducts')
                        : t('products.connectShopifyToStart')
                      : t('products.adjustSearch')}
                  </p>
                  {hasShopifyIntegration && products.length === 0 && (
                    <Button3D
                      variant="gradient"
                      size="sm"
                      onClick={handleSyncShopifyProducts}
                      disabled={syncing}
                      glow
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? t('products.syncingSales') : t('products.syncShopifySales')}
                    </Button3D>
                  )}
                </div>
              </div>
            </Card3D>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + index * 0.03 }}
                >
                  <Collapsible
                    open={expandedProducts.has(product.id)}
                    onOpenChange={() => toggleProduct(product.id)}
                  >
                    <Card3D intensity="low" className="p-5 group hover:border-primary/30 transition-all">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-12 h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-colors flex-shrink-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.product_name}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        // Suppress console error and show fallback icon
                        e.preventDefault();
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl"><svg class="w-8 h-8 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg></div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-primary/50" />
                    </div>
                  )}
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <h3 className="text-base font-semibold line-clamp-2 mb-1">{product.product_name}</h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xl font-bold text-primary">
                                  {product.quantity_sold}x
                                </span>
                                {product.shopify_product_id && (
                                  <Badge variant="outline" className="text-xs">
                                    <ShoppingBag className="w-3 h-3 mr-1" />
                                    Shopify
                                  </Badge>
                                )}
                                {!product.cost_price && (
                                  <Badge variant="destructive" className="text-xs animate-pulse">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    {t('products.noCostPrice')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronDown 
                            className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${
                              expandedProducts.has(product.id) ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="space-y-3">
                        {product.shopify_product_id && product.integrations?.metadata?.myshopify_domain && (
                          <a 
                            href={`https://${product.integrations.metadata.myshopify_domain}/admin/products/${product.shopify_product_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {t('products.viewInShopify')}
                            <Eye className="w-3 h-3" />
                          </a>
                        )}

                        <div className="space-y-2.5 p-3 rounded-lg bg-background/30 border border-border/50">
                          {/* Cotação (Supplier Cost) - Editable */}
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-muted-foreground">{t('products.supplierQuote')}</span>
                            {editingCost === product.id ? (
                              <div className="flex items-center gap-1.5">
                                <div className="relative flex items-center">
                                  <span className="absolute left-2.5 text-sm text-muted-foreground pointer-events-none">
                                    {selectedCurrency.symbol}
                                  </span>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={tempCostPrice}
                                    onChange={(e) => {
                                      // Allow only numbers and decimal point
                                      const value = e.target.value.replace(/[^0-9.]/g, '');
                                      // Allow only one decimal point
                                      const parts = value.split('.');
                                      if (parts.length > 2) {
                                        return;
                                      }
                                      // Limit decimal places to 2
                                      if (parts[1] && parts[1].length > 2) {
                                        return;
                                      }
                                      setTempCostPrice(value);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveCost(product.id);
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        handleCancelEditCost();
                                      }
                                    }}
                                    className="w-28 h-9 pl-7 pr-2.5 text-sm font-semibold bg-background border-2 border-primary/40 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="0.00"
                                    autoFocus
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-9 w-9 p-0 hover:bg-emerald-500/10 hover:text-emerald-600 rounded-lg transition-colors"
                                  onClick={() => handleSaveCost(product.id)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-9 w-9 p-0 hover:bg-red-500/10 hover:text-red-600 rounded-lg transition-colors"
                                  onClick={handleCancelEditCost}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-base font-semibold text-foreground">
                                  {product.cost_price !== null && product.cost_price !== 0 
                                    ? formatAmount(product.cost_price, storeCurrency)
                                    : <span className="text-muted-foreground italic">Não definido</span>
                                  }
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                                  onClick={() => handleEditCost(product.id, product.cost_price)}
                                  title="Editar custo"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                {(!product.cost_price || product.cost_price === 0) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5 text-xs border-warning/40 text-warning hover:bg-warning/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setQuoteModalOpen(true);
                                    }}
                                    title="Solicitar cotação ao fornecedor"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    Cotação
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t('products.totalRevenue')}</span>
                            <span className="text-lg font-bold text-green-600">
                              {formatAmount(product.total_revenue || 0, storeCurrency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t('products.avgPrice')}</span>
                            <span className="font-semibold">
                              {formatAmount(product.selling_price || 0, storeCurrency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t('products.margin')}</span>
                            <Badge
                              className={
                                (product.profit_margin || 0) > 40
                                  ? "bg-success/20 text-success border-success/30"
                                  : "bg-warning/20 text-warning border-warning/30"
                              }
                            >
                              {product.profit_margin?.toFixed(1) || 0}%
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-sm text-muted-foreground">{t('products.profit')}</span>
                            {!product.cost_price || product.cost_price === 0 ? (
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-warning" />
                                <span className="text-sm text-warning italic">{t('products.needsQuote')}</span>
                              </div>
                            ) : (
                              <span className={`text-lg font-bold ${calculateProfit(product) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatAmount(calculateProfit(product), storeCurrency)}
                              </span>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card3D>
                  </Collapsible>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </PageLayout>
  );
};

export default Products;
