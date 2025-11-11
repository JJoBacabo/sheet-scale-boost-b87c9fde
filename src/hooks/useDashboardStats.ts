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

        // Calcular todas as métricas a partir de daily_roas (já filtrado por data)
        const totalSpent = filteredDailyRoas.reduce((sum: number, d: any) => {
          const spent = Number(d.total_spent) || 0;
          return sum + spent;
        }, 0);
        
        const totalRevenue = filteredDailyRoas.reduce((sum: number, d: any) => {
          // Revenue = units_sold * product_price OU purchases * product_price
          // Usar units_sold primeiro, depois purchases como fallback
          let unitsSold = Number(d.units_sold) || Number(d.purchases) || 0;
          let productPrice = Number(d.product_price) || 0;
          
          // Se product_price está vazio mas há purchases/units_sold, tentar buscar dos produtos
          if (productPrice === 0 && unitsSold > 0 && products && products.length > 0) {
            const campaignName = d.campaign_name || '';
            
            // Estratégia 1: Tentar encontrar produto pelo nome da campanha
            let matchedProduct = products.find(p => {
              if (!p.product_name || !p.selling_price) return false;
              const productName = p.product_name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
              const cleanCampaignName = campaignName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
              
              if (productName.length > 3 && cleanCampaignName.length > 3) {
                // Verificar se o nome do produto está no nome da campanha ou vice-versa
                if (cleanCampaignName.includes(productName) || productName.includes(cleanCampaignName)) {
                  return true;
                }
                
                // Verificar palavras-chave comuns
                const productWords = productName.split(/\s+/).filter(w => w.length > 3);
                const campaignWords = cleanCampaignName.split(/\s+/).filter(w => w.length > 3);
                const commonWords = productWords.filter(w => campaignWords.includes(w));
                return commonWords.length > 0;
              }
              
              return false;
            });
            
            // Estratégia 2: Se não encontrou por nome, usar o primeiro produto com selling_price (fallback)
            // Isso é útil quando há apenas um produto ou quando o nome não corresponde
            if (!matchedProduct && products.length === 1 && products[0].selling_price) {
              matchedProduct = products[0];
            }
            
            if (matchedProduct && matchedProduct.selling_price) {
              productPrice = Number(matchedProduct.selling_price) || 0;
            }
          }
          
          const revenue = unitsSold * productPrice;
          
          // Log quando revenue é 0 mas deveria ter valor
          if (revenue === 0 && unitsSold > 0) {
            console.log('⚠️ Revenue is 0 for entry:', {
              unitsSold,
              productPrice,
              campaignName: d.campaign_name,
              hasProducts: products && products.length > 0,
            });
          }
          
          return sum + revenue;
        }, 0);
        
        const totalConversions = filteredDailyRoas.reduce((sum: number, d: any) => {
          // Conversions = purchases (mais preciso) ou units_sold como fallback
          const purchases = Number(d.purchases) || Number(d.units_sold) || 0;
          return sum + purchases;
        }, 0);
        
        // Debug: Log sample entries to verify data structure
        if (filteredDailyRoas.length > 0 && filteredDailyRoas.length <= 5) {
          console.log('📊 Sample daily_roas entries:', filteredDailyRoas.map(d => ({
            date: d.date,
            total_spent: d.total_spent,
            units_sold: d.units_sold,
            purchases: d.purchases,
            product_price: d.product_price,
            cog: d.cog,
            revenue: (Number(d.units_sold) || Number(d.purchases) || 0) * (Number(d.product_price) || 0),
          })));
        }
        
        // Calcular supplier cost a partir de daily_roas.cog
        let totalSupplierCostFromDailyRoas = filteredDailyRoas.reduce((sum: number, d: any) => {
          const cog = Number(d.cog) || 0;
          return sum + cog;
        }, 0);
        
        // Se o cog no daily_roas estiver vazio ou 0, calcular a partir dos produtos
        // Buscar produtos que correspondem aos produtos no daily_roas e calcular o cost
        let totalSupplierCostFromProducts = 0;
        
        // Sempre tentar calcular supplier cost dos produtos se cog estiver vazio no daily_roas
        // Isso garante que mesmo que o cog não esteja no daily_roas, podemos calcular a partir dos produtos
        if (filteredDailyRoas.length > 0) {
          // Buscar todos os produtos com cost_price definido
          const productsWithCost = (products || []).filter(p => p.cost_price !== null && p.cost_price !== 0);
          
          // Para cada entrada no daily_roas, tentar encontrar o produto correspondente
          for (const dailyEntry of filteredDailyRoas) {
            const unitsSold = Number(dailyEntry.units_sold) || Number(dailyEntry.purchases) || 0;
            const productPrice = Number(dailyEntry.product_price) || 0;
            const entryCog = Number(dailyEntry.cog) || 0;
            const campaignName = dailyEntry.campaign_name || '';
            
            // Se já tem cog calculado, não precisa buscar dos produtos para esta entrada
            if (entryCog > 0) {
              continue;
            }
            
            // Tentar encontrar produto mesmo se productPrice estiver vazio
            if (unitsSold > 0) {
              let matchedProduct: any = null;
              
              // Estratégia 1: Se productPrice está disponível, tentar encontrar pelo preço (mais confiável)
              if (productPrice > 0) {
                matchedProduct = productsWithCost.find(p => {
                  const sellingPrice = Number(p.selling_price) || 0;
                  return Math.abs(sellingPrice - productPrice) < 0.01; // Tolerância para diferenças de ponto flutuante
                });
              }
              
              // Estratégia 2: Se não encontrou por preço, tentar por nome da campanha
              if (!matchedProduct && campaignName) {
                const cleanCampaignName = campaignName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
                matchedProduct = productsWithCost.find(p => {
                  if (!p.product_name) return false;
                  const productName = p.product_name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
                  
                  // Verificar correspondência exata ou parcial
                  if (productName.length > 3 && cleanCampaignName.length > 3) {
                    // Verificar se o nome do produto está no nome da campanha ou vice-versa
                    if (cleanCampaignName.includes(productName) || productName.includes(cleanCampaignName)) {
                      return true;
                    }
                    
                    // Verificar palavras-chave comuns (palavras com mais de 3 caracteres)
                    const productWords = productName.split(/\s+/).filter(w => w.length > 3);
                    const campaignWords = cleanCampaignName.split(/\s+/).filter(w => w.length > 3);
                    
                    // Se há pelo menos uma palavra em comum significativa
                    const commonWords = productWords.filter(w => campaignWords.includes(w));
                    if (commonWords.length > 0) {
                      return true;
                    }
                  }
                  
                  return false;
                });
              }
              
              if (matchedProduct && matchedProduct.cost_price) {
                const costPrice = Number(matchedProduct.cost_price) || 0;
                totalSupplierCostFromProducts += costPrice * unitsSold;
              }
            }
          }
        }
        
        // Usar supplier cost de daily_roas se disponível, senão usar dos produtos
        // Se ambos estiverem disponíveis, somar ambos (daily_roas pode ter alguns, products pode ter outros)
        // Mas se daily_roas tem cog > 0, preferir usar apenas daily_roas para evitar duplicação
        const totalSupplierCost = totalSupplierCostFromDailyRoas > 0 
          ? totalSupplierCostFromDailyRoas 
          : totalSupplierCostFromProducts;
        
        
        // Calcular total clicks a partir de daily_roas (usando cpc e total_spent)
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
        
        // Sempre usar daily_roas quando disponível (já está filtrado por data)
        // Se não houver dados em daily_roas, usar fallback para campaigns/products
        if (filteredDailyRoas.length > 0) {
          // Usar dados de daily_roas (já filtrado por data ou default de 90 dias)
          finalTotalSpent = totalSpent;
          finalTotalRevenue = totalRevenue;
          finalTotalConversions = totalConversions;
          finalTotalSupplierCost = totalSupplierCost;
          finalTotalClicks = totalClicks;
          
          // Se revenue está 0 mas há dados em daily_roas, tentar buscar de campaigns
          // Isso pode acontecer se product_price ou units_sold estiverem vazios no daily_roas
          if (finalTotalRevenue === 0 && finalTotalSpent > 0) {
            const revenueFromCampaigns = campaigns?.reduce((sum, c) => sum + (Number(c.total_revenue) || 0), 0) || 0;
            if (revenueFromCampaigns > 0) {
              // Usar revenue de campaigns como fallback quando daily_roas não tem revenue
              // Nota: Se há filtros de data, isso pode não ser 100% preciso, mas é melhor que mostrar 0
              finalTotalRevenue = revenueFromCampaigns;
              console.log('💡 Using revenue from campaigns as fallback:', revenueFromCampaigns);
            }
          }
          
          // Se conversions está 0 mas há dados, tentar usar de campaigns como fallback
          if (finalTotalConversions === 0 && finalTotalSpent > 0) {
            const conversionsFromCampaigns = campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
            if (conversionsFromCampaigns > 0) {
              finalTotalConversions = conversionsFromCampaigns;
            }
          }
          
          // Log para debug quando revenue ainda está 0
          if (finalTotalRevenue === 0 && finalTotalSpent > 0) {
            console.warn('⚠️ Revenue is still 0 after fallback:', {
              totalSpent: finalTotalSpent,
              totalRevenue: finalTotalRevenue,
              filteredDailyRoasEntries: filteredDailyRoas.length,
              revenueFromCampaigns: campaigns?.reduce((sum, c) => sum + (Number(c.total_revenue) || 0), 0) || 0,
              campaignsCount: campaigns?.length || 0,
              sampleEntry: filteredDailyRoas[0] ? {
                units_sold: filteredDailyRoas[0].units_sold,
                purchases: filteredDailyRoas[0].purchases,
                product_price: filteredDailyRoas[0].product_price,
                campaign_name: filteredDailyRoas[0].campaign_name,
              } : null,
            });
          }
        } else {
          // Fallback: não há dados em daily_roas, usar campaigns/products
          // IMPORTANTE: Se há filtros de data explícitos, não devemos usar campaigns como fallback
          // porque campaigns não tem informação de data
          if (hasExplicitDateFilters) {
            // Com filtros de data mas sem daily_roas: mostrar 0 (não usar fallback sem data)
            finalTotalSpent = 0;
            finalTotalRevenue = 0;
            finalTotalConversions = 0;
            finalTotalSupplierCost = 0;
            finalTotalClicks = 0;
          } else {
            // Sem filtros de data explícitos: usar campaigns como fallback
            finalTotalSpent = campaigns?.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0) || 0;
            finalTotalRevenue = campaigns?.reduce((sum, c) => sum + (Number(c.total_revenue) || 0), 0) || 0;
            finalTotalConversions = campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
            finalTotalClicks = campaigns?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;
            
            // Para supplier cost, usar produtos se disponível
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
              // Estimar baseado na receita das campanhas (último recurso)
              finalTotalSupplierCost = finalTotalRevenue * 0.35;
            }
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
