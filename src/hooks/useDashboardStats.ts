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

export const useDashboardStats = (userId: string | undefined, filters?: { dateFrom?: Date; dateTo?: Date; campaignId?: string; platform?: string; productId?: string; refreshKey?: number }) => {
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
        // Debug: log filters to see if they're being applied
        if (filters?.dateFrom || filters?.dateTo) {
          console.log('📅 useDashboardStats filters:', {
            dateFrom: filters.dateFrom?.toISOString().split('T')[0],
            dateTo: filters.dateTo?.toISOString().split('T')[0],
            dateFromTime: filters.dateFrom?.getTime(),
            dateToTime: filters.dateTo?.getTime(),
          });
        }
        // Build campaigns query with filters - only select needed fields
        let campaignsQuery = supabase
          .from('campaigns')
          .select('id, status, total_spent, total_revenue, conversions, clicks')
          .eq('user_id', userId);

        if (filters?.campaignId && filters.campaignId !== 'all') {
          campaignsQuery = campaignsQuery.eq('id', filters.campaignId);
        }
        if (filters?.platform && filters.platform !== 'all') {
          campaignsQuery = campaignsQuery.eq('platform', filters.platform);
        }

        const { data: campaigns } = await campaignsQuery;

        // Build products query with filters - only select needed fields
        let productsQuery = supabase
          .from('products')
          .select('id, cost_price, quantity_sold')
          .eq('user_id', userId);

        if (filters?.productId && filters.productId !== 'all') {
          productsQuery = productsQuery.eq('id', filters.productId);
        }

        const { data: products } = await productsQuery;

        // Build daily ROAS query with filters - only select needed fields
        let dailyRoasQuery = supabase
          .from('daily_roas')
          .select('date, total_spent, units_sold, product_price, cog, purchases')
          .eq('user_id', userId)
          .order('date', { ascending: true }); // Ascending para ter dados do mais antigo para o mais recente

        // Apply date filters at query level for better performance
        if (filters?.dateFrom) {
          const dateFromStr = filters.dateFrom.toISOString().split('T')[0];
          dailyRoasQuery = dailyRoasQuery.gte('date', dateFromStr);
        }
        if (filters?.dateTo) {
          const dateToStr = filters.dateTo.toISOString().split('T')[0];
          dailyRoasQuery = dailyRoasQuery.lte('date', dateToStr);
        }
        
        // Only apply default filter if no date filters are provided
        if (!filters?.dateFrom && !filters?.dateTo) {
          // Default to last 90 days if no date filter
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          dailyRoasQuery = dailyRoasQuery.gte('date', ninetyDaysAgo.toISOString().split('T')[0]);
        }

        if (filters?.campaignId && filters.campaignId !== 'all') {
          dailyRoasQuery = dailyRoasQuery.eq('campaign_id', filters.campaignId);
        }

        const { data: dailyRoas } = await dailyRoasQuery;
        
        // Debug: log query results
        if (filters?.dateFrom || filters?.dateTo) {
          console.log('📊 Daily ROAS query results:', {
            totalRecords: dailyRoas?.length || 0,
            dateRange: dailyRoas?.length > 0 ? {
              first: dailyRoas[0]?.date,
              last: dailyRoas[dailyRoas.length - 1]?.date,
            } : null,
            sampleRecords: dailyRoas?.slice(0, 3).map((d: any) => ({
              date: d.date,
              units_sold: d.units_sold,
              cog: d.cog,
              total_spent: d.total_spent,
            })),
          });
        }

        // Fetch recent activity - only select needed fields
        const { data: activity } = await supabase
          .from('user_activity')
          .select('id, action_type, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        // Calculate stats from daily_roas (more accurate with date filters)
        const dateFromStr = filters?.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : null;
        const dateToStr = filters?.dateTo ? filters.dateTo.toISOString().split('T')[0] : null;
        
        // Filter daily_roas by date range if provided (already filtered at query level, but double-check)
        let filteredDailyRoas = dailyRoas || [];
        if (dateFromStr) {
          filteredDailyRoas = filteredDailyRoas.filter((d: any) => {
            const recordDate = d.date?.split('T')[0] || d.date; // Handle both date strings and full ISO strings
            return recordDate >= dateFromStr;
          });
        }
        if (dateToStr) {
          filteredDailyRoas = filteredDailyRoas.filter((d: any) => {
            const recordDate = d.date?.split('T')[0] || d.date; // Handle both date strings and full ISO strings
            return recordDate <= dateToStr;
          });
        }

        // Calculate from daily_roas for accurate period-based stats
        const totalSpent = filteredDailyRoas.reduce((sum: number, d: any) => sum + (Number(d.total_spent) || 0), 0);
        const totalRevenue = filteredDailyRoas.reduce((sum: number, d: any) => {
          // Revenue = units_sold * product_price
          const unitsSold = Number(d.units_sold) || 0;
          const productPrice = Number(d.product_price) || 0;
          return sum + (unitsSold * productPrice);
        }, 0);
        const totalSupplierCost = filteredDailyRoas.reduce((sum: number, d: any) => {
          // Supplier cost = units_sold * cog
          const unitsSold = Number(d.units_sold) || 0;
          const cog = Number(d.cog) || 0;
          return sum + (unitsSold * cog);
        }, 0);
        
        // Fallback to campaigns if no daily_roas data
        const totalSpentFromCampaigns = campaigns?.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0) || 0;
        const totalRevenueFromCampaigns = campaigns?.reduce((sum, c) => sum + (Number(c.total_revenue) || 0), 0) || 0;
        
        const finalTotalSpent = filteredDailyRoas.length > 0 ? totalSpent : totalSpentFromCampaigns;
        const finalTotalRevenue = filteredDailyRoas.length > 0 ? totalRevenue : totalRevenueFromCampaigns;
        
        const totalConversions = campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
        const totalClicks = campaigns?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;
        const averageRoas = finalTotalSpent > 0 ? finalTotalRevenue / finalTotalSpent : 0;
        const averageCpc = totalClicks > 0 ? finalTotalSpent / totalClicks : 0;
        const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
        
        // Calculate supplier cost - use daily_roas if available, otherwise use products
        // For products, we need to filter by date range if filters are provided
        let totalSupplierCostFromProducts = 0;
        if (products && products.length > 0) {
          // If we have date filters, we can't accurately calculate supplier cost from products
          // because products don't have date information. So we use the daily_roas calculation
          // or estimate based on the revenue ratio
          if (filteredDailyRoas.length === 0 && finalTotalRevenue > 0) {
            // Estimate supplier cost based on average margin from campaigns
            // This is a fallback when no daily_roas data exists
            const avgMargin = campaigns?.length > 0 
              ? campaigns.reduce((sum, c) => {
                  const revenue = Number(c.total_revenue) || 0;
                  const spent = Number(c.total_spent) || 0;
                  return sum + (revenue > 0 ? (revenue - spent) / revenue : 0);
                }, 0) / campaigns.length
              : 0;
            // Estimate supplier cost as a percentage of revenue (rough estimate)
            totalSupplierCostFromProducts = finalTotalRevenue * 0.3; // Rough estimate: 30% of revenue
          } else {
            // Use products data when no daily_roas and no date filters
            totalSupplierCostFromProducts = products.reduce((sum, p) => {
              const costPrice = Number(p.cost_price) || 0;
              const quantitySold = Number(p.quantity_sold) || 0;
              return sum + (costPrice * quantitySold);
            }, 0);
          }
        }
        
        // Use daily_roas supplier cost if available, otherwise use products estimate
        const finalTotalSupplierCost = filteredDailyRoas.length > 0 ? totalSupplierCost : totalSupplierCostFromProducts;
        
        // Debug: log supplier cost calculation
        if (filters?.dateFrom || filters?.dateTo) {
          console.log('💰 Supplier Cost calculation:', {
            filteredDailyRoasCount: filteredDailyRoas.length,
            totalSupplierCostFromDailyRoas: totalSupplierCost,
            totalSupplierCostFromProducts: totalSupplierCostFromProducts,
            finalTotalSupplierCost: finalTotalSupplierCost,
            dailyRoasWithCog: filteredDailyRoas.filter((d: any) => d.cog > 0).length,
          });
        }

        setStats({
          totalCampaigns: campaigns?.length || 0,
          totalProducts: products?.length || 0,
          totalSpent: finalTotalSpent,
          totalRevenue: finalTotalRevenue,
          averageRoas,
          activeCampaigns,
          totalConversions,
          averageCpc,
          totalSupplierCost: finalTotalSupplierCost,
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
    filters?.refreshKey // Incluir refreshKey para forçar atualização
  ]);

  return stats;
};
