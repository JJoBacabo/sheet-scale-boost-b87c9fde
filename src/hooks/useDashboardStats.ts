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
  recentActivity: any[];
  dailyRoasData: any[];
  loading: boolean;
}

export const useDashboardStats = (userId: string | undefined, filters?: any) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    totalProducts: 0,
    totalSpent: 0,
    totalRevenue: 0,
    averageRoas: 0,
    activeCampaigns: 0,
    totalConversions: 0,
    averageCpc: 0,
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
        // Build campaigns query with filters
        let campaignsQuery = supabase
          .from('campaigns')
          .select('*')
          .eq('user_id', userId);

        if (filters?.campaignId && filters.campaignId !== 'all') {
          campaignsQuery = campaignsQuery.eq('id', filters.campaignId);
        }
        if (filters?.platform && filters.platform !== 'all') {
          campaignsQuery = campaignsQuery.eq('platform', filters.platform);
        }

        const { data: campaigns } = await campaignsQuery;

        // Build products query with filters
        let productsQuery = supabase
          .from('products')
          .select('*')
          .eq('user_id', userId);

        if (filters?.productId && filters.productId !== 'all') {
          productsQuery = productsQuery.eq('id', filters.productId);
        }

        const { data: products } = await productsQuery;

        // Build daily ROAS query with filters
        let dailyRoasQuery = supabase
          .from('daily_roas')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(30);

        if (filters?.campaignId && filters.campaignId !== 'all') {
          dailyRoasQuery = dailyRoasQuery.eq('campaign_id', filters.campaignId);
        }
        if (filters?.dateFrom) {
          dailyRoasQuery = dailyRoasQuery.gte('date', filters.dateFrom.toISOString().split('T')[0]);
        }
        if (filters?.dateTo) {
          dailyRoasQuery = dailyRoasQuery.lte('date', filters.dateTo.toISOString().split('T')[0]);
        }

        const { data: dailyRoas } = await dailyRoasQuery;

        // Fetch recent activity
        const { data: activity } = await supabase
          .from('user_activity')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        // Calculate stats
        const totalSpent = campaigns?.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0) || 0;
        const totalRevenue = campaigns?.reduce((sum, c) => sum + (Number(c.total_revenue) || 0), 0) || 0;
        const totalConversions = campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
        const totalClicks = campaigns?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;
        const averageRoas = totalSpent > 0 ? totalRevenue / totalSpent : 0;
        const averageCpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
        const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;

        setStats({
          totalCampaigns: campaigns?.length || 0,
          totalProducts: products?.length || 0,
          totalSpent,
          totalRevenue,
          averageRoas,
          activeCampaigns,
          totalConversions,
          averageCpc,
          recentActivity: activity || [],
          dailyRoasData: dailyRoas || [],
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();

    // Subscribe to real-time updates
    const campaignsChannel = supabase
      .channel('dashboard-campaigns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns', filter: `user_id=eq.${userId}` }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `user_id=eq.${userId}` }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(campaignsChannel);
    };
  }, [userId, filters]);

  return stats;
};
