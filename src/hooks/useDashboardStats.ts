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
          .select('date, total_spent, units_sold, product_price, cog, purchases')
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

        // Calculate from daily_roas for accurate period-based stats
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
        
        // IMPORTANT: Se há filtros de data, só usar daily_roas (não usar campaigns como fallback)
        // porque campaigns não tem informação de data e representa totais acumulados
        // Se não há filtros de data, usar campaigns como fallback
        let finalTotalSpent = 0;
        let finalTotalRevenue = 0;
        
        if (filteredDailyRoas.length > 0) {
          // Usar dados de daily_roas (mais preciso e com filtro de data)
          finalTotalSpent = totalSpent;
          finalTotalRevenue = totalRevenue;
        } else if (!dateFromStr && !dateToStr) {
          // Só usar campaigns como fallback se NÃO houver filtros de data
          // porque campaigns não tem informação de data para filtrar
          finalTotalSpent = campaigns?.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0) || 0;
          finalTotalRevenue = campaigns?.reduce((sum, c) => sum + (Number(c.total_revenue) || 0), 0) || 0;
        }
        // Se há filtros de data mas não há daily_roas, finalTotalSpent e finalTotalRevenue permanecem 0
        
        const totalConversions = campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
        const totalClicks = campaigns?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;
        const averageRoas = finalTotalSpent > 0 ? finalTotalRevenue / finalTotalSpent : 0;
        const averageCpc = totalClicks > 0 ? finalTotalSpent / totalClicks : 0;
        const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
        
        // Calculate supplier cost - use daily_roas if available
        let finalTotalSupplierCost = 0;
        
        if (filteredDailyRoas.length > 0) {
          // Usar supplier cost de daily_roas (mais preciso)
          finalTotalSupplierCost = totalSupplierCost;
        } else if (!dateFromStr && !dateToStr) {
          // Só usar products como fallback se NÃO houver filtros de data
          // porque products não tem informação de data para filtrar
          finalTotalSupplierCost = products?.reduce((sum, p) => {
            const costPrice = Number(p.cost_price) || 0;
            const quantitySold = Number(p.quantity_sold) || 0;
            return sum + (costPrice * quantitySold);
          }, 0) || 0;
        } else if (finalTotalRevenue > 0 && campaigns && campaigns.length > 0) {
          // Se há filtros de data mas não há daily_roas, tentar estimar supplier cost
          // baseado na proporção média de supplier cost vs revenue das campanhas
          // Calcular proporção média de supplier cost das campanhas que têm dados
          const campaignsWithData = campaigns.filter(c => {
            const revenue = Number(c.total_revenue) || 0;
            const spent = Number(c.total_spent) || 0;
            return revenue > 0;
          });
          
          if (campaignsWithData.length > 0) {
            // Estimar supplier cost como uma proporção da receita
            // Assumindo que supplier cost é aproximadamente 30-40% da receita (margem típica)
            // Mas podemos melhorar isso calculando a partir dos produtos relacionados
            // Por enquanto, usar uma estimativa conservadora baseada na receita
            const avgMargin = campaignsWithData.reduce((sum, c) => {
              const revenue = Number(c.total_revenue) || 0;
              const spent = Number(c.total_spent) || 0;
              // Margem = (receita - gasto) / receita
              const margin = revenue > 0 ? (revenue - spent) / revenue : 0;
              return sum + margin;
            }, 0) / campaignsWithData.length;
            
            // Supplier cost estimado = receita * (1 - margem média - margem de lucro estimada)
            // Assumindo que supplier cost é ~30-40% da receita quando há margem positiva
            const estimatedSupplierCostRatio = avgMargin > 0 ? Math.max(0.3, 1 - avgMargin - 0.1) : 0.35;
            finalTotalSupplierCost = finalTotalRevenue * estimatedSupplierCostRatio;
          }
        }
        // Se não há dados suficientes, finalTotalSupplierCost permanece 0

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
    filters?.storeId,
    filters?.refreshKey // Incluir refreshKey para forçar atualização
  ]);

  return stats;
};
