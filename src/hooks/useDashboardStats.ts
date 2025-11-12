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

        // Build products query with filters - select cost_price, selling_price, quantity_sold, and product_name for matching
        let productsQuery = supabase
          .from('products')
          .select('id, cost_price, selling_price, quantity_sold, integration_id, product_name')
          .eq('user_id', userId);

        if (filters?.productId && filters.productId !== 'all') {
          productsQuery = productsQuery.eq('id', filters.productId);
        }
        if (filters?.storeId && filters.storeId !== 'all') {
          productsQuery = productsQuery.eq('integration_id', filters.storeId);
        }

        const { data: products } = await productsQuery;

        // Build daily ROAS query with filters - select all fields needed for calculations
        let dailyRoasQuery = supabase
          .from('daily_roas')
          .select('date, total_spent, units_sold, product_price, cog, purchases, cpc, campaign_name, campaign_id')
          .eq('user_id', userId)
          .order('date', { ascending: true }); // Ascending para ter dados do mais antigo para o mais recente

        // Apply date filters at query level for better performance
        let dateFromStr: string | null = null;
        let dateToStr: string | null = null;
        
        if (filters?.dateFrom) {
          const dateFrom = new Date(filters.dateFrom);
          dateFrom.setHours(0, 0, 0, 0);
          dateFromStr = dateFrom.toISOString().split('T')[0];
          dailyRoasQuery = dailyRoasQuery.gte('date', dateFromStr);
        }
        if (filters?.dateTo) {
          const dateTo = new Date(filters.dateTo);
          dateTo.setHours(23, 59, 59, 999);
          dateToStr = dateTo.toISOString().split('T')[0];
          dailyRoasQuery = dailyRoasQuery.lte('date', dateToStr);
        }
        
        // Only apply default filter if no date filters are provided
        if (!filters?.dateFrom && !filters?.dateTo) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          dailyRoasQuery = dailyRoasQuery.gte('date', thirtyDaysAgo.toISOString().split('T')[0]);
        }

        if (filters?.campaignId && filters.campaignId !== 'all') {
          dailyRoasQuery = dailyRoasQuery.eq('campaign_id', filters.campaignId);
        }
        
        // Note: daily_roas doesn't have integration_id, so we filter products separately
        // and use those product prices/costs in calculations

        const { data: dailyRoas, error: dailyRoasError } = await dailyRoasQuery;
        
        if (dailyRoasError) {
          console.error('❌ Error fetching daily_roas:', dailyRoasError);
        }

        // Fetch recent activity - only select needed fields
        const { data: activity } = await supabase
          .from('user_activity')
          .select('id, action_type, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        // Daily ROAS is already filtered by query, no need for manual filtering
        const filteredDailyRoas = dailyRoas || [];

        // Calcular todas as métricas a partir de daily_roas (já filtrado por data)
        const totalSpent = filteredDailyRoas.reduce((sum: number, d: any) => {
          const spent = Number(d.total_spent) || 0;
          return sum + spent;
        }, 0);
        
        const totalRevenue = filteredDailyRoas.reduce((sum: number, d: any) => {
          let unitsSold = Number(d.units_sold) || Number(d.purchases) || 0;
          let productPrice = Number(d.product_price) || 0;
          
          // Se product_price está vazio, buscar selling_price médio dos produtos
          if (productPrice === 0 && unitsSold > 0 && products && products.length > 0) {
            const validProducts = products.filter(p => p.selling_price && p.selling_price > 0);
            if (validProducts.length > 0) {
              productPrice = validProducts.reduce((sum, p) => sum + Number(p.selling_price), 0) / validProducts.length;
            }
          }
          
          return sum + (unitsSold * productPrice);
        }, 0);
        
        const totalConversions = filteredDailyRoas.reduce((sum: number, d: any) => {
          // Conversions = purchases (mais preciso) ou units_sold como fallback
          const purchases = Number(d.purchases) || Number(d.units_sold) || 0;
          return sum + purchases;
        }, 0);
        
        
        // Calcular supplier cost a partir de daily_roas.cog ou produtos
        const totalSupplierCost = filteredDailyRoas.reduce((sum: number, d: any) => {
          let cog = Number(d.cog) || 0;
          
          // Se cog está vazio, calcular a partir dos produtos usando cost_price médio
          if (cog === 0 && products && products.length > 0) {
            const unitsSold = Number(d.units_sold) || Number(d.purchases) || 0;
            if (unitsSold > 0) {
              const validProducts = products.filter(p => p.cost_price && p.cost_price > 0);
              if (validProducts.length > 0) {
                const avgCostPrice = validProducts.reduce((sum, p) => sum + Number(p.cost_price), 0) / validProducts.length;
                cog = avgCostPrice * unitsSold;
              }
            }
          }
          
          return sum + cog;
        }, 0);
        
        
        // Calcular total clicks a partir de daily_roas (usando cpc e total_spent)
        const totalClicks = filteredDailyRoas.reduce((sum: number, d: any) => {
          const spent = Number(d.total_spent) || 0;
          const cpc = Number(d.cpc) || 0;
          if (cpc > 0) {
            return sum + (spent / cpc);
          }
          return sum;
        }, 0);
        
        // Always use daily_roas when available (already filtered by date at query level)
        let finalTotalSpent = 0;
        let finalTotalRevenue = 0;
        let finalTotalConversions = 0;
        let finalTotalSupplierCost = 0;
        let finalTotalClicks = 0;
        
        if (filteredDailyRoas.length > 0) {
          finalTotalSpent = totalSpent;
          finalTotalRevenue = totalRevenue;
          finalTotalConversions = totalConversions;
          finalTotalSupplierCost = totalSupplierCost;
          finalTotalClicks = totalClicks;
          // If revenue is still 0 but there's spend, try campaigns fallback
          if (finalTotalRevenue === 0 && finalTotalSpent > 0) {
            const revenueFromCampaigns = campaigns?.reduce((sum, c) => sum + (Number(c.total_revenue) || 0), 0) || 0;
            if (revenueFromCampaigns > 0) {
              finalTotalRevenue = revenueFromCampaigns;
            }
          }
          
          // If conversions is still 0 but there's spend, try campaigns fallback
          if (finalTotalConversions === 0 && finalTotalSpent > 0) {
            const conversionsFromCampaigns = campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
            if (conversionsFromCampaigns > 0) {
              finalTotalConversions = conversionsFromCampaigns;
            }
          }
        } else {
          // Fallback: no daily_roas data, use campaigns/products as fallback
          finalTotalSpent = campaigns?.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0) || 0;
          finalTotalRevenue = campaigns?.reduce((sum, c) => sum + (Number(c.total_revenue) || 0), 0) || 0;
          finalTotalConversions = campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
          finalTotalClicks = campaigns?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;
          
          // Calculate supplier cost from products if available
          if (products && products.length > 0) {
            let filteredProducts = products;
            if (filters?.storeId && filters.storeId !== 'all') {
              filteredProducts = products.filter(p => p.integration_id === filters.storeId);
            }
            finalTotalSupplierCost = filteredProducts.reduce((sum, p) => {
              const costPrice = Number(p.cost_price) || 0;
              const quantitySold = Number(p.quantity_sold) || 0;
              return sum + (costPrice * quantitySold);
            }, 0);
          } else if (campaigns && campaigns.length > 0 && finalTotalRevenue > 0) {
            // Estimate based on campaign revenue (last resort)
            finalTotalSupplierCost = finalTotalRevenue * 0.35;
          }
        }
        
        
        // Calcular ROAS e CPC
        const averageRoas = finalTotalSpent > 0 ? finalTotalRevenue / finalTotalSpent : 0;
        const averageCpc = finalTotalClicks > 0 ? finalTotalSpent / finalTotalClicks : 0;
        const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;

        setStats({
          totalCampaigns: campaigns?.length || 0,
          totalProducts: products?.length || 0,
          totalSpent: finalTotalSpent,
          totalRevenue: finalTotalRevenue,
          averageRoas,
          activeCampaigns,
          totalConversions: finalTotalConversions,
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
    filters?.storeId,
    filters?.refreshKey // Incluir refreshKey para forçar atualização
  ]);

  return stats;
};
