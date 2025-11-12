import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardData {
  totalRevenue: number;
  totalAdSpend: number;
  totalSupplierCost: number;
  totalConversions: number;
  averageRoas: number;
  averageCpc: number;
  totalClicks: number;
  profit: number;
  profitMargin: number;
  dailyData: Array<{
    date: string;
    revenue: number;
    adSpend: number;
    cog: number;
    conversions: number;
    clicks: number;
  }>;
}

interface UseDashboardDataProps {
  shopifyIntegrationId: string | null;
  adAccountId: string | null;
  dateFrom: string;
  dateTo: string;
}

export function useDashboardData({
  shopifyIntegrationId,
  adAccountId,
  dateFrom,
  dateTo,
}: UseDashboardDataProps) {
  const [data, setData] = useState<DashboardData>({
    totalRevenue: 0,
    totalAdSpend: 0,
    totalSupplierCost: 0,
    totalConversions: 0,
    averageRoas: 0,
    averageCpc: 0,
    totalClicks: 0,
    profit: 0,
    profitMargin: 0,
    dailyData: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      if (!shopifyIntegrationId || !adAccountId || shopifyIntegrationId === 'all' || adAccountId === 'all') {
        console.log('⚠️ Waiting for store and ad account selection');
        return;
      }

      setIsLoading(true);
      console.log('📊 Fetching dashboard data:', { shopifyIntegrationId, adAccountId, dateFrom, dateTo });

      try {
        const { data: result, error } = await supabase.functions.invoke('fetch-dashboard-stats', {
          body: {
            shopifyIntegrationId,
            adAccountId,
            dateFrom,
            dateTo,
          },
        });

        if (error) throw error;

        console.log('✅ Dashboard data received:', result);
        setData(result);
      } catch (error: any) {
        console.error('❌ Error fetching dashboard data:', error);
        toast({
          title: 'Erro ao buscar dados',
          description: error.message || 'Não foi possível buscar os dados do dashboard',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [shopifyIntegrationId, adAccountId, dateFrom, dateTo, toast]);

  return { data, isLoading };
}
