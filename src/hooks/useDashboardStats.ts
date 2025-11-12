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
        
        // Build daily ROAS query - THIS IS THE SOURCE OF TRUTH
        let dailyRoasQuery = supabase
          .from('daily_roas')
          .select('date, total_spent, units_sold, product_price, cog, purchases, campaign_id, cpc')
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

        // Get unique campaign IDs from daily_roas to count campaigns
        const uniqueCampaignIds = new Set((dailyRoas || []).map((d: any) => d.campaign_id));
        const totalCampaigns = uniqueCampaignIds.size;

        // Calculate ALL metrics from daily_roas (SOURCE OF TRUTH)
        // IMPORTANT: cog in daily_roas can be either total or per-unit depending on source
        // We need to handle both cases - if cog seems too small, it might be per-unit
        const totalSpent = (dailyRoas || []).reduce((sum: number, d: any) => {
          return sum + (Number(d.total_spent) || 0);
        }, 0);

        // Total Revenue = sum of (units_sold * product_price) from daily_roas
        const totalRevenue = (dailyRoas || []).reduce((sum: number, d: any) => {
          const unitsSold = Number(d.units_sold) || 0;
          const productPrice = Number(d.product_price) || 0;
          return sum + (unitsSold * productPrice);
        }, 0);

        // Total Conversions = sum of purchases from daily_roas
        const totalConversions = (dailyRoas || []).reduce((sum: number, d: any) => {
          return sum + (Number(d.purchases) || 0);
        }, 0);

        // Total Supplier Cost = sum of cog from daily_roas
        // NOTE: cog might be stored as total (units_sold * cost_price) or per-unit
        // We check: if cog > 0 and units_sold > 0 and cog < (product_price * units_sold * 0.1), 
        // it's likely per-unit, so multiply by units_sold
        const totalSupplierCost = (dailyRoas || []).reduce((sum: number, d: any) => {
          const cog = Number(d.cog) || 0;
          const unitsSold = Number(d.units_sold) || 0;
          const productPrice = Number(d.product_price) || 0;
          
          // Heuristic: if cog is very small compared to revenue, it's likely per-unit
          const revenue = unitsSold * productPrice;
          if (cog > 0 && unitsSold > 0 && revenue > 0 && cog < revenue * 0.1) {
            // Likely per-unit, multiply by units_sold
            return sum + (cog * unitsSold);
          }
          // Otherwise assume it's already total
          return sum + cog;
        }, 0);

        // Calculate total clicks from CPC and spent
        const totalClicks = (dailyRoas || []).reduce((sum: number, d: any) => {
          const spent = Number(d.total_spent) || 0;
          const cpc = Number(d.cpc) || 0;
          if (cpc > 0) {
            return sum + (spent / cpc);
          }
          return sum;
        }, 0);

        // Calculate averages
        const averageRoas = totalSpent > 0 ? totalRevenue / totalSpent : 0;
        const averageCpc = totalClicks > 0 ? totalSpent / totalClicks : 0;

        // Get active campaigns count from campaigns table (for status)
        let campaignsQuery = supabase
          .from('campaigns')
          .select('id, status')
          .eq('user_id', userId);

        if (filters?.campaignId && filters.campaignId !== 'all') {
          campaignsQuery = campaignsQuery.eq('id', filters.campaignId);
        }
        if (filters?.platform && filters.platform !== 'all') {
          campaignsQuery = campaignsQuery.eq('platform', filters.platform);
        }

        const { data: campaigns } = await campaignsQuery;
        const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;

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

        console.log('💰 Calculated metrics from daily_roas:', {
          totalSpent,
          totalRevenue,
          totalConversions,
          totalClicks,
          averageRoas,
          averageCpc,
          totalSupplierCost,
          activeCampaigns,
          totalCampaigns: totalCampaigns
        });

        setStats({
          totalCampaigns: totalCampaigns,
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

  }, [
    userId, 
    filters?.dateFrom?.getTime(),
    filters?.dateTo?.getTime(),
    filters?.campaignId, 
    filters?.platform, 
    filters?.productId,
    filters?.storeId,
    filters?.refreshKey
  ]);

  return stats;
};
