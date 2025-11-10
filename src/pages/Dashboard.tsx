import { useEffect, useState } from "react";
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
import { Card3D } from "@/components/ui/Card3D";
import { motion } from "framer-motion";
import { Package, Target, TrendingUp, Activity, RefreshCw, BarChart3, PieChart, Eye, ShoppingCart, DollarSign, ArrowUp, ArrowDown, Search, ArrowRight } from "lucide-react";
import { format, subDays } from "date-fns";
import { Button3D } from "@/components/ui/Button3D";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { stateInfo, loading: stateLoading } = useSubscriptionState();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const stats = useDashboardStats(user?.id);
  const statsLoading = stats.loading;

  // Get top products
  const [topProducts, setTopProducts] = useState<any[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('total_revenue', { ascending: false })
      .limit(5)
      .then(({ data }) => setTopProducts(data || []));
  }, [user?.id]);

  // Get recent campaigns
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<any[]>([]);
  const [hasFacebookIntegration, setHasFacebookIntegration] = useState(false);
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
        setHasFacebookIntegration(true);
        // Auto-sync silently in background
        try {
          await supabase.functions.invoke('sync-facebook-campaigns', {
            body: { datePreset: 'last_30d' },
          });
          setAutoSynced(true);
        } catch (err) {
          console.error('Auto-sync error:', err);
        }
      }
    };

    checkAndSync();
  }, [user?.id, autoSynced]);

  useEffect(() => {
    if (!user?.id) return;
    
    // Get only active campaigns
    supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentCampaigns(data || []));

    // Get all active campaigns for table
    supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .then(({ data }) => setAllCampaigns(data || []));
  }, [user?.id, stats]);

  if (loading || stateLoading || statsLoading) {
    return <LoadingOverlay message={t('dashboard.loading')} />;
  }

  // Prepare chart data from daily ROAS - if no daily data, use campaigns data aggregated
  const dailyData = stats?.dailyRoasData || [];
  
  // If no daily data, create from campaigns (aggregate by date from updated_at)
  let revenueChartData: { date: string; value: number }[] = [];
  let roasChartData: { date: string; value: number }[] = [];
  let profitChartData: { date: string; value: number }[] = [];
  let spendChartData: { date: string; value: number }[] = [];
  let conversionsChartData: { date: string; value: number }[] = [];

  if (dailyData.length > 0) {
    // Use daily ROAS data
    revenueChartData = dailyData
      .slice()
      .reverse()
      .map((item: any) => ({
        date: format(new Date(item.date), 'dd/MM'),
        value: item.total_revenue || 0,
      }));

    roasChartData = dailyData
      .slice()
      .reverse()
      .map((item: any) => ({
        date: format(new Date(item.date), 'dd/MM'),
        value: item.roas || 0,
      }));

    profitChartData = dailyData
      .slice()
      .reverse()
      .map((item: any) => ({
        date: format(new Date(item.date), 'dd/MM'),
        value: item.margin_euros || 0,
      }));

    spendChartData = dailyData
      .slice()
      .reverse()
      .map((item: any) => ({
        date: format(new Date(item.date), 'dd/MM'),
        value: item.total_spent || 0,
      }));

    conversionsChartData = dailyData
      .slice()
      .reverse()
      .map((item: any) => ({
        date: format(new Date(item.date), 'dd/MM'),
        value: item.purchases || 0,
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

    revenueChartData = last30Days.map((date, i) => ({
      date,
      value: dailyRevenue * (0.8 + Math.random() * 0.4), // Add variation
    }));

    spendChartData = last30Days.map((date, i) => ({
      date,
      value: dailySpent * (0.8 + Math.random() * 0.4),
    }));

    roasChartData = last30Days.map((date, i) => ({
      date,
      value: avgRoas * (0.9 + Math.random() * 0.2),
    }));

    profitChartData = last30Days.map((date, i) => ({
      date,
      value: dailyProfit * (0.8 + Math.random() * 0.4),
    }));

    conversionsChartData = last30Days.map((date, i) => ({
      date,
      value: Math.round(dailyConversions * (0.7 + Math.random() * 0.6)),
    }));
  }

  // Filter campaigns - only show active by default
  const filteredCampaigns = allCampaigns.filter(campaign => {
    const matchesSearch = campaign.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase());
    // Only show active campaigns
    return matchesSearch && campaign.status === 'active';
  });

  // Limit to 5 campaigns initially, show all if showAllCampaigns is true
  const displayedCampaigns = showAllCampaigns ? filteredCampaigns : filteredCampaigns.slice(0, 5);

  const handleSyncFacebookData = async () => {
    if (!user?.id) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-facebook-campaigns', {
        body: {
          datePreset: 'last_30d',
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: 'Erro ao sincronizar',
          description: data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: '✅ Sincronização concluída',
          description: `${data.campaignsSaved} campanhas e ${data.dailyDataSaved} registros diários salvos`,
        });
        // Refresh stats
        window.location.reload();
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao sincronizar',
        description: err.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <PageLayout
      title={t('dashboard.title')}
      subtitle={t('dashboard.welcome')}
      actions={
        <Button3D
          variant="gradient"
          size="sm"
          onClick={handleSyncFacebookData}
          disabled={syncing}
          glow
          className="text-xs sm:text-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 ${syncing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{syncing ? 'Sincronizando...' : 'Sincronizar Facebook'}</span>
          <span className="sm:hidden">{syncing ? 'Sync...' : 'Sync'}</span>
        </Button3D>
      }
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