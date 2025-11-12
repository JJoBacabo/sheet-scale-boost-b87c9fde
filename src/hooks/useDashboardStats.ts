import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalCampaigns: number;
  totalProducts: number;
  totalSpent: number;
  totalRevenue: number;
  averageRoas: number;
  activeCampaigns: number;
  totalConversions: number;
  averageCpc: number;
  totalSupplierCost: number;
  recentActivity: any[];
  dailyRoasData: any[];
  loading: boolean;
}

export const useDashboardStats = (userId: string | undefined, filters?: { dateFrom?: Date; dateTo?: Date; campaignId?: string; platform?: string; productId?: string; storeId?: string; refreshKey?: number }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    totalProducts: 0,
    totalSpent: 0,
    totalRevenue: 0,
    averageRoas: 0,
    activeCampaigns: 0,
    totalConversions: 0,
    averageCpc: 0,
    totalSupplierCost: 0,
    recentActivity: [],
    dailyRoasData: [],
    loading: true,
  });

  useEffect(() => {
    if (!userId) {
      setStats(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchStats = async () => {
      try {
        console.log('🔄 Fetching dashboard stats with filters:', filters);
        
        // Build campaigns query with filters
        let campaignsQuery = supabase
          .from('campaigns')
          .select('id, status, total_spent, total_revenue, conversions, clicks, cpc, roas, updated_at')
          .eq('user_id', userId);

        if (filters?.campaignId && filters.campaignId !== 'all') {
          campaignsQuery = campaignsQuery.eq('id', filters.campaignId);
        }
        if (filters?.platform && filters.platform !== 'all') {
          campaignsQuery = campaignsQuery.eq('platform', filters.platform);
        }
        
        // Apply date filters to campaigns based on updated_at
        if (filters?.dateFrom) {
          const dateFrom = new Date(filters.dateFrom);
          dateFrom.setHours(0, 0, 0, 0);
          campaignsQuery = campaignsQuery.gte('updated_at', dateFrom.toISOString());
        }
        if (filters?.dateTo) {
          const dateTo = new Date(filters.dateTo);
          dateTo.setHours(23, 59, 59, 999);
          campaignsQuery = campaignsQuery.lte('updated_at', dateTo.toISOString());
        }

        const { data: campaigns, error: campaignsError } = await campaignsQuery;
        
        if (campaignsError) {
          console.error('❌ Error fetching campaigns:', campaignsError);
        }
        
        console.log('📊 Fetched campaigns:', campaigns?.length || 0);

        // Build products query with filters
        let productsQuery = supabase
          .from('products')
          .select('id, cost_price, selling_price, quantity_sold, integration_id')
          .eq('user_id', userId);

        if (filters?.productId && filters.productId !== 'all') {
          productsQuery = productsQuery.eq('id', filters.productId);
        }
        if (filters?.storeId && filters.storeId !== 'all') {
          productsQuery = productsQuery.eq('integration_id', filters.storeId);
        }

        const { data: products, error: productsError } = await productsQuery;
        
        if (productsError) {
          console.error('❌ Error fetching products:', productsError);
        }
        
        console.log('📦 Fetched products:', products?.length || 0);

        // Build daily ROAS query for charts only
        let dailyRoasQuery = supabase
          .from('daily_roas')
          .select('date, total_spent, units_sold, product_price, cog, purchases, campaign_id')
          .eq('user_id', userId)
          .order('date', { ascending: true });

        // Apply date filters for daily_roas
        if (filters?.dateFrom) {
          const dateFrom = new Date(filters.dateFrom);
          dateFrom.setHours(0, 0, 0, 0);
          const dateFromStr = dateFrom.toISOString().split('T')[0];
          dailyRoasQuery = dailyRoasQuery.gte('date', dateFromStr);
        }
        if (filters?.dateTo) {
          const dateTo = new Date(filters.dateTo);
          dateTo.setHours(23, 59, 59, 999);
          const dateToStr = dateTo.toISOString().split('T')[0];
          dailyRoasQuery = dailyRoasQuery.lte('date', dateToStr);
        }
        
        // Default to last 30 days if no filters
        if (!filters?.dateFrom && !filters?.dateTo) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          dailyRoasQuery = dailyRoasQuery.gte('date', thirtyDaysAgo.toISOString().split('T')[0]);
        }

        if (filters?.campaignId && filters.campaignId !== 'all') {
          dailyRoasQuery = dailyRoasQuery.eq('campaign_id', filters.campaignId);
        }

        const { data: dailyRoas, error: dailyRoasError } = await dailyRoasQuery;
        
        if (dailyRoasError) {
          console.error('❌ Error fetching daily_roas:', dailyRoasError);
        }
        
        console.log('📈 Fetched daily_roas entries:', dailyRoas?.length || 0);

        // Calculate metrics from CAMPAIGNS (Ads Manager data)
        const totalSpent = campaigns?.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0) || 0;
        const totalRevenue = campaigns?.reduce((sum, c) => sum + (Number(c.total_revenue) || 0), 0) || 0;
        const totalConversions = campaigns?.reduce((sum, c) => sum + (Number(c.conversions) || 0), 0) || 0;
        const totalClicks = campaigns?.reduce((sum, c) => sum + (Number(c.clicks) || 0), 0) || 0;
        
        // Calculate averages
        const averageRoas = totalSpent > 0 ? totalRevenue / totalSpent : 0;
        const averageCpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
        const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
        
        // Calculate supplier cost from daily_roas within timeframe
        const totalSupplierCost = (dailyRoas || []).reduce((sum: number, d: any) => {
          return sum + (Number(d.cog) || 0);
        }, 0);

        console.log('💰 Calculated metrics:', {
          totalSpent,
          totalRevenue,
          totalConversions,
          totalClicks,
          averageRoas,
          averageCpc,
          totalSupplierCost,
          activeCampaigns
        });


        setStats({
          totalCampaigns: campaigns?.length || 0,
          totalProducts: products?.length || 0,
          totalSpent,
          totalRevenue,
          averageRoas,
          activeCampaigns,
          totalConversions,
          averageCpc,
          totalSupplierCost,
          recentActivity: [],
          dailyRoasData: dailyRoas || [],
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();

    // Disable real-time subscriptions for better performance
    // Real-time updates can be enabled manually via refresh button if needed
    // const campaignsChannel = supabase
    //   .channel('dashboard-campaigns')
    //   .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns', filter: `user_id=eq.${userId}` }, fetchStats)
    //   .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `user_id=eq.${userId}` }, fetchStats)
    //   .subscribe();

    // return () => {
    //   supabase.removeChannel(campaignsChannel);
    // };
  }, [
    userId, 
    filters?.dateFrom?.getTime(), // Use getTime() for better comparison
    filters?.dateTo?.getTime(), // Use getTime() for better comparison
    filters?.campaignId, 
    filters?.platform, 
    filters?.productId,
    filters?.storeId,
    filters?.refreshKey // Incluir refreshKey para forçar atualização
  ]);

  return stats;
};
