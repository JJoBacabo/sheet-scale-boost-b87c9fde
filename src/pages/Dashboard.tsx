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
import { Package, Target, TrendingUp, Activity } from "lucide-react";
import { format, subDays } from "date-fns";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { stateInfo, loading: stateLoading } = useSubscriptionState();

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
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentCampaigns(data || []));
  }, [user?.id]);

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
        {/* Stats Overview */}
        {stats && <StatsOverview stats={stats} />}

        {/* Crypto Style Charts */}
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