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
import { Package, Target, TrendingUp, Activity, RefreshCw, BarChart3, PieChart, Eye, ShoppingCart, DollarSign, ArrowUp, ArrowDown, Search } from "lucide-react";
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

  const { stats, loading: statsLoading } = useDashboardStats(user?.id);

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
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
    supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentCampaigns(data || []));

    // Get all campaigns for table
    supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => setAllCampaigns(data || []));
  }, [user?.id, stats]);

  if (loading || stateLoading || statsLoading) {
    return <LoadingOverlay message={t('dashboard.loading')} />;
  }

  // Prepare chart data from daily ROAS
  const revenueChartData = (stats?.dailyRoasData || [])
    .slice()
    .reverse()
    .map((item: any) => ({
      date: format(new Date(item.date), 'dd/MM'),
      value: item.total_revenue || 0,
    }));

  const roasChartData = (stats?.dailyRoasData || [])
    .slice()
    .reverse()
    .map((item: any) => ({
      date: format(new Date(item.date), 'dd/MM'),
      value: item.roas || 0,
    }));

  const profitChartData = (stats?.dailyRoasData || [])
    .slice()
    .reverse()
    .map((item: any) => ({
      date: format(new Date(item.date), 'dd/MM'),
      value: item.margin_euros || 0,
    }));

  const spendChartData = (stats?.dailyRoasData || [])
    .slice()
    .reverse()
    .map((item: any) => ({
      date: format(new Date(item.date), 'dd/MM'),
      value: item.total_spent || 0,
    }));

  const conversionsChartData = (stats?.dailyRoasData || [])
    .slice()
    .reverse()
    .map((item: any) => ({
      date: format(new Date(item.date), 'dd/MM'),
      value: item.purchases || 0,
    }));

  const filteredCampaigns = allCampaigns.filter(campaign => {
    const matchesSearch = campaign.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Facebook'}
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

      <div className="space-y-6">
        {/* Stats Overview */}
        {stats && <StatsOverview stats={stats} />}

        {/* Crypto Style Charts - Expanded */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CryptoChart
            data={revenueChartData}
            title="Receita Diária"
            color="#4AE9BD"
            showTrend={true}
          />
          <CryptoChart
            data={roasChartData}
            title="ROAS Diário"
            color="#8B5CF6"
            showTrend={true}
          />
          <CryptoChart
            data={profitChartData}
            title="Lucro Diário"
            color="#10B981"
            showTrend={true}
          />
          <CryptoChart
            data={spendChartData}
            title="Gasto Diário"
            color="#F59E0B"
            showTrend={true}
          />
          <CryptoChart
            data={conversionsChartData}
            title="Conversões Diárias"
            color="#EF4444"
            showTrend={true}
          />
          <CryptoChart
            data={revenueChartData.map((item, index) => ({
              ...item,
              value: spendChartData[index]?.value > 0 
                ? (item.value / spendChartData[index].value) 
                : 0
            }))}
            title="ROI Diário"
            color="#06B6D4"
            showTrend={true}
          />
        </div>

        {/* Top Products & Recent Campaigns */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card3D intensity="low" className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Top Produtos</h3>
            </div>
            {topProducts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum produto encontrado</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/30 hover:bg-background/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">#{index + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{product.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.quantity_sold || 0} vendas
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-bold text-emerald-500">
                        €{(product.total_revenue || 0).toFixed(2)}
                      </p>
                      {product.profit_margin && (
                        <p className="text-xs text-muted-foreground">
                          {product.profit_margin.toFixed(1)}% margem
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card3D>

          {/* Recent Campaigns */}
          <Card3D intensity="low" className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold">Campanhas Recentes</h3>
            </div>
            {recentCampaigns.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma campanha encontrada</p>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((campaign, index) => {
                  const roas = campaign.total_spent > 0 
                    ? (campaign.total_revenue || 0) / campaign.total_spent 
                    : 0;
                  return (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/30 hover:bg-background/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${
                          campaign.status === 'active' ? 'bg-emerald-500' : 'bg-muted'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{campaign.campaign_name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground">
                            {campaign.platform || 'N/A'} • {format(new Date(campaign.created_at), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-bold text-primary">
                          {roas.toFixed(2)}x ROAS
                        </p>
                        <p className="text-xs text-muted-foreground">
                          €{(campaign.total_revenue || 0).toFixed(2)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card3D>
        </div>

        {/* Charts Section - Bar and Pie */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card3D intensity="medium" glow className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Performance de Campanhas</h3>
                <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
              </div>
            </div>
            <div className="h-64 flex items-end justify-between gap-2">
              {allCampaigns.slice(0, 12).map((campaign, index) => {
                const maxSpent = Math.max(...allCampaigns.map(c => c.total_spent || 0), 1);
                const height = ((campaign.total_spent || 0) / maxSpent) * 100;
                return (
                  <motion.div
                    key={campaign.id}
                    className="flex-1 bg-gradient-primary rounded-t-lg relative group"
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: 0.5 + index * 0.05, duration: 0.5 }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold bg-background px-2 py-1 rounded shadow-lg whitespace-nowrap">
                      €{(campaign.total_spent || 0).toFixed(0)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card3D>

          <Card3D intensity="medium" glow className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary/20 flex items-center justify-center">
                <PieChart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Status das Campanhas</h3>
                <p className="text-sm text-muted-foreground">Distribuição</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: "Ativas", value: allCampaigns.filter(c => c.status === 'active').length, total: allCampaigns.length, color: "bg-emerald-500" },
                { label: "Pausadas", value: allCampaigns.filter(c => c.status === 'paused').length, total: allCampaigns.length, color: "bg-yellow-500" },
                { label: "Arquivadas", value: allCampaigns.filter(c => c.status === 'archived').length, total: allCampaigns.length, color: "bg-muted" }
              ].map((item, index) => {
                const percentage = item.total > 0 ? (item.value / item.total) * 100 : 0;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-sm font-bold">{item.value} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${item.color} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.7 + index * 0.1, duration: 0.8 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card3D>
        </div>

        {/* Campaigns Table */}
        <Card3D intensity="medium" glow className="p-6 overflow-hidden">
          <div className="mb-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <h2 className="text-2xl font-bold gradient-text">Todas as Campanhas</h2>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campanhas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button3D
                  variant={statusFilter === "all" ? "gradient" : "glass"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  Todas
                </Button3D>
                <Button3D
                  variant={statusFilter === "active" ? "gradient" : "glass"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                >
                  Ativas
                </Button3D>
                <Button3D
                  variant={statusFilter === "paused" ? "gradient" : "glass"}
                  size="sm"
                  onClick={() => setStatusFilter("paused")}
                >
                  Pausadas
                </Button3D>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="font-semibold">Campanha</TableHead>
                  <TableHead className="font-semibold">Plataforma</TableHead>
                  <TableHead className="font-semibold text-right">Gasto</TableHead>
                  <TableHead className="font-semibold text-right">Receita</TableHead>
                  <TableHead className="font-semibold text-right">ROAS</TableHead>
                  <TableHead className="font-semibold text-right">CPC</TableHead>
                  <TableHead className="font-semibold text-right">Conversões</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {allCampaigns.length === 0 
                        ? "Nenhuma campanha encontrada. Sincronize seus dados do Facebook."
                        : "Nenhuma campanha corresponde aos filtros."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign, index) => {
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
                        <TableCell className="font-medium">{campaign.campaign_name || 'Sem nome'}</TableCell>
                        <TableCell className="text-muted-foreground">{campaign.platform || 'facebook'}</TableCell>
                        <TableCell className="text-right font-semibold">€{(campaign.total_spent || 0).toFixed(2)}</TableCell>
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
                        <TableCell className="text-right text-muted-foreground">
                          €{(campaign.cpc || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">{campaign.conversions || 0}</TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={campaign.status === 'active' ? 'default' : 'secondary'}
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
        </Card3D>

        {/* Quick Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card3D intensity="low" className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-primary" />
              <p className="text-sm text-muted-foreground">Total Campanhas</p>
            </div>
            <p className="text-2xl font-bold">{stats?.totalCampaigns || 0}</p>
          </Card3D>
          <Card3D intensity="low" className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-5 h-5 text-emerald-500" />
              <p className="text-sm text-muted-foreground">Total Produtos</p>
            </div>
            <p className="text-2xl font-bold">{stats?.totalProducts || 0}</p>
          </Card3D>
          <Card3D intensity="low" className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <p className="text-sm text-muted-foreground">Conversões</p>
            </div>
            <p className="text-2xl font-bold">{stats?.totalConversions || 0}</p>
          </Card3D>
          <Card3D intensity="low" className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-blue-500" />
              <p className="text-sm text-muted-foreground">CPC Médio</p>
            </div>
            <p className="text-2xl font-bold">€{(stats?.averageCpc || 0).toFixed(2)}</p>
          </Card3D>
        </div>
      </div>
    </PageLayout>
  );
};

export default Dashboard;