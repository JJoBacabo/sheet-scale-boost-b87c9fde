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

        // Build products query with filters - only select needed fields
        let productsQuery = supabase
          .from('products')
          .select('id, cost_price, quantity_sold')
          .eq('user_id', userId);

        if (filters?.productId && filters.productId !== 'all') {
          productsQuery = productsQuery.eq('id', filters.productId);
        }
        if (filters?.storeId && filters.storeId !== 'all') {
          productsQuery = productsQuery.eq('integration_id', filters.storeId);
        }

        const { data: products } = await productsQuery;

        // Build daily ROAS query with filters - only select needed fields
        let dailyRoasQuery = supabase
          .from('daily_roas')
          .select('date, total_spent, units_sold, product_price, cog, purchases, cpc')
          .eq('user_id', userId)
          .order('date', { ascending: true }); // Ascending para ter dados do mais antigo para o mais recente

        // Apply date filters at query level for better performance
        // Usar apenas a data (sem hora) para comparação, já que a coluna date é do tipo DATE
        // Criar strings de data consistentes para usar tanto na query quanto no filtro manual
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
          // Use lte to include the end date (works correctly even when dateFrom === dateTo)
          dailyRoasQuery = dailyRoasQuery.lte('date', dateToStr);
        }
        
        // Track if user explicitly provided date filters (vs default)
        const hasExplicitDateFilters = !!(filters?.dateFrom || filters?.dateTo);
        
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
        
        // Note: daily_roas doesn't have integration_id, so we filter products separately
        // and use those product prices/costs in calculations

        const { data: dailyRoas } = await dailyRoasQuery;

        // Fetch recent activity - only select needed fields
        const { data: activity } = await supabase
          .from('user_activity')
          .select('id, action_type, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        // Filter daily_roas by date range if provided (already filtered at query level, but double-check)
        // Usar as strings de data já criadas acima para consistência
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

        // Determinar se há filtros de data explícitos do usuário
        const hasExplicitDateFilters = !!(filters?.dateFrom || filters?.dateTo);

        // CRITICAL: Quando há filtros de data explícitos, TODOS os cálculos devem usar APENAS daily_roas
        // Não usar fallback para campaigns ou products, pois não respeitam o timeframe
        
        // Calcular todas as métricas a partir de daily_roas
        const totalSpent = filteredDailyRoas.reduce((sum: number, d: any) => sum + (Number(d.total_spent) || 0), 0);
        const totalRevenue = filteredDailyRoas.reduce((sum: number, d: any) => {
          // Revenue = units_sold * product_price
          const unitsSold = Number(d.units_sold) || 0;
          const productPrice = Number(d.product_price) || 0;
          return sum + (unitsSold * productPrice);
        }, 0);
        const totalSupplierCost = filteredDailyRoas.reduce((sum: number, d: any) => {
          // Supplier cost = cog (já é o custo total: cost_price * units_sold)
          const cog = Number(d.cog) || 0;
          return sum + cog;
        }, 0);
        const totalConversions = filteredDailyRoas.reduce((sum: number, d: any) => sum + (Number(d.purchases) || 0), 0);
        
        // Calcular total clicks a partir de daily_roas (usando cpc e total_spent)
        // clicks = total_spent / cpc (se cpc > 0)
        const totalClicks = filteredDailyRoas.reduce((sum: number, d: any) => {
          const spent = Number(d.total_spent) || 0;
          const cpc = Number(d.cpc) || 0;
          if (cpc > 0) {
            return sum + (spent / cpc);
          }
          return sum;
        }, 0);
        
        // Se há filtros de data explícitos, usar APENAS dados de daily_roas
        // Se não há filtros de data explícitos, usar daily_roas se disponível, senão fallback para campaigns
        let finalTotalSpent = 0;
        let finalTotalRevenue = 0;
        let finalTotalConversions = 0;
        let finalTotalSupplierCost = 0;
        let finalTotalClicks = 0;
        
        if (hasExplicitDateFilters) {
          // Com filtros de data explícitos: usar APENAS daily_roas (mesmo que vazio)
          finalTotalSpent = totalSpent;
          finalTotalRevenue = totalRevenue;
          finalTotalConversions = totalConversions;
          finalTotalSupplierCost = totalSupplierCost;
          finalTotalClicks = totalClicks;
        } else {
          // Sem filtros de data explícitos: usar daily_roas se disponível, senão fallback
          if (filteredDailyRoas.length > 0) {
            // Usar dados de daily_roas (já filtrado por default de 90 dias)
            finalTotalSpent = totalSpent;
            finalTotalRevenue = totalRevenue;
            finalTotalConversions = totalConversions;
            finalTotalSupplierCost = totalSupplierCost;
            finalTotalClicks = totalClicks;
          } else {
            // Fallback para campaigns quando não há daily_roas e não há filtros de data
            finalTotalSpent = campaigns?.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0) || 0;
            finalTotalRevenue = campaigns?.reduce((sum, c) => sum + (Number(c.total_revenue) || 0), 0) || 0;
            finalTotalConversions = campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
            finalTotalClicks = campaigns?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;
            
            // Para supplier cost, tentar products primeiro
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
            } else if (campaigns && campaigns.length > 0) {
              // Estimar baseado na receita das campanhas
              const campaignsWithData = campaigns.filter(c => {
                const revenue = Number(c.total_revenue) || 0;
                return revenue > 0;
              });
              if (campaignsWithData.length > 0) {
                const totalRevenueFromCampaigns = campaignsWithData.reduce((sum, c) => {
                  return sum + (Number(c.total_revenue) || 0);
                }, 0);
                finalTotalSupplierCost = totalRevenueFromCampaigns * 0.35;
              }
            }
          }
        }
        
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
