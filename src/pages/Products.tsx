import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LoadingOverlay } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { Search, Package, DollarSign, TrendingUp, ShoppingBag, RefreshCw, ChevronDown, Edit2, Check, X, Calendar, Download } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { StoreSelector } from "@/components/StoreSelector";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays, isWithinInterval } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      fetchProducts(user.id, true);
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
            setProducts((prev) => [payload.new as Product, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setProducts((prev) => {
              const updated = prev.filter((p) => p.id !== payload.new.id);
              return [payload.new as Product, ...updated]; // Move to top
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
  }, [user]);

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
    // Clear cache if force refresh
    if (forceRefresh) {
      setProducts([]);
    }

    let query = supabase
      .from("products")
      .select("*")
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
    } else {
      // Remove duplicates based on shopify_product_id (keep most recent)
      const uniqueProducts = (data || []).reduce((acc, product) => {
        const existing = acc.find(p => 
          p.shopify_product_id && 
          p.shopify_product_id === product.shopify_product_id
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
        
        return acc;
      }, [] as Product[]);
      
      setProducts(uniqueProducts);
    }
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
      
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      // Sort by updated_at descending (most recent first)
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    });

  const calculateProfit = (product: Product) => {
    const revenue = product.total_revenue || 0;
    const cost = (product.cost_price || 0) * (product.quantity_sold || 0);
    return revenue - cost;
  };

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
    setTempCostPrice(currentCost?.toString() || "0");
  };

  const handleCancelEditCost = () => {
    setEditingCost(null);
    setTempCostPrice("");
  };

  const handleSaveCost = async (productId: string) => {
    if (!user) return;
    
    const costValue = parseFloat(tempCostPrice);
    
    // Validate input
    if (isNaN(costValue) || costValue < 0) {
      toast({
        title: `❌ ${t("settings.invalidValue")}`,
        description: t("settings.enterValidNumber"),
        variant: "destructive",
      });
      return;
    }
    
    const product = products.find(p => p.id === productId);
    
    if (!product) return;

    // Calculate new profit margin
    const sellingPrice = product.selling_price || 0;
    const newMargin = sellingPrice > 0 ? ((sellingPrice - costValue) / sellingPrice) * 100 : 0;

    try {
      // Update product
      const { error } = await supabase
        .from("products")
        .update({ 
          cost_price: costValue,
          profit_margin: newMargin
        })
        .eq("id", productId);

      if (error) {
        toast({
          title: t("settings.errorUpdatingQuote"),
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Update Daily ROAS entries
      await updateDailyROASForProduct(product.product_name, costValue, sellingPrice);

      toast({
        title: `✅ ${t("settings.quoteUpdated")}`,
        description: t("settings.quoteUpdatedDesc"),
      });
      setEditingCost(null);
      setTempCostPrice("");
      await fetchProducts(user.id, true);
    } catch (err) {
      toast({
        title: t("common.error"),
        description: t("settings.errorUpdatingQuoteDesc"),
        variant: "destructive",
      });
    }
  };

  const updateDailyROASForProduct = async (productName: string, newCostPrice: number, sellingPrice: number) => {
    try {
      console.log('♻️ Updating Daily ROAS for product:', productName);
      
      // Fetch all daily_roas entries
      const { data: dailyData, error: fetchError } = await supabase
        .from('daily_roas')
        .select('*')
        .eq('user_id', user!.id);
      
      if (fetchError) {
        console.error('❌ Error fetching daily data:', fetchError);
        return;
      }
      
      // Find matching entries
      const cleanProductName = productName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const affectedEntries = (dailyData || []).filter(entry => {
        const cleanCampaign = entry.campaign_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanCampaign.includes(cleanProductName) || cleanProductName.includes(cleanCampaign);
      });
      
      console.log(`🎯 Found ${affectedEntries.length} Daily ROAS entries to update`);
      
      // Update each entry
      for (const entry of affectedEntries) {
        const unitsSold = entry.purchases || entry.units_sold || 0;
        const newCOG = newCostPrice * unitsSold;
        const totalRevenue = sellingPrice * unitsSold;
        const totalSpent = entry.total_spent || 0;
        const newMarginEuros = totalRevenue - newCOG - totalSpent;
        const newMarginPercentage = totalRevenue > 0 ? (newMarginEuros / totalRevenue) * 100 : 0;
        const newROAS = totalSpent > 0 ? totalRevenue / totalSpent : 0;
        
        console.log(`♻️ Updating ${entry.campaign_name}: COG ${entry.cog} → ${newCOG}`);
        
        const { error: updateError } = await supabase
          .from('daily_roas')
          .update({
            cog: newCOG,
            margin_euros: newMarginEuros,
            margin_percentage: newMarginPercentage,
            roas: newROAS,
            product_price: sellingPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.id);
        
        if (updateError) {
          console.error('❌ Error updating daily_roas:', updateError);
        }
      }
      
      console.log('✅ Daily ROAS updated successfully');
    } catch (err) {
      console.error('❌ Error in updateDailyROASForProduct:', err);
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

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex bg-background relative">
        <div className="fixed inset-0 bg-gradient-mesh opacity-30 pointer-events-none" />
        <AppSidebar />

        <SidebarInset className="flex-1 transition-all duration-300">
          <main className="relative min-h-screen p-6 space-y-6">
            {/* Hero Section with integrated controls */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-10 w-10 rounded-xl glass-card border-2 hover:border-primary/40 transition-all flex items-center justify-center" />
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {t('products.title')}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">{t('products.subtitle')}</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <Input
                  placeholder={t('products.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 glass-card border-2 text-base"
                />
              </div>

              {/* Filters Bar */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Store Selector */}
                <div className="min-w-[200px]">
                  <StoreSelector value={selectedStore} onChange={setSelectedStore} />
                </div>

                {/* Date Preset */}
                <Select value={datePreset} onValueChange={handleDatePresetChange}>
                  <SelectTrigger className="w-[200px] h-12 glass-card border-2 font-medium">
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
                    <Button className="h-12 px-6 glass-card border-2 hover:border-primary/40 transition-all font-medium">
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

                <div className="flex-1" />

                {/* Export Button - Right Side */}
                <Button
                  onClick={handleExportSoldProducts}
                  className="h-12 px-6 glass-card border-2 hover:border-primary/40 transition-all font-medium"
                  disabled={products.filter(p => (p.quantity_sold || 0) > 0).length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('products.exportSold')}
                </Button>

                {/* Sync Button */}
                {hasShopifyIntegration && (
                  <Button
                    onClick={handleSyncShopifyProducts}
                    disabled={syncing}
                    className="btn-gradient h-12 px-6 font-medium"
                  >
                    <RefreshCw className={`w-5 h-5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? t('products.syncing') : t('products.syncShopify')}
                  </Button>
                )}
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <Card className="p-12 glass-card rounded-3xl border-2 border-border/50 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Package className="w-16 h-16 text-muted-foreground" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {products.length === 0 ? t('products.noProductsSold') : t('products.noProducts')}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {products.length === 0
                        ? hasShopifyIntegration 
                          ? t('products.syncSalesToSeeProducts')
                          : t('products.connectShopifyToStart')
                        : t('products.adjustSearch')}
                    </p>
                    {hasShopifyIntegration && products.length === 0 && (
                      <Button
                        onClick={handleSyncShopifyProducts}
                        disabled={syncing}
                        className="btn-gradient"
                      >
                        <RefreshCw className={`w-5 h-5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? t('products.syncingSales') : t('products.syncShopifySales')}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <Collapsible
                    key={product.id}
                    open={expandedProducts.has(product.id)}
                    onOpenChange={() => toggleProduct(product.id)}
                  >
                    <Card className="p-6 glass-card rounded-3xl border-2 border-border/50 hover:border-primary/40 hover:shadow-glow transition-all duration-300 group">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.product_name}
                      className="w-full h-full object-cover rounded-xl"
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
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
                      <Package className="w-12 h-12 text-primary/40" />
                    </div>
                  )}
                            </div>
                            <div className="text-left">
                              <h3 className="text-lg font-bold line-clamp-1">{product.product_name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-2xl font-bold text-primary">
                                  {product.quantity_sold}x
                                </span>
                                {product.shopify_product_id && (
                                  <Badge className="bg-[#96bf48]/20 text-[#96bf48] border-[#96bf48]/30">
                                    <ShoppingBag className="w-3 h-3 mr-1" />
                                    Shopify
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronDown 
                            className={`w-5 h-5 text-muted-foreground transition-transform ${
                              expandedProducts.has(product.id) ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="space-y-3">
                        {product.sku && (
                          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                        )}

                        <div className="space-y-3 p-4 rounded-lg bg-background/50 border border-border/30">
                          {/* Cotação (Supplier Cost) - Editable */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-muted-foreground">{t('products.supplierQuote')}</span>
                            {editingCost === product.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={tempCostPrice}
                                  onChange={(e) => setTempCostPrice(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveCost(product.id);
                                    } else if (e.key === 'Escape') {
                                      handleCancelEditCost();
                                    }
                                  }}
                                  className="w-24 h-8 text-sm bg-background/80 border-primary/30"
                                  placeholder="0.00"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleSaveCost(product.id)}
                                >
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={handleCancelEditCost}
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  €{product.cost_price?.toFixed(2) || "0.00"}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 hover:bg-primary/10"
                                  onClick={() => handleEditCost(product.id, product.cost_price)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t('products.totalRevenue')}</span>
                            <span className="text-lg font-bold text-green-600">
                              €{product.total_revenue?.toFixed(2) || "0.00"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t('products.avgPrice')}</span>
                            <span className="font-semibold">
                              €{product.selling_price?.toFixed(2) || "0.00"}
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
                          <div className="flex items-center justify-between pt-2 border-t border-border/30">
                            <span className="text-sm text-muted-foreground">{t('products.profit')}</span>
                            <span className={`text-lg font-bold ${calculateProfit(product) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              €{calculateProfit(product).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                  ))}
                </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Products;
