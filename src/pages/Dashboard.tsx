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
  RefreshCw
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
  metadata: any;
}

interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
}

interface Campaign {
  id: string;
  campaign_name: string;
  platform: string;
  status: string;
  total_spent: number;
  total_revenue: number;
  roas: number;
  cpc: number;
  conversions: number;
  updated_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { toast } = useToast();
  const { stateInfo, loading: stateLoading } = useSubscriptionState();
  
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

  // Auth & Setup
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

  // Fetch Integrations
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

      if (facebook.length > 0) {
        await fetchAdAccounts();
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  // Fetch Ad Accounts
  const fetchAdAccounts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('facebook-campaigns', {
        body: { action: 'listAdAccounts' }
      });

      if (error) {
        console.error("Error fetching ad accounts:", error);
        return;
      }
      
      if (data?.adAccounts) {
        setAdAccounts(data.adAccounts);
      }
    } catch (error: any) {
      console.error("Error fetching ad accounts:", error);
    }
  };

  // Auto-sync Facebook campaigns
  useEffect(() => {
    if (!user?.id || autoSynced) return;

    const checkAndSync = async () => {
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
          // Silent fail
        }
      }
    };

    checkAndSync();
  }, [user?.id, autoSynced]);

  // Fetch Campaigns
  const fetchCampaigns = useCallback(async () => {
    if (!user?.id) return;
    
    let query = supabase
      .from('campaigns')
      .select('id, campaign_name, platform, status, total_spent, total_revenue, roas, cpc, conversions, updated_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (timeframe?.dateFrom) {
      const df = new Date(timeframe.dateFrom);
      df.setHours(0, 0, 0, 0);
      query = query.gte('updated_at', df.toISOString());
    }
    if (timeframe?.dateTo) {
      const dt = new Date(timeframe.dateTo);
      dt.setHours(23, 59, 59, 999);
      query = query.lte('updated_at', dt.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching campaigns:', error);
      return;
    }
    
    setCampaigns(data || []);
  }, [user?.id, timeframe?.dateFrom?.getTime(), timeframe?.dateTo?.getTime()]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Dashboard Stats
  const stats = useDashboardStats(user?.id, timeframe ? {
    dateFrom: timeframe.dateFrom,
    dateTo: timeframe.dateTo,
    storeId: selectedStore !== "all" ? selectedStore : undefined,
    refreshKey,
  } : { 
    storeId: selectedStore !== "all" ? selectedStore : undefined,
    refreshKey 
  });

  // Chart Data
  const chartData = useMemo(() => {
    const dailyData = stats?.dailyRoasData || [];
    
    if (dailyData.length === 0) {
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
    
    const sortedData = Array.from(dataByDate.entries())
      .map(([date, values]) => ({
        date,
        ...values,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return {
      revenueChartData: sortedData.map((item) => ({
        date: format(new Date(item.date), 'dd/MM'),
        value: (item.units_sold || 0) * (item.product_price || 0),
      })),
      profitChartData: sortedData.map((item) => {
        const revenue = (item.units_sold || 0) * (item.product_price || 0);
        const cost = (item.units_sold || 0) * (item.cog || 0);
        return {
          date: format(new Date(item.date), 'dd/MM'),
          value: revenue - (item.total_spent || 0) - cost,
        };
      }),
      spendChartData: sortedData.map((item) => ({
        date: format(new Date(item.date), 'dd/MM'),
        value: item.total_spent || 0,
      })),
    };
  }, [stats?.dailyRoasData]);

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesSearch = campaign.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch && campaign.status === 'active';
    });
  }, [campaigns, searchTerm]);

  const displayedCampaigns = useMemo(() => {
    return showAllCampaigns ? filteredCampaigns : filteredCampaigns.slice(0, 5);
  }, [showAllCampaigns, filteredCampaigns]);

  // Handlers
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    fetchCampaigns();
    toast({
      title: t('dashboard.refreshed') || 'Atualizado',
      description: t('dashboard.dataRefreshed') || 'Dados atualizados com sucesso',
    });
  };

  if (loading || stateLoading || stats.loading) {
    return <LoadingOverlay message={t('dashboard.loading')} />;
  }

  const { revenueChartData, profitChartData, spendChartData } = chartData;

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

      <div className="space-y-6">
        {/* Filters Section */}
        <Card3D intensity="low" className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filtros</h2>
              <Button3D
                variant="glass"
                size="sm"
                onClick={handleRefresh}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button3D>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Shopify Store */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  {t('profitSheet.shopifyStore') || 'Loja Shopify'}
                </label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('profitSheet.selectShopify') || 'Selecionar loja'} />
                  </SelectTrigger>
                  <SelectContent>
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
              </div>

              {/* Facebook Ad Account */}
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
                  <Select value={selectedAdAccount} onValueChange={setSelectedAdAccount}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('profitSheet.selectAdAccount') || 'Selecionar conta'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('storeSelector.allStores') || 'Todas as contas'}</SelectItem>
                      {adAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Timeframe */}
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
        </Card3D>

        {/* Stats Overview */}
        {stats && <StatsOverview stats={stats} />}

        {/* Charts */}
        {(revenueChartData.length > 0 || profitChartData.length > 0 || spendChartData.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* Campaigns Table */}
        {campaigns.length > 0 && (
          <Card3D intensity="medium" glow className="p-4 sm:p-6 overflow-hidden">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold gradient-text">Campanhas Ativas</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {displayedCampaigns.length} de {filteredCampaigns.length} campanhas
                </p>
              </div>
              <div className="relative w-full sm:w-auto sm:min-w-[250px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campanhas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead className="hidden sm:table-cell">Plataforma</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead className="text-right hidden md:table-cell">CPC</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Conversões</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Status</TableHead>
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
                              ? "Nenhuma campanha ativa encontrada."
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
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-0.5">
                              <span className="truncate max-w-[150px] sm:max-w-none">
                                {campaign.campaign_name || 'Sem nome'}
                              </span>
                              <span className="text-xs text-muted-foreground sm:hidden">
                                {campaign.platform || 'facebook'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">
                            {campaign.platform || 'facebook'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            €{(campaign.total_spent || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-500">
                            €{(campaign.total_revenue || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isPositive ? (
                                <ArrowUp className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <ArrowDown className="w-4 h-4 text-red-500" />
                              )}
                              <span className={`font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                {roas.toFixed(2)}x
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground hidden md:table-cell">
                            €{(campaign.cpc || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right hidden lg:table-cell">
                            {campaign.conversions || 0}
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
