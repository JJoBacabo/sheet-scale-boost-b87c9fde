import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useLanguage } from "@/contexts/LanguageContext";
import { SetupProgress } from "@/components/dashboard/SetupProgress";
import { LoadingOverlay } from "@/components/ui/loading-spinner";
import { useSubscriptionState } from "@/hooks/useSubscriptionState";
import { SubscriptionStateBanner } from "@/components/SubscriptionStateBanner";
import { ReadOnlyOverlay } from "@/components/ReadOnlyOverlay";
import { PageLayout } from "@/components/PageLayout";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { CryptoChart } from "@/components/dashboard/CryptoChart";
import { TimeframeSelector, type TimeframeValue } from "@/components/dashboard/TimeframeSelector";
import { Card3D } from "@/components/ui/Card3D";
import { motion } from "framer-motion";
import { Target, ArrowUp, ArrowDown, Search, ArrowRight, Store, Facebook, CheckCircle2 } from "lucide-react";
import { format, subDays } from "date-fns";
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
  metadata: any;
}

interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { toast } = useToast();
  const { stateInfo, loading: stateLoading } = useSubscriptionState();
  const [timeframe, setTimeframe] = useState<TimeframeValue | undefined>(undefined);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0); // Key para forçar refresh dos stats
  
  // Integration states
  const [shopifyIntegrations, setShopifyIntegrations] = useState<Integration[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [hasFacebookIntegration, setHasFacebookIntegration] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        fetchIntegrations(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else if (session.user.id) {
        fetchIntegrations(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchIntegrations = async (userId: string) => {
    try {
      const { data: integrations, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', userId)
        .in('integration_type', ['shopify', 'facebook_ads']);

      if (error) throw error;

      const shopify = integrations?.filter(i => i.integration_type === 'shopify') || [];
      const facebook = integrations?.filter(i => i.integration_type === 'facebook_ads') || [];

      setShopifyIntegrations(shopify);
      setHasFacebookIntegration(facebook.length > 0);

      // If Facebook is connected, fetch ad accounts
      if (facebook.length > 0) {
        await fetchAdAccounts();
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  const fetchAdAccounts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('facebook-campaigns', {
        body: { action: 'listAdAccounts' }
      });

      if (error) {
        console.error("❌ Error from edge function:", error);
        return;
      }
      
      if (data?.adAccounts) {
        setAdAccounts(data.adAccounts);
      }
    } catch (error: any) {
      console.error("❌ Error fetching ad accounts:", error);
    }
  };

  // Smart matching algorithm for Shopify stores
  const findBestShopifyMatch = (searchName: string, candidates: Integration[]): string | null => {
    if (!searchName || candidates.length === 0) return null;

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const searchNormalized = normalize(searchName);
    const searchChars = searchNormalized.split('');

    let bestMatch: { id: string; score: number; name: string } | null = null;

    for (const candidate of candidates) {
      const candidateNames = [
        candidate.metadata?.shop_name,
        candidate.metadata?.shop_domain,
        candidate.metadata?.store_name,
      ].filter(Boolean);

      for (const candidateName of candidateNames) {
        if (!candidateName) continue;
        
        const candidateNormalized = normalize(candidateName);
        const candidateChars = candidateNormalized.split('');

        let score = 0;
        
        let matchedChars = 0;
        for (const searchChar of searchChars) {
          if (candidateChars.includes(searchChar)) {
            matchedChars++;
          }
        }
        score += matchedChars * 2;

        const minLength = Math.min(searchNormalized.length, candidateNormalized.length);
        for (let i = 0; i < minLength; i++) {
          if (searchNormalized[i] === candidateNormalized[i]) {
            score += 3;
          }
        }

        if (candidateNormalized.includes(searchNormalized)) {
          score += 20;
        }
        if (searchNormalized.includes(candidateNormalized)) {
          score += 15;
        }

        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { id: candidate.id, score, name: candidateName };
        }
      }
    }

    const minScore = Math.min(searchChars.length * 2, 6);
    return bestMatch && bestMatch.score >= minScore ? bestMatch.id : null;
  };

  // Smart matching algorithm for Ad Accounts
  const findBestAdAccountMatch = (searchName: string, candidates: AdAccount[]): string | null => {
    if (!searchName || candidates.length === 0) return null;

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const searchNormalized = normalize(searchName);
    const searchChars = searchNormalized.split('');

    let bestMatch: { id: string; score: number; name: string } | null = null;

    for (const candidate of candidates) {
      const candidateNormalized = normalize(candidate.name);
      const candidateChars = candidateNormalized.split('');

      let score = 0;
      
      let matchedChars = 0;
      for (const searchChar of searchChars) {
        if (candidateChars.includes(searchChar)) {
          matchedChars++;
        }
      }
      score += matchedChars * 2;

      const minLength = Math.min(searchNormalized.length, candidateNormalized.length);
      for (let i = 0; i < minLength; i++) {
        if (searchNormalized[i] === candidateNormalized[i]) {
          score += 3;
        }
      }

      if (candidateNormalized.includes(searchNormalized)) {
        score += 20;
      }
      if (searchNormalized.includes(candidateNormalized)) {
        score += 15;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { id: candidate.id, score, name: candidate.name };
      }
    }

    const minScore = Math.min(searchChars.length * 2, 6);
    return bestMatch && bestMatch.score >= minScore ? bestMatch.id : null;
  };

  const handleShopifyChange = (value: string) => {
    setSelectedStore(value);
    
    // Find matching Ad Account
    if (value !== "all") {
      const selectedIntegration = shopifyIntegrations.find(i => i.id === value);
      if (selectedIntegration) {
        const shopName = selectedIntegration.metadata?.shop_name || '';
        const matchId = findBestAdAccountMatch(shopName, adAccounts);
        if (matchId) {
          setSelectedAdAccount(matchId);
        }
      }
    } else {
      setSelectedAdAccount("all");
    }
  };

  const handleAdAccountChange = (value: string) => {
    setSelectedAdAccount(value);
    
    // Find matching Shopify store
    if (value !== "all") {
      const selectedAccount = adAccounts.find(acc => acc.id === value);
      if (selectedAccount) {
        const matchId = findBestShopifyMatch(selectedAccount.name, shopifyIntegrations);
        if (matchId) {
          setSelectedStore(matchId);
        }
      }
    } else {
      setSelectedStore("all");
    }
  };

  const stats = useDashboardStats(user?.id, timeframe ? {
    dateFrom: timeframe.dateFrom,
    dateTo: timeframe.dateTo,
    storeId: selectedStore !== "all" ? selectedStore : undefined,
    refreshKey,
  } : { 
    storeId: selectedStore !== "all" ? selectedStore : undefined,
    refreshKey 
  });
  const statsLoading = stats.loading;

  // Get recent campaigns
  const [allCampaigns, setAllCampaigns] = useState<any[]>([]);
  const [autoSynced, setAutoSynced] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);

  // Check Facebook integration and auto-sync
  useEffect(() => {
    if (!user?.id || autoSynced) return;

    const checkAndSync = async () => {
      // Check if Facebook is connected
      const { data: integration } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('integration_type', 'facebook_ads')
        .maybeSingle();

      if (integration) {
        // Auto-sync silently in background
        try {
          await supabase.functions.invoke('sync-facebook-campaigns', {
            body: { datePreset: 'last_30d' },
          });
          setAutoSynced(true);
        } catch (err) {
          // Silently fail - user can manually sync if needed
        }
      }
    };

    checkAndSync();
  }, [user?.id, autoSynced]);

  const refreshCampaigns = useCallback(async () => {
    if (!user?.id) return;
    
    // Get all active campaigns for table - only select needed fields
    const { data: allData } = await supabase
      .from('campaigns')
      .select('id, campaign_name, platform, status, total_spent, total_revenue, roas, cpc, conversions, updated_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });
    
    setAllCampaigns(allData || []);
  }, [user?.id]);

  useEffect(() => {
    refreshCampaigns();
  }, [refreshCampaigns]);

  // CRITICAL: All hooks must be called BEFORE any conditional returns
  // Memoize chart data calculations to avoid recalculating on every render
  const chartData = useMemo(() => {
    const dailyData = stats?.dailyRoasData || [];
    
    // If no daily data, create from campaigns (aggregate by date from updated_at)
    let revenueChartData: { date: string; value: number }[] = [];
    let profitChartData: { date: string; value: number }[] = [];
    let spendChartData: { date: string; value: number }[] = [];

    if (dailyData.length > 0) {
      // Use daily ROAS data - data já vem ordenada do mais antigo para o mais recente
      // Agrupar por data para evitar duplicatas e somar valores
      const dataByDate = new Map<string, {
        total_spent: number;
        units_sold: number;
        product_price: number;
        cog: number;
        purchases: number;
      }>();
      
      dailyData.forEach((item: any) => {
        const dateKey = item.date?.split('T')[0] || item.date;
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
        
        // Calcular média ponderada de product_price e cog baseado em units_sold
        const totalUnits = existing.units_sold + itemUnitsSold;
        const avgProductPrice = totalUnits > 0 
          ? ((existing.product_price * existing.units_sold) + (itemProductPrice * itemUnitsSold)) / totalUnits
          : (itemProductPrice || existing.product_price);
        const avgCog = totalUnits > 0
          ? ((existing.cog * existing.units_sold) + (itemCog * itemUnitsSold)) / totalUnits
          : (itemCog || existing.cog);
        
        dataByDate.set(dateKey, {
          total_spent: existing.total_spent + itemSpent,
          units_sold: existing.units_sold + itemUnitsSold,
          product_price: avgProductPrice,
          cog: avgCog,
          purchases: existing.purchases + itemPurchases,
        });
      });
      
      // Converter Map para array e ordenar por data
      const sortedData = Array.from(dataByDate.entries())
        .map(([date, values]) => ({
          date,
          total_spent: values.total_spent,
          units_sold: values.units_sold,
          product_price: values.product_price,
          cog: values.cog,
          purchases: values.purchases,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      revenueChartData = sortedData.map((item) => ({
        date: format(new Date(item.date), 'dd/MM'),
        value: (item.units_sold || 0) * (item.product_price || 0),
      }));

      profitChartData = sortedData.map((item) => {
        const revenue = (item.units_sold || 0) * (item.product_price || 0);
        const cost = (item.units_sold || 0) * (item.cog || 0);
        return {
          date: format(new Date(item.date), 'dd/MM'),
          value: revenue - (item.total_spent || 0) - cost,
        };
      });

      spendChartData = sortedData.map((item) => ({
        date: format(new Date(item.date), 'dd/MM'),
        value: item.total_spent || 0,
      }));
    } else if (allCampaigns.length > 0) {
      // Create chart data from campaigns - last 30 days
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        return format(date, 'dd/MM');
      });

      // Aggregate campaign data by distributing totals across last 30 days
      const totalRevenue = allCampaigns.reduce((sum, c) => sum + (Number(c.total_revenue) || 0), 0);
      const totalSpent = allCampaigns.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0);
      const totalConversions = allCampaigns.reduce((sum, c) => sum + (Number(c.conversions) || 0), 0);
      const avgRoas = totalSpent > 0 ? totalRevenue / totalSpent : 0;
      const profit = totalRevenue - totalSpent;

      // Distribute evenly across days with some variation
      const dailyRevenue = totalRevenue / 30;
      const dailySpent = totalSpent / 30;
      const dailyConversions = totalConversions / 30;
      const dailyProfit = profit / 30;

      revenueChartData = last30Days.map((date) => ({
        date,
        value: dailyRevenue * (0.8 + Math.random() * 0.4), // Add variation
      }));

      spendChartData = last30Days.map((date) => ({
        date,
        value: dailySpent * (0.8 + Math.random() * 0.4),
      }));

      profitChartData = last30Days.map((date) => ({
        date,
        value: dailyProfit * (0.8 + Math.random() * 0.4),
      }));
    }

    return {
      revenueChartData,
      profitChartData,
      spendChartData,
    };
  }, [stats?.dailyRoasData, allCampaigns]);

  const { revenueChartData, profitChartData, spendChartData } = chartData;

  // Memoize filtered campaigns to avoid recalculating on every render
  // Note: Currently campaigns don't have ad_account_id in the database,
  // so we can't filter by ad account. When that's added, we can filter here.
  const filteredCampaigns = useMemo(() => {
    return allCampaigns.filter(campaign => {
      const matchesSearch = campaign.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase());
      // Only show active campaigns
      return matchesSearch && campaign.status === 'active';
    });
  }, [allCampaigns, searchTerm, selectedAdAccount]);

  // Memoize displayed campaigns
  const displayedCampaigns = useMemo(() => {
    return showAllCampaigns ? filteredCampaigns : filteredCampaigns.slice(0, 5);
  }, [showAllCampaigns, filteredCampaigns]);

  // NOW we can do conditional returns after all hooks have been called
  if (loading || stateLoading || statsLoading) {
    return <LoadingOverlay message={t('dashboard.loading')} />;
  }


  return (
    <PageLayout
      title={t('dashboard.title')}
      subtitle={t('dashboard.welcome')}
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
        {/* Filters: Store, Ad Account, and Timeframe Selectors */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Shopify Store Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Store className="w-4 h-4" />
                {t('profitSheet.shopifyStore') || 'Loja Shopify'}
              </label>
              <Select value={selectedStore} onValueChange={handleShopifyChange}>
                <SelectTrigger className="w-full bg-card border-primary/20">
                  <SelectValue placeholder={t('profitSheet.selectShopify') || 'Selecionar loja'} />
                </SelectTrigger>
                <SelectContent className="z-50 bg-card border-border">
                  <SelectItem value="all">{t('storeSelector.allStores') || 'Todas as lojas'}</SelectItem>
                  {shopifyIntegrations.map((integration) => (
                    <SelectItem key={integration.id} value={integration.id}>
                      {integration.metadata?.shop_name || 
                       integration.metadata?.shop_domain || 
                       `Loja ${integration.id.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStore && selectedStore !== "all" && (
                <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {t('profitSheet.selected') || 'Selecionado'}
                </Badge>
              )}
            </div>

            {/* Facebook Ad Account Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Facebook className="w-4 h-4" />
                {t('profitSheet.adAccount') || 'Conta de Anúncios'}
              </label>
              {!hasFacebookIntegration ? (
                <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  {t('metaDashboard.connectDesc') || 'Conecte o Facebook Ads'}
                </div>
              ) : adAccounts.length === 0 ? (
                <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  {t('common.loading') || 'Carregando...'}
                </div>
              ) : (
                <>
                  <Select value={selectedAdAccount} onValueChange={handleAdAccountChange}>
                    <SelectTrigger className="w-full bg-card border-primary/20">
                      <SelectValue placeholder={t('profitSheet.selectAdAccount') || 'Selecionar conta'} />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-card border-border">
                      <SelectItem value="all">{t('storeSelector.allStores') || 'Todas as contas'}</SelectItem>
                      {adAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAdAccount && selectedAdAccount !== "all" && (
                    <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {t('profitSheet.selected') || 'Selecionado'}
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Timeframe Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('dashboard.timeframe')}
              </label>
              <TimeframeSelector
                value={timeframe}
                onChange={setTimeframe}
              />
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && <StatsOverview stats={stats} />}

        {/* Crypto Style Charts - Only 3: Receita, Lucro, Gasto */}
        {(revenueChartData.length > 0 || allCampaigns.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {revenueChartData.length > 0 && (
              <CryptoChart
                data={revenueChartData}
                title="Receita Diária"
                color="#4AE9BD"
                showTrend={true}
              />
            )}
            {profitChartData.length > 0 && (
              <CryptoChart
                data={profitChartData}
                title="Lucro Diário"
                color="#10B981"
                showTrend={true}
              />
            )}
            {spendChartData.length > 0 && (
              <CryptoChart
                data={spendChartData}
                title="Gasto Diário"
                color="#F59E0B"
                showTrend={true}
              />
            )}
          </div>
        )}


        {/* Campaigns Table - Only Active */}
        {allCampaigns.length > 0 && (
          <Card3D intensity="medium" glow className="p-3 sm:p-4 md:p-6 overflow-hidden">
            <div className="mb-3 sm:mb-4 flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold gradient-text truncate">Campanhas Ativas</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    {displayedCampaigns.length} de {filteredCampaigns.length} campanhas ativas
                  </p>
                </div>
                <div className="relative w-full sm:w-auto sm:flex-initial sm:min-w-[200px] md:w-64">
                  <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar campanhas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm"
                  />
                </div>
              </div>
            </div>

          <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="font-semibold text-xs sm:text-sm">Campanha</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm hidden sm:table-cell">Plataforma</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm text-right">Gasto</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm text-right">Receita</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm text-right">ROAS</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm text-right hidden md:table-cell">CPC</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm text-right hidden lg:table-cell">Conversões</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm text-center hidden sm:table-cell">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 sm:py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Target className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground opacity-50" />
                        <p className="text-xs sm:text-sm text-muted-foreground px-4">
                          {allCampaigns.length === 0 
                            ? "Nenhuma campanha ativa encontrada. Sincronize seus dados do Facebook."
                            : "Nenhuma campanha corresponde à busca."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedCampaigns.map((campaign, index) => {
                    const roas = campaign.total_spent > 0 
                      ? (campaign.total_revenue || 0) / campaign.total_spent 
                      : 0;
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
                            <span className="truncate max-w-[150px] sm:max-w-none">{campaign.campaign_name || 'Sem nome'}</span>
                            <span className="text-[10px] text-muted-foreground sm:hidden">{campaign.platform || 'facebook'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">{campaign.platform || 'facebook'}</TableCell>
                        <TableCell className="text-right font-semibold text-xs sm:text-sm">€{(campaign.total_spent || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-500 text-xs sm:text-sm">
                          €{(campaign.total_revenue || 0).toFixed(2)}
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
                        <TableCell className="text-right text-muted-foreground text-xs sm:text-sm hidden md:table-cell">
                          €{(campaign.cpc || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm hidden lg:table-cell">{campaign.conversions || 0}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell">
                          <Badge 
                            variant={campaign.status === 'active' ? 'default' : 'secondary'}
                            className="text-[10px] sm:text-xs"
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

          {/* Ver Mais Button */}
          {filteredCampaigns.length > 5 && (
            <div className="mt-4 flex justify-center">
              <Button3D
                variant="glass"
                size="md"
                onClick={() => setShowAllCampaigns(!showAllCampaigns)}
              >
                {showAllCampaigns ? 'Ver Menos' : 'Ver Mais'}
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