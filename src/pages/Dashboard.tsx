import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useLanguage } from "@/contexts/LanguageContext";
import { LoadingOverlay } from "@/components/ui/loading-spinner";
import { useSubscriptionState } from "@/hooks/useSubscriptionState";
import { SubscriptionStateBanner } from "@/components/SubscriptionStateBanner";
import { ReadOnlyOverlay } from "@/components/ReadOnlyOverlay";
import { PageLayout } from "@/components/PageLayout";
import { CurrencySelector } from "@/components/CurrencySelector";
import { useCurrency } from "@/contexts/CurrencyContext";
import { SetupProgress } from "@/components/dashboard/SetupProgress";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { CryptoChart } from "@/components/dashboard/CryptoChart";
import { TimeframeSelector, type TimeframeValue } from "@/components/dashboard/TimeframeSelector";
import { Card3D } from "@/components/ui/Card3D";
import { motion } from "framer-motion";
import { 
  Target, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  ArrowRight, 
  Store,
  Facebook, 
  RefreshCw,
  Link as LinkIcon
} from "lucide-react";
import { format } from "date-fns";
import { Button3D } from "@/components/ui/Button3D";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Integration {
  id: string;
  integration_type: string;
  metadata?: {
    shop_name?: string;
    shop_domain?: string;
    store_name?: string;
    myshopify_domain?: string;
    connected_domain?: string;
  };
}

interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
}

interface Campaign {
  id: string;
  campaign_name: string | null;
  platform: string | null;
  status: string;
  total_spent: number | null;
  total_revenue: number | null;
  roas: number | null;
  cpc: number | null;
  conversions: number | null;
  updated_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { toast } = useToast();
  const { stateInfo, loading: stateLoading } = useSubscriptionState();
  const { formatAmount } = useCurrency();
  const [storeCurrency, setStoreCurrency] = useState<string>('EUR');
  
  // Filters
  const [timeframe, setTimeframe] = useState<TimeframeValue | undefined>(undefined);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Data
  const [shopifyIntegrations, setShopifyIntegrations] = useState<Integration[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [hasFacebookIntegration, setHasFacebookIntegration] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [autoSynced, setAutoSynced] = useState(false);
  const [matchedPairs, setMatchedPairs] = useState<Map<string, string>>(new Map());

  // Matching automático: algoritmo que associa lojas Shopify a contas de anúncios por similaridade de nome
  const findBestMatch = useCallback((storeName: string, accounts: AdAccount[]): string | null => {
    if (!storeName || accounts.length === 0) return null;

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const storeNormalized = normalize(storeName);
    const storeChars = storeNormalized.split('');

    let bestMatch: { id: string; score: number; name: string } | null = null;

    for (const account of accounts) {
      const accountName = account.name || account.account_id;
      const accountNormalized = normalize(accountName);
      
      // Score baseado em:
      // 1. Match exato (normalizado)
      if (storeNormalized === accountNormalized) {
        return account.id;
      }

      // 2. Contém o nome da loja
      if (accountNormalized.includes(storeNormalized) || storeNormalized.includes(accountNormalized)) {
        const score = Math.min(storeNormalized.length, accountNormalized.length) / Math.max(storeNormalized.length, accountNormalized.length);
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { id: account.id, score, name: accountName };
        }
        continue;
      }

      // 3. Similaridade de caracteres (Jaccard-like)
      const accountChars = accountNormalized.split('');
      const commonChars = storeChars.filter(char => accountChars.includes(char)).length;
      const totalUniqueChars = new Set([...storeChars, ...accountChars]).size;
      const similarity = totalUniqueChars > 0 ? commonChars / totalUniqueChars : 0;

      if (similarity > 0.3) {
        if (!bestMatch || similarity > bestMatch.score) {
          bestMatch = { id: account.id, score: similarity, name: accountName };
        }
      }
    }

    return bestMatch?.id || null;
  }, []);

  // Auto-match stores to ad accounts
  useEffect(() => {
    if (shopifyIntegrations.length === 0 || adAccounts.length === 0) return;

    const pairs = new Map<string, string>();
    
    shopifyIntegrations.forEach(store => {
      const storeName = store.metadata?.shop_name || 
                       store.metadata?.shop_domain || 
                       store.metadata?.store_name ||
                       store.metadata?.myshopify_domain ||
                       store.metadata?.connected_domain ||
                       '';
      
      if (storeName) {
        const matchedAccountId = findBestMatch(storeName, adAccounts);
        if (matchedAccountId) {
          pairs.set(store.id, matchedAccountId);
        }
      }
    });

    setMatchedPairs(pairs);
    
    // Auto-select matched pairs
    if (pairs.size > 0 && selectedStore === "all" && selectedAdAccount === "all") {
      const firstPair = Array.from(pairs.entries())[0];
      setSelectedStore(firstPair[0]);
      setSelectedAdAccount(firstPair[1]);
    }
  }, [shopifyIntegrations, adAccounts, findBestMatch, selectedStore, selectedAdAccount]);

  // Fetch Integrations
  const fetchIntegrations = useCallback(async (userId: string) => {
    try {
      const { data: integrations, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', userId)
        .in('integration_type', ['shopify', 'facebook_ads']);

      if (error) {
        console.error('Error fetching integrations:', error);
        return;
      }

      const shopify = integrations?.filter(i => i.integration_type === 'shopify') || [];
      const facebook = integrations?.filter(i => i.integration_type === 'facebook_ads') || [];

      setShopifyIntegrations(shopify as any);
      setHasFacebookIntegration(facebook.length > 0);

      if (facebook.length > 0) {
        await fetchAdAccounts();
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  }, []);

  // Fetch Ad Accounts
  const fetchAdAccounts = useCallback(async () => {
    try {
      // Try cached ad accounts from integrations.metadata first
      if (user) {
        const { data: integ } = await supabase
          .from('integrations')
          .select('metadata')
          .eq('user_id', user.id)
          .eq('integration_type', 'facebook_ads')
          .maybeSingle();

        const cached = integ?.metadata as any;
        const cachedAccounts = cached?.ad_accounts as AdAccount[] | undefined;

        if (cachedAccounts && cachedAccounts.length > 0) {
          setAdAccounts(cachedAccounts);
          return;
        }
      }

      // Fallback: call edge function
      const { data, error } = await supabase.functions.invoke('facebook-campaigns', {
        body: { action: 'listAdAccounts' }
      });

      if (error) {
        console.error("Error fetching ad accounts:", error);
        return;
      }
      
      if (data?.adAccounts && Array.isArray(data.adAccounts)) {
        setAdAccounts(data.adAccounts);
      }
    } catch (error) {
      console.error("Error fetching ad accounts:", error);
    }
  }, [user]);

  // Auth & Setup
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else if (session.user.id) {
        fetchIntegrations(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else if (session?.user?.id) {
        fetchIntegrations(session.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, fetchIntegrations]);

  // Auto-sync Facebook campaigns when integration detected
  useEffect(() => {
    if (!user?.id || autoSynced || !hasFacebookIntegration) return;

    const checkAndSync = async () => {
      try {
        const { data: integration } = await supabase
          .from('integrations')
          .select('id')
          .eq('user_id', user.id)
          .eq('integration_type', 'facebook_ads')
          .maybeSingle();

        if (integration) {
          try {
            await supabase.functions.invoke('sync-facebook-campaigns', {
              body: { datePreset: 'last_30d' },
            });
            setAutoSynced(true);
          } catch (err) {
            // Silent fail - user can manually sync if needed
            console.error('Auto-sync failed:', err);
          }
        }
      } catch (error) {
        console.error('Error checking integration:', error);
      }
    };

    checkAndSync();
  }, [user?.id, autoSynced, hasFacebookIntegration]);

  // Fetch Campaigns - Aggregate from daily_roas for accurate data
  const fetchCampaigns = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Get daily_roas data aggregated by campaign
      let dailyRoasQuery = supabase
        .from('daily_roas')
        .select('campaign_id, campaign_name, total_spent, units_sold, product_price, cog, purchases, cpc, date')
        .eq('user_id', user.id);

      if (timeframe?.dateFrom) {
        const df = new Date(timeframe.dateFrom);
        df.setHours(0, 0, 0, 0);
        const dateFromStr = df.toISOString().split('T')[0];
        dailyRoasQuery = dailyRoasQuery.gte('date', dateFromStr);
      }
      if (timeframe?.dateTo) {
        const dt = new Date(timeframe.dateTo);
        dt.setHours(23, 59, 59, 999);
        const dateToStr = dt.toISOString().split('T')[0];
        dailyRoasQuery = dailyRoasQuery.lte('date', dateToStr);
      }

      // Apply store filter if selected
      if (selectedStore !== "all") {
        // Filter by integration_id in products table, then match to campaigns
        const { data: products } = await supabase
          .from('products')
          .select('shopify_product_id, sku')
          .eq('integration_id', selectedStore)
          .eq('user_id', user.id);

        if (products && products.length > 0) {
          // This is a simplified filter - in production you'd need to match products to campaigns
          // For now, we'll just apply the date filter
        }
      }

      const { data: dailyRoasData, error: dailyRoasError } = await dailyRoasQuery;
      
      if (dailyRoasError) {
        console.error('Error fetching daily_roas for campaigns:', dailyRoasError);
        setCampaigns([]);
        return;
      }

      // Aggregate by campaign_id
      const campaignMap = new Map<string, {
        campaign_id: string;
        campaign_name: string;
        total_spent: number;
        total_revenue: number;
        total_conversions: number;
        total_cpc: number;
        cpc_count: number;
      }>();

      (dailyRoasData || []).forEach((entry: any) => {
        const campaignId = entry.campaign_id;
        const existing = campaignMap.get(campaignId) || {
          campaign_id: campaignId,
          campaign_name: entry.campaign_name || '',
          total_spent: 0,
          total_revenue: 0,
          total_conversions: 0,
          total_cpc: 0,
          cpc_count: 0,
        };

        const spent = Number(entry.total_spent) || 0;
        const unitsSold = Number(entry.units_sold) || 0;
        const productPrice = Number(entry.product_price) || 0;
        const revenue = unitsSold * productPrice;
        const conversions = Number(entry.purchases) || 0;
        const cpc = Number(entry.cpc) || 0;

        existing.total_spent += spent;
        existing.total_revenue += revenue;
        existing.total_conversions += conversions;
        if (cpc > 0) {
          existing.total_cpc += cpc;
          existing.cpc_count += 1;
        }

        campaignMap.set(campaignId, existing);
      });

      // Get campaign status from campaigns table
      const { data: campaignsStatus } = await supabase
        .from('campaigns')
        .select('id, campaign_name, platform, status')
        .eq('user_id', user.id)
        .eq('status', 'active');

      // Combine aggregated data with status
      const aggregatedCampaigns: Campaign[] = Array.from(campaignMap.values()).map(agg => {
        const campaignStatus = campaignsStatus?.find(c => c.campaign_name === agg.campaign_name);
        const avgCpc = agg.cpc_count > 0 ? agg.total_cpc / agg.cpc_count : 0;
        const roas = agg.total_spent > 0 ? agg.total_revenue / agg.total_spent : 0;

        return {
          id: agg.campaign_id,
          campaign_name: agg.campaign_name,
          platform: campaignStatus?.platform || 'facebook',
          status: campaignStatus?.status || 'active',
          total_spent: agg.total_spent,
          total_revenue: agg.total_revenue,
          roas: roas,
          cpc: avgCpc,
          conversions: agg.total_conversions,
          updated_at: new Date().toISOString(),
        };
      });

      setCampaigns(aggregatedCampaigns);
    } catch (error) {
      console.error('Error in fetchCampaigns:', error);
      setCampaigns([]);
    }
  }, [user?.id, timeframe?.dateFrom?.getTime(), timeframe?.dateTo?.getTime(), selectedStore]);

  useEffect(() => {
    if (user?.id) {
      fetchCampaigns();
    }
  }, [user?.id, fetchCampaigns]);

  // Dashboard Stats
  const stats = useDashboardStats(user?.id, timeframe ? {
    dateFrom: timeframe.dateFrom,
    dateTo: timeframe.dateTo,
    storeId: selectedStore !== "all" ? selectedStore : undefined,
    adAccountId: selectedAdAccount !== "all" ? selectedAdAccount : undefined,
    refreshKey,
  } : { 
    storeId: selectedStore !== "all" ? selectedStore : undefined,
    adAccountId: selectedAdAccount !== "all" ? selectedAdAccount : undefined,
    refreshKey 
  });

  // Update store currency when stats change
  useEffect(() => {
    if (stats?.storeCurrency) {
      setStoreCurrency(stats.storeCurrency);
      console.log('💱 Store currency updated:', stats.storeCurrency);
    }
  }, [stats?.storeCurrency]);

  // Chart Data
  const chartData = useMemo(() => {
    const dailyData = stats?.dailyRoasData || [];
    
    if (!dailyData || dailyData.length === 0) {
      return {
        revenueChartData: [],
        profitChartData: [],
        spendChartData: [],
      };
    }

    const dataByDate = new Map<string, {
      total_spent: number;
      units_sold: number;
      product_price: number;
      cog: number;
      purchases: number;
    }>();
    
    dailyData.forEach((item: any) => {
      if (!item || !item.date) return;
      
      const dateKey = typeof item.date === 'string' 
        ? item.date.split('T')[0] 
        : String(item.date);
      
      if (!dateKey) return;
      
      const existing = dataByDate.get(dateKey) || {
        total_spent: 0,
        units_sold: 0,
        product_price: 0,
        cog: 0,
        purchases: 0,
      };
      
      const itemSpent = Number(item.total_spent) || 0;
      const itemUnitsSold = Number(item.units_sold) || 0;
      const itemProductPrice = Number(item.product_price) || 0;
      const itemCog = Number(item.cog) || 0;
      const itemPurchases = Number(item.purchases) || itemUnitsSold || 0;
      
      const totalUnits = existing.units_sold + itemUnitsSold;
      const avgProductPrice = totalUnits > 0 
        ? ((existing.product_price * existing.units_sold) + (itemProductPrice * itemUnitsSold)) / totalUnits
        : (itemProductPrice || existing.product_price || 0);
      const avgCog = totalUnits > 0
        ? ((existing.cog * existing.units_sold) + (itemCog * itemUnitsSold)) / totalUnits
        : (itemCog || existing.cog || 0);
      
      dataByDate.set(dateKey, {
        total_spent: existing.total_spent + itemSpent,
        units_sold: existing.units_sold + itemUnitsSold,
        product_price: avgProductPrice,
        cog: avgCog,
        purchases: existing.purchases + itemPurchases,
      });
    });
    
    const sortedData = Array.from(dataByDate.entries())
      .map(([date, values]) => ({
        date,
        ...values,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return isNaN(dateA) || isNaN(dateB) ? 0 : dateA - dateB;
      });
    
    return {
      revenueChartData: sortedData.map((item) => {
        try {
          return {
            date: format(new Date(item.date), 'dd/MM'),
            value: (item.units_sold || 0) * (item.product_price || 0),
          };
        } catch {
          return { date: item.date, value: 0 };
        }
      }).filter(item => item.value !== undefined),
      profitChartData: sortedData.map((item) => {
        try {
          const revenue = (item.units_sold || 0) * (item.product_price || 0);
          const cog = Number(item.cog) || 0;
          const unitsSold = Number(item.units_sold) || 0;
          
          // Handle cog: might be total or per-unit
          let totalCog = cog;
          if (cog > 0 && unitsSold > 0 && revenue > 0 && cog < revenue * 0.1) {
            // Likely per-unit, multiply by units_sold
            totalCog = cog * unitsSold;
          }
          
          return {
            date: format(new Date(item.date), 'dd/MM'),
            value: revenue - (item.total_spent || 0) - totalCog,
          };
        } catch {
          return { date: item.date, value: 0 };
        }
      }).filter(item => item.value !== undefined),
      spendChartData: sortedData.map((item) => {
        try {
          return {
            date: format(new Date(item.date), 'dd/MM'),
            value: item.total_spent || 0,
          };
        } catch {
          return { date: item.date, value: 0 };
        }
      }).filter(item => item.value !== undefined),
    };
  }, [stats?.dailyRoasData]);

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return [];
    
    return campaigns.filter(campaign => {
      if (!campaign || campaign.status !== 'active') return false;
      
      const campaignName = campaign.campaign_name?.toLowerCase() || '';
      const searchLower = searchTerm.toLowerCase();
      
      return campaignName.includes(searchLower);
    });
  }, [campaigns, searchTerm]);

  const displayedCampaigns = useMemo(() => {
    if (!filteredCampaigns || filteredCampaigns.length === 0) return [];
    return showAllCampaigns ? filteredCampaigns : filteredCampaigns.slice(0, 5);
  }, [showAllCampaigns, filteredCampaigns]);

  // Handlers
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    fetchCampaigns();
    toast({
      title: t('dashboard.refreshed') || 'Atualizado',
      description: t('dashboard.dataRefreshed') || 'Dados atualizados com sucesso',
    });
  }, [fetchCampaigns, toast, t]);

  if (loading || stateLoading || stats.loading) {
    return <LoadingOverlay message={t('dashboard.loading') || 'Carregando...'} />;
  }

  const { revenueChartData, profitChartData, spendChartData } = chartData;

  return (
    <PageLayout
      title={t('dashboard.title') || 'Dashboard'}
      subtitle={t('dashboard.welcome') || 'Bem-vindo ao seu painel'}
    >
      {stateInfo.showBanner && (
        <SubscriptionStateBanner
          state={stateInfo.state as 'expired' | 'suspended' | 'archived'}
          daysUntilSuspension={stateInfo.daysUntilSuspension}
          daysUntilArchive={stateInfo.daysUntilArchive}
          planName={stateInfo.planName}
        />
      )}
      
      {user && <SetupProgress userId={user.id} />}
      
      {stateInfo.readonly && stateInfo.state === 'expired' && (
        <ReadOnlyOverlay
          planName={stateInfo.planName}
          daysUntilSuspension={stateInfo.daysUntilSuspension}
        />
      )}

      <div className="space-y-4 sm:space-y-5 md:space-y-6">
        {/* Filters Section */}
        <Card3D intensity="low" className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <h2 className="text-base sm:text-lg font-semibold">{t('dashboard.filters') || 'Filtros'}</h2>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CurrencySelector />
                <Button3D
                  variant="glass"
                  size="sm"
                  onClick={handleRefresh}
                  className="gap-1.5 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">{t('dashboard.refresh') || 'Atualizar'}</span>
                  <span className="xs:hidden">Refresh</span>
                </Button3D>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Shopify Store */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2">
                  <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {t('profitSheet.shopifyStore') || 'Loja Shopify'}
                </label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder={t('profitSheet.selectShopify') || 'Selecionar loja'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('storeSelector.allStores') || 'Todas as lojas'}</SelectItem>
                    {shopifyIntegrations.map((integration) => {
                      const matchedAccountId = matchedPairs.get(integration.id);
                      const matchedAccount = matchedAccountId ? adAccounts.find(a => a.id === matchedAccountId) : null;
                      
                      return (
                        <SelectItem key={integration.id} value={integration.id}>
                          <div className="flex items-center gap-2">
                             {integration.metadata?.shop_name ||
                             integration.metadata?.shop_domain ||
                             integration.metadata?.store_name ||
                             `Loja ${integration.id.slice(0, 8)}`}
                            {matchedAccount && (
                              <LinkIcon className="w-3 h-3 text-primary" />
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Facebook Ad Account */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2">
                  <Facebook className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {t('profitSheet.adAccount') || 'Conta de Anúncios'}
                </label>
                {!hasFacebookIntegration ? (
                  <div className="text-xs sm:text-sm text-muted-foreground p-2 sm:p-3 bg-muted/50 rounded-lg">
                    {t('metaDashboard.connectDesc') || 'Conecte o Facebook Ads'}
                  </div>
                ) : adAccounts.length === 0 ? (
                  <div className="text-xs sm:text-sm text-muted-foreground p-2 sm:p-3 bg-muted/50 rounded-lg">
                    {t('common.loading') || 'Carregando...'}
                  </div>
                ) : (
                  <Select value={selectedAdAccount} onValueChange={setSelectedAdAccount}>
                    <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder={t('profitSheet.selectAdAccount') || 'Selecionar conta'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('storeSelector.allStores') || 'Todas as contas'}</SelectItem>
                      {adAccounts.map((account) => {
                        const matchedStoreId = Array.from(matchedPairs.entries()).find(([_, accountId]) => accountId === account.id)?.[0];
                        const matchedStore = matchedStoreId ? shopifyIntegrations.find(s => s.id === matchedStoreId) : null;
                        
                        return (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex items-center gap-2">
                              {account.name || account.account_id}
                              {matchedStore && (
                                <LinkIcon className="w-3 h-3 text-primary" />
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Timeframe */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">
                  {t('dashboard.timeframe') || 'Período'}
                </label>
                <TimeframeSelector
                  value={timeframe}
                  onChange={setTimeframe}
                />
              </div>
            </div>
          </div>
        </Card3D>

        {/* Stats Overview - 8 cards de métricas */}
        {stats && <StatsOverview stats={stats} storeCurrency={storeCurrency} />}

        {/* Charts - 3 gráficos: Receita, Lucro, Gasto */}
        {(revenueChartData.length > 0 || profitChartData.length > 0 || spendChartData.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {revenueChartData.length > 0 && (
              <CryptoChart
                data={revenueChartData}
                title={t('dashboard.dailyRevenue') || 'Receita Diária'}
                color="#4AE9BD"
                showTrend={true}
                storeCurrency={storeCurrency}
              />
            )}
            {profitChartData.length > 0 && (
              <CryptoChart
                data={profitChartData}
                title={t('dashboard.dailyProfit') || 'Lucro Diário'}
                color="#10B981"
                showTrend={true}
                storeCurrency={storeCurrency}
              />
            )}
            {spendChartData.length > 0 && (
              <CryptoChart
                data={spendChartData}
                title={t('dashboard.dailySpend') || 'Gasto Diário'}
                color="#F59E0B"
                showTrend={true}
                storeCurrency={storeCurrency}
              />
            )}
          </div>
        )}

        {/* Campaigns Table */}
        {campaigns.length > 0 && (
          <Card3D intensity="medium" glow className="p-3 sm:p-4 md:p-6 overflow-hidden">
            <div className="mb-3 sm:mb-4 flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <h2 className="text-lg sm:text-xl font-bold gradient-text">{t('dashboard.activeCampaigns') || 'Campanhas Ativas'}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {displayedCampaigns.length} {t('dashboard.of') || 'de'} {filteredCampaigns.length} {t('dashboard.campaigns') || 'campanhas'}
                </p>
              </div>
              <div className="relative w-full">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                <Input
                  placeholder={t('dashboard.searchCampaigns') || 'Buscar campanhas...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">{t('dashboard.campaign') || 'Campanha'}</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs sm:text-sm">{t('dashboard.platform') || 'Plataforma'}</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">{t('dashboard.spent') || 'Gasto'}</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">{t('dashboard.revenue') || 'Receita'}</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">ROAS</TableHead>
                    <TableHead className="text-right hidden md:table-cell text-xs sm:text-sm">CPC</TableHead>
                    <TableHead className="text-right hidden lg:table-cell text-xs sm:text-sm">{t('dashboard.conversions') || 'Conversões'}</TableHead>
                    <TableHead className="text-center hidden sm:table-cell text-xs sm:text-sm">{t('dashboard.status') || 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedCampaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Target className="w-12 h-12 text-muted-foreground opacity-50" />
                          <p className="text-sm text-muted-foreground">
                            {campaigns.length === 0 
                              ? (t('dashboard.noActiveCampaigns') || 'Nenhuma campanha ativa encontrada.')
                              : (t('dashboard.noCampaignsMatch') || 'Nenhuma campanha corresponde à busca.')}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedCampaigns.map((campaign, index) => {
                      const totalSpent = Number(campaign.total_spent) || 0;
                      const totalRevenue = Number(campaign.total_revenue) || 0;
                      const roas = totalSpent > 0 ? totalRevenue / totalSpent : 0;
                      const isPositive = roas >= 1;
                      
                      return (
                        <motion.tr
                          key={campaign.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                        >
                          <TableCell className="font-medium text-xs sm:text-sm">
                            <div className="flex flex-col gap-0.5">
                              <span className="truncate max-w-[120px] sm:max-w-none">
                                {campaign.campaign_name || (t('dashboard.noName') || 'Sem nome')}
                              </span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground sm:hidden">
                                {campaign.platform || 'facebook'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell text-xs sm:text-sm">
                            {campaign.platform || 'facebook'}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs sm:text-sm">
                            {formatAmount(totalSpent)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-500 text-xs sm:text-sm">
                            {formatAmount(totalRevenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                              {isPositive ? (
                                <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                              ) : (
                                <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                              )}
                              <span className={`font-bold text-xs sm:text-sm ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                {roas.toFixed(2)}x
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground hidden md:table-cell text-xs sm:text-sm">
                            {formatAmount(Number(campaign.cpc) || 0)}
                          </TableCell>
                          <TableCell className="text-right hidden lg:table-cell text-xs sm:text-sm">
                            {Number(campaign.conversions) || 0}
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell">
                            <Badge 
                              variant={campaign.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {campaign.status || 'active'}
                            </Badge>
                          </TableCell>
                        </motion.tr>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Show More Button */}
            {filteredCampaigns.length > 5 && (
              <div className="mt-4 flex justify-center">
                <Button3D
                  variant="glass"
                  size="md"
                  onClick={() => setShowAllCampaigns(!showAllCampaigns)}
                >
                  {showAllCampaigns ? (t('dashboard.showLess') || 'Ver Menos') : (t('dashboard.showMore') || 'Ver Mais')}
                  <ArrowRight className={`w-4 h-4 ml-2 transition-transform ${showAllCampaigns ? 'rotate-180' : ''}`} />
                </Button3D>
              </div>
            )}
          </Card3D>
        )}
      </div>
    </PageLayout>
  );
};

export default Dashboard;
