import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useLanguage } from "@/contexts/LanguageContext";
import { LoadingOverlay } from "@/components/ui/loading-spinner";
import { 
  Plus, 
  Download, 
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  RefreshCw
} from "lucide-react";
import { useTheme } from "next-themes";
import Papa from "papaparse";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FacebookCampaign {
  id: string;
  name: string;
  status: string;
  spend?: number;
  cpc?: number;
}

interface FacebookAdAccount {
  id: string;
  name: string;
  account_id: string;
}

interface DailyROASData {
  id: string;
  user_id: string;
  campaign_id: string;
  campaign_name: string;
  date: string;
  total_spent: number;
  cpc: number;
  atc: number;
  purchases: number;
  product_price: number;
  cog: number;
  units_sold: number;
  roas: number;
  margin_euros: number;
  margin_percentage: number;
  decision?: "KILL" | "MANTER" | "SCALE" | "DESCALE";
  decision_reason?: string;
}

interface Product {
  id: string;
  product_name: string;
  selling_price: number;
  cost_price: number;
  quantity_sold: number;
}

const CampaignControl = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dailyData, setDailyData] = useState<DailyROASData[]>([]);
  const [facebookCampaigns, setFacebookCampaigns] = useState<FacebookCampaign[]>([]);
  const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [selectedDecision, setSelectedDecision] = useState<DailyROASData | null>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [selectedDecisionData, setSelectedDecisionData] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<string>("today");
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [isFetchingCampaigns, setIsFetchingCampaigns] = useState(false);
  const [hasFacebookIntegration, setHasFacebookIntegration] = useState(false);
  const [hasShopifyIntegration, setHasShopifyIntegration] = useState(false);
  const [marketType, setMarketType] = useState<"low" | "mid" | "high">("low");
  const [campaignHistory, setCampaignHistory] = useState<DailyROASData[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  // Fetch campaign history when a campaign is selected
  useEffect(() => {
    const fetchCampaignHistory = async () => {
      if (!selectedCampaign || !user) {
        setCampaignHistory([]);
        return;
      }

      const campaign = facebookCampaigns.find(c => c.id === selectedCampaign);
      if (!campaign) return;

      try {
        const { data: history, error } = await supabase
          .from('daily_roas')
          .select('*')
          .eq('user_id', user.id)
          .or(`campaign_id.eq.${campaign.id},campaign_name.eq.${campaign.name}`)
          .order('date', { ascending: false });

        if (error) {
          console.error("Error fetching campaign history:", error);
          setCampaignHistory([]);
        } else {
          console.log(`📊 Found ${history?.length || 0} historical entries for campaign: ${campaign.name}`);
          setCampaignHistory((history || []) as DailyROASData[]);
        }
      } catch (error) {
        console.error("Error fetching campaign history:", error);
        setCampaignHistory([]);
      }
    };

    fetchCampaignHistory();
  }, [selectedCampaign, user, facebookCampaigns]);

  // Auto-load campaigns when ad account is selected
  useEffect(() => {
    if (selectedAdAccount && hasFacebookIntegration) {
      console.log("🔄 Auto-loading campaigns for ad account:", selectedAdAccount);
      // Clear old campaigns first
      setFacebookCampaigns([]);
      fetchFacebookCampaigns(selectedAdAccount);
    } else {
      // Clear campaigns if no account selected
      setFacebookCampaigns([]);
    }
  }, [selectedAdAccount, hasFacebookIntegration]);

  // Real-time updates for products - recalcula Daily ROAS quando produto muda
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('products-realtime-campaign-control')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('🔄 Product realtime update:', payload);
          
          // Recarrega produtos
          await fetchProducts();
          
          // Se for UPDATE, recalcula Daily ROAS que usam esse produto
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedProduct = payload.new as Product;
            console.log('♻️ Recalculating Daily ROAS for product:', updatedProduct.product_name);
            await recalculateDailyROASForProduct(updatedProduct);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Real-time updates for daily_roas
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('daily-roas-realtime-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_roas',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Daily ROAS realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setDailyData((prev) => [payload.new as DailyROASData, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDailyData((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as DailyROASData) : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setDailyData((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

   // Função para recalcular Daily ROAS quando produto é atualizado
  const recalculateDailyROASForProduct = async (updatedProduct: Product) => {
    try {
      console.log('♻️ Starting recalculation for product:', updatedProduct.product_name);
      console.log('📦 Product details:', {
        cost_price: updatedProduct.cost_price,
        selling_price: updatedProduct.selling_price,
        product_name: updatedProduct.product_name
      });
      
      // Buscar dados atualizados do banco ao invés de usar state
      const { data: currentDailyData, error: fetchError } = await supabase
        .from('daily_roas')
        .select('*')
        .order('date', { ascending: false });
      
      if (fetchError) {
        console.error('❌ Error fetching daily data:', fetchError);
        return;
      }
      
      console.log(`📊 Total Daily ROAS entries found: ${currentDailyData?.length || 0}`);
      
      // Encontrar todas as entradas de daily_roas que usam este produto
      // Match mais flexível e com log detalhado
      const affectedEntries = (currentDailyData || []).filter(entry => {
        const campaignNameLower = entry.campaign_name.toLowerCase().trim();
        const productNameLower = updatedProduct.product_name.toLowerCase().trim();
        
        // Remover espaços extras e caracteres especiais para melhor matching
        const cleanCampaign = campaignNameLower.replace(/[^a-z0-9]/g, '');
        const cleanProduct = productNameLower.replace(/[^a-z0-9]/g, '');
        
        const matches = cleanCampaign.includes(cleanProduct) || 
                       cleanProduct.includes(cleanCampaign) ||
                       campaignNameLower.includes(productNameLower) ||
                       productNameLower.includes(campaignNameLower);
        
        if (matches) {
          console.log(`✅ Match found: Campaign "${entry.campaign_name}" matches Product "${updatedProduct.product_name}"`);
        }
        
        return matches;
      });
      
      console.log(`🎯 Found ${affectedEntries.length} Daily ROAS entries to recalculate`);
      
      if (affectedEntries.length === 0) {
        console.log('⚠️ No matching entries found. Campaign names:', 
          currentDailyData?.map(e => e.campaign_name).join(', ')
        );
      }
      
      // Recalcular valores para cada entrada
      for (const entry of affectedEntries) {
        // Usar purchases ao invés de units_sold para consistência
        const unitsSold = entry.purchases || entry.units_sold || 0;
        const newCOG = (updatedProduct.cost_price || 0) * unitsSold;
        const totalRevenue = (updatedProduct.selling_price || 0) * unitsSold;
        const totalSpent = entry.total_spent || 0;
        const newMarginEuros = totalRevenue - newCOG - totalSpent;
        const newMarginPercentage = totalRevenue > 0 
          ? (newMarginEuros / totalRevenue) * 100 
          : 0;
        const newROAS = totalSpent > 0 
          ? totalRevenue / totalSpent 
          : 0;
        
        console.log(`♻️ Recalculating ${entry.campaign_name}:`, {
          oldCOG: entry.cog,
          newCOG,
          unitsSold,
          cost_price: updatedProduct.cost_price,
          totalRevenue,
          totalSpent,
          newMarginEuros,
          newMarginPercentage,
          newROAS
        });
        
        // Atualizar na database
        const { error } = await supabase
          .from('daily_roas')
          .update({
            cog: newCOG,
            margin_euros: newMarginEuros,
            margin_percentage: newMarginPercentage,
            roas: newROAS,
            product_price: updatedProduct.selling_price,
            total_revenue: totalRevenue,
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.id);
        
        if (error) {
          console.error('❌ Error updating Daily ROAS:', error);
        } else {
          console.log(`✅ Successfully recalculated ${entry.campaign_name} (ID: ${entry.id})`);
        }
      }
      
      if (affectedEntries.length > 0) {
        // Refresh explícito dos dados após recalcular
        console.log('🔄 Refreshing Daily ROAS data...');
        await fetchDailyData();
        
        toast({
          title: "✅ COG atualizado",
          description: `${affectedEntries.length} campanha(s) recalculada(s) automaticamente`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('❌ Error in recalculateDailyROASForProduct:', error);
      toast({
        title: t('common.error'),
        description: t('dailyRoas.errorUpdating'),
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const checkIntegrations = async (userId: string) => {
    try {
      console.log("🔍 Checking integrations for user:", userId);
      
      const { data: integrations, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', userId);
      
      console.log("✅ Integrations data:", integrations);
      console.log("❌ Integrations error:", error);
      
      if (error) {
        console.error("Error fetching integrations:", error);
        toast({
          title: t('common.error'),
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      const hasFacebook = integrations?.some(i => i.integration_type === 'facebook_ads') || false;
      const hasShopify = integrations?.some(i => i.integration_type === 'shopify') || false;
      
      console.log("📘 Has Facebook:", hasFacebook);
      console.log("🛍️ Has Shopify:", hasShopify);
      
      setHasFacebookIntegration(hasFacebook);
      setHasShopifyIntegration(hasShopify);
      
      return { hasFacebook, hasShopify };
    } catch (error) {
      console.error("Error checking integrations:", error);
      return { hasFacebook: false, hasShopify: false };
    }
  };

  const checkUser = async () => {
    try {
      console.log("👤 Checking user...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      
      console.log("✅ User found:", user.id);
      setUser(user); // Armazena o user no estado
      
      // Check integrations first
      const { hasFacebook, hasShopify } = await checkIntegrations(user.id);
      
      console.log("🔌 Integrations status - Facebook:", hasFacebook, "Shopify:", hasShopify);
      
      // Always fetch data
      await Promise.all([
        fetchDailyData(),
        fetchProducts(),
      ]);
      
      if (hasFacebook && hasShopify) {
        console.log("✨ Both integrations active, fetching ad accounts...");
        
        // Fetch ad accounts
        await fetchAdAccounts();
        
        // Load saved ad account from localStorage
        const savedAdAccount = localStorage.getItem('selectedAdAccount');
        if (savedAdAccount) {
          console.log("💾 Restoring saved ad account:", savedAdAccount);
          setSelectedAdAccount(savedAdAccount);
          // Campaign fetching will be triggered by useEffect
        }
      } else {
        console.log("⚠️ Missing integrations - Facebook:", hasFacebook, "Shopify:", hasShopify);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("❌ Error checking user:", error);
      navigate("/auth");
    }
  };

  const fetchDailyData = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_roas')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      setDailyData((data || []) as DailyROASData[]);
    } catch (error: any) {
      toast({
        title: t("settings.errorLoadingData"),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchAdAccounts = async () => {
    try {
      console.log("📋 Fetching ad accounts...");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("❌ No user found");
        return;
      }

      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('integration_type', 'facebook_ads')
        .maybeSingle();

      console.log("🔌 Facebook integration:", integration);
      console.log("❌ Integration error:", integrationError);

      if (!integration) {
        console.log("⚠️ No Facebook integration found");
        return;
      }

      const { data, error } = await supabase.functions.invoke('facebook-campaigns', {
        body: { action: 'listAdAccounts' }
      });

      if (error) {
        console.error("❌ Error from edge function:", error);
        throw error;
      }
      
      console.log("📊 Ad accounts response:", data);
      
      if (data?.adAccounts) {
        console.log("✅ Found", data.adAccounts.length, "ad accounts");
        setAdAccounts(data.adAccounts);
        
        // If no ad account selected yet, select the first one
        if (!selectedAdAccount && data.adAccounts.length > 0) {
          const firstAccount = data.adAccounts[0].id;
          console.log("🎯 Auto-selecting first account:", firstAccount);
          setSelectedAdAccount(firstAccount);
          localStorage.setItem('selectedAdAccount', firstAccount);
          await fetchFacebookCampaigns(firstAccount);
        }
      } else {
        console.log("⚠️ No ad accounts in response");
      }
    } catch (error: any) {
      console.error("❌ Error fetching ad accounts:", error);
      toast({
        title: t('metaDashboard.errorLoadingAccounts'),
        description: error.message || t('metaDashboard.noAccountsFound'),
        variant: "destructive"
      });
    }
  };

  const fetchFacebookCampaigns = async (adAccountId?: string) => {
    setIsFetchingCampaigns(true);
    try {
      const accountId = adAccountId || selectedAdAccount;
      
      console.log("📱 Fetching campaigns for account:", accountId);
      
      if (!accountId) {
        console.log("⚠️ No account ID provided");
        setIsFetchingCampaigns(false);
        setFacebookCampaigns([]);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("❌ No user found");
        setIsFetchingCampaigns(false);
        return;
      }

      const { data: integration } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('integration_type', 'facebook_ads')
        .maybeSingle();

      console.log("🔌 Integration check:", integration ? "Found" : "Not found");

      if (!integration) {
        toast({
          title: t('dailyRoas.facebookIntegrationNotFound'),
          description: t('dailyRoas.connectFacebookFirst'),
          variant: "destructive"
        });
        setIsFetchingCampaigns(false);
        return;
      }

      // Get date for fetching insights - use lifetime to get all historical data
      console.log("🚀 Calling edge function with account:", accountId, "using lifetime data");
      const { data, error } = await supabase.functions.invoke('facebook-campaigns', {
        body: { 
          action: 'list',
          adAccountId: accountId,
          datePreset: 'lifetime'  // Get all data since campaign started
        }
      });

      if (error) {
        console.error("❌ Edge function error:", error);
        throw error;
      }
      
      console.log("📊 Campaigns response:", data);
      
      if (data?.campaigns) {
        console.log("✅ Found", data.campaigns.length, "campaigns for account", accountId);
        setFacebookCampaigns(data.campaigns);
        
        toast({
          title: t('dailyRoas.campaignUpdated'),
          description: `${data.campaigns.length} ${t('dailyRoas.campaignsLoaded')}`
        });
      } else {
        console.log("⚠️ No campaigns in response");
        setFacebookCampaigns([]);
        
        toast({
          title: t('metaDashboard.noCampaigns'),
          description: t('dailyRoas.noActiveCampaigns'),
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("❌ Error fetching Facebook campaigns:", error);
      toast({
        title: t('metaDashboard.errorLoadingCampaigns'),
        description: error.message || t('metaDashboard.unknownErrorLoadingCampaigns'),
        variant: "destructive"
      });
      setFacebookCampaigns([]);
    } finally {
      setIsFetchingCampaigns(false);
    }
  };

  const handleAdAccountChange = (accountId: string) => {
    console.log("🎯 Changing ad account to:", accountId);
    setSelectedAdAccount(accountId);
    localStorage.setItem('selectedAdAccount', accountId);
    // Clear selected campaign when changing account
    setSelectedCampaign("");
    
    toast({
      title: t('dailyRoas.accountChanged'),
      description: t('dailyRoas.loadingNewAccount')
    });
  };

  const calculateMetrics = (data: DailyROASData): DailyROASData => {
    const totalRevenue = data.units_sold * data.product_price;
    const totalCOG = data.units_sold * data.cog;
    const margin_euros = totalRevenue - data.total_spent - totalCOG;
    const margin_percentage = totalRevenue > 0 ? (margin_euros / totalRevenue) * 100 : 0;
    const roas = data.total_spent > 0 ? totalRevenue / data.total_spent : 0;

    return {
      ...data,
      roas,
      margin_euros,
      margin_percentage,
    };
  };

  const determineDecision = (data: DailyROASData, dayNumber: number, market: "low" | "mid" | "high" = "low"): { decisao: DailyROASData["decision"], motivo: string } => {
    // Define thresholds based on market type
    const thresholds = {
      low: { spend1: 7, spend2: 9, cpc: 0.30 },
      mid: { spend1: 15, spend2: 20, cpc: 0.45 },
      high: { spend1: 25, spend2: 35, cpc: 1.00 }
    };

    const { spend1, spend2, cpc: cpcThreshold } = thresholds[market];

    // Day 1 logic
    if (dayNumber === 1) {
      // Kill if spend >= spend1 AND CPC > threshold AND no sales
      if (data.total_spent >= spend1 && data.cpc > cpcThreshold && data.purchases === 0) {
        return { 
          decisao: "KILL", 
          motivo: t('dailyRoas.decisionDay1KillHighSpend', { 
            market: market.toUpperCase(), 
            spend1: spend1, 
            cpc: cpcThreshold.toFixed(2) 
          })
        };
      }

      // Keep if has sales at spend1
      if (data.total_spent >= spend1 && data.purchases >= 1) {
        return { 
          decisao: "MANTER", 
          motivo: t('dailyRoas.decisionDay1KeepSales', { 
            market: market.toUpperCase(), 
            purchases: data.purchases 
          })
        };
      }

      // Keep if CPC < threshold and has ATC, until spend2
      if (data.total_spent >= spend1 && data.cpc < cpcThreshold && data.atc >= 1 && data.total_spent < spend2) {
        return { 
          decisao: "MANTER", 
          motivo: t('dailyRoas.decisionDay1KeepLowCPC', { 
            market: market.toUpperCase(), 
            cpc: cpcThreshold.toFixed(2), 
            atc: data.atc, 
            spend2: spend2 
          })
        };
      }

      // Kill if spend >= spend2 and no sales
      if (data.total_spent >= spend2 && data.purchases === 0) {
        return { 
          decisao: "KILL", 
          motivo: t('dailyRoas.decisionDay1KillNoSales', { 
            market: market.toUpperCase(), 
            spend2: spend2 
          })
        };
      }

      // Default: keep gathering data
      return { 
        decisao: "MANTER", 
        motivo: t('dailyRoas.decisionDay1Waiting', { 
          market: market.toUpperCase(), 
          spent: data.total_spent.toFixed(2) 
        })
      };
    }

    // Day 2+ logic
    if (dayNumber >= 2) {
      // Scale if margin > 15%
      if (data.margin_percentage > 15) {
        return { 
          decisao: "SCALE", 
          motivo: t('dailyRoas.decisionScaleHighMargin', { 
            day: dayNumber, 
            market: market.toUpperCase(), 
            margin: data.margin_percentage.toFixed(1) 
          })
        };
      }

      // Kill if negative margin
      if (data.margin_percentage < 0) {
        return { 
          decisao: "KILL", 
          motivo: t('dailyRoas.decisionKillNegativeMargin', { 
            day: dayNumber, 
            market: market.toUpperCase(), 
            margin: data.margin_percentage.toFixed(1) 
          })
        };
      }

      // Keep if margin between 0-15%
      if (data.margin_percentage >= 0 && data.margin_percentage <= 15) {
        return { 
          decisao: "MANTER", 
          motivo: t('dailyRoas.decisionKeepMediumMargin', { 
            day: dayNumber, 
            market: market.toUpperCase(), 
            margin: data.margin_percentage.toFixed(1) 
          })
        };
      }
    }

    return { 
      decisao: "MANTER", 
      motivo: t('dailyRoas.waitingForMoreData', { market: market.toUpperCase() }) 
    };
  };

  const addCampaignToDay = async () => {
    if (!selectedCampaign) {
      toast({
        title: t('dailyRoas.selectCampaign'),
        description: t('dailyRoas.selectCampaignDesc'),
        variant: "destructive"
      });
      return;
    }

    try {
      const campaign = facebookCampaigns.find(c => c.id === selectedCampaign);
      if (!campaign) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Extract insights data from Facebook API - can be multiple days
      const insightsData = (campaign as any).insights?.data || [];
      
      console.log("📊 Campaign:", campaign.name);
      console.log("📊 Found", insightsData.length, "days of insights data");
      
      if (insightsData.length === 0) {
        toast({
          title: t('dailyRoas.noInsightsTitle'),
          description: t('dailyRoas.noInsightsDesc'),
          variant: "destructive"
        });
        return;
      }

      // Match product by campaign name - more flexible matching
      const matchedProduct = products.find(p => {
        const campaignLower = campaign.name.toLowerCase();
        const productLower = p.product_name.toLowerCase();
        return campaignLower.includes(productLower) || productLower.includes(campaignLower);
      });

      console.log("📦 Matched product:", matchedProduct?.product_name || t('products.noProducts'));
      
      if (!matchedProduct) {
        toast({
          title: t('products.noProducts'),
          description: t('dailyRoas.productNotFound', { campaignName: campaign.name }),
          variant: "destructive"
        });
      }

      // Get product data if matched
      const productPrice = matchedProduct?.selling_price || 0;
      const costPrice = matchedProduct?.cost_price || 0;

      // Process each day of insights
      let addedDays = 0;
      let skippedDays = 0;

      for (const insights of insightsData) {
        // Get the date for this insight (if available, otherwise use current date)
        const insightDate = insights.date_start || insights.date_stop || 
          (selectedDay === "today" ? new Date().toISOString().split('T')[0] : selectedDay);

        console.log(`📅 Processing data for date: ${insightDate}`);

        // Check if campaign already exists for this day
        const { data: existing } = await supabase
          .from('daily_roas')
          .select('*')
          .eq('campaign_id', campaign.id)
          .eq('date', insightDate)
          .maybeSingle();

        if (existing) {
          console.log(`⏭️ Skipping ${insightDate} - already exists`);
          skippedDays++;
          continue;
        }

        // Extract actions from insights - try different action types
        const actions = insights.actions || [];
        
        // Get purchases (conversions)
        const purchaseAction = actions.find((a: any) => 
          a.action_type === 'purchase' || 
          a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
          a.action_type === 'omni_purchase'
        );
        const purchases = purchaseAction ? parseInt(purchaseAction.value) : 0;
        
        // Get ATC (add to cart)
        const atcAction = actions.find((a: any) => 
          a.action_type === 'add_to_cart' || 
          a.action_type === 'offsite_conversion.fb_pixel_add_to_cart' ||
          a.action_type === 'omni_add_to_cart'
        );
        const addToCart = atcAction ? parseInt(atcAction.value) : 0;
        
        console.log(`📊 ${insightDate} - Purchases:`, purchases, "ATC:", addToCart);
        console.log(`📊 ${insightDate} - Spend:`, insights.spend, "CPC:", insights.cpc);

        // Extract all metrics from Facebook API - ensure proper parsing
        const totalSpent = parseFloat(insights.spend || '0');
        const cpc = parseFloat(insights.cpc || '0');
        const clicks = parseInt(insights.clicks || '0', 10);
        const impressions = parseInt(insights.impressions || '0', 10);
        
        console.log(`💰 ${insightDate} - Spend:`, totalSpent, "CPC:", cpc, "Clicks:", clicks, "Impressions:", impressions);
        
        // Units sold = purchases from Facebook
        const unitsSold = purchases;
        
        console.log(`📦 ${insightDate} - Price:`, productPrice, "COG:", costPrice, "Units:", unitsSold);
        
        // Calculate revenue and margins
        const totalRevenue = unitsSold * productPrice;
        const totalCOG = unitsSold * costPrice;
        const marginEuros = totalRevenue - totalSpent - totalCOG;
        const marginPercentage = totalRevenue > 0 ? (marginEuros / totalRevenue) * 100 : 0;
        const roas = totalSpent > 0 ? totalRevenue / totalSpent : 0;
        
        console.log(`💶 ${insightDate} - Revenue:`, totalRevenue, "COG Total:", totalCOG, "Margin:", marginEuros, "ROAS:", roas);

        const newData: Partial<DailyROASData> = {
          user_id: user.id,
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          date: insightDate,
          total_spent: totalSpent,
          cpc: cpc,
          atc: addToCart,
          purchases: purchases,
          product_price: productPrice,
          cog: costPrice,
          units_sold: unitsSold,
          roas: roas,
          margin_euros: marginEuros,
          margin_percentage: marginPercentage,
        };
        
        console.log(`💾 Saving ${insightDate} to database:`, newData);

        const { error } = await supabase
          .from('daily_roas')
          .insert(newData as any);

        if (error) {
          console.error(`❌ Error saving ${insightDate}:`, error);
        } else {
          addedDays++;
          console.log(`✅ Successfully saved ${insightDate}`);
        }
      }

      await fetchDailyData();
      setSelectedCampaign("");
      setShowAddCampaign(false);
      setCampaignHistory([]);
      
      toast({
        title: t('dailyRoas.campaignAdded'),
        description: t('dailyRoas.campaignsLoaded')
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from('daily_roas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchDailyData();
      toast({ title: t('metaDashboard.deletedSuccess') });
    } catch (error: any) {
      toast({
        title: t('metaDashboard.errorDeleting'),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateDailyData = async (id: string, field: keyof DailyROASData, value: any) => {
    try {
      const { error } = await supabase
        .from('daily_roas')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      await fetchDailyData();
    } catch (error: any) {
      toast({
        title: t('settings.errorLoadingData'),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const exportToCSV = () => {
    const dataWithDecisions = dailyData.map(d => {
      const withMetrics = calculateMetrics(d);
      const dayNumber = Math.ceil((new Date().getTime() - new Date(d.date).getTime()) / (1000 * 3600 * 24)) + 1;
      const { decisao, motivo } = determineDecision(withMetrics, dayNumber, marketType);
      return { ...withMetrics, decisao, motivoDecisao: motivo };
    });

    const csv = Papa.unparse(dataWithDecisions);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-roas-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast({ title: t('dailyRoas.reportExported') });
  };

  const calculateKPIs = () => {
    const totalSpend = dailyData.reduce((sum, d) => sum + d.total_spent, 0);
    const totalRevenue = dailyData.reduce((sum, d) => sum + (d.units_sold * d.product_price), 0);
    const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const totalMargemEuros = dailyData.reduce((sum, d) => sum + d.margin_euros, 0);
    const avgMargemPerc = dailyData.length > 0 
      ? dailyData.reduce((sum, d) => sum + d.margin_percentage, 0) / dailyData.length 
      : 0;
    const totalVendas = dailyData.reduce((sum, d) => sum + d.purchases, 0);

    return { totalSpend, totalRevenue, avgROAS, totalMargemEuros, avgMargemPerc, totalVendas };
  };

  // Get unique days from dailyData
  const uniqueDays = Array.from(new Set(dailyData.map(d => d.date))).sort().reverse();
  const todayDate = new Date().toISOString().split('T')[0];
  
  // Get data for selected day
  const getFilteredData = () => {
    if (selectedDay === "today") {
      return dailyData.filter(d => d.date === todayDate);
    }
    return dailyData.filter(d => d.date === selectedDay);
  };

  const filteredData = getFilteredData();
  
  // Calculate KPIs for filtered data
  const calculateFilteredKPIs = () => {
    const totalSpend = filteredData.reduce((sum, d) => sum + d.total_spent, 0);
    const totalRevenue = filteredData.reduce((sum, d) => sum + (d.units_sold * d.product_price), 0);
    const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const totalMargemEuros = filteredData.reduce((sum, d) => sum + d.margin_euros, 0);
    const avgMargemPerc = filteredData.length > 0 
      ? filteredData.reduce((sum, d) => sum + d.margin_percentage, 0) / filteredData.length 
      : 0;
    const totalVendas = filteredData.reduce((sum, d) => sum + d.purchases, 0);

    return { totalSpend, totalRevenue, avgROAS, totalMargemEuros, avgMargemPerc, totalVendas };
  };

  const kpis = calculateFilteredKPIs();

  const chartData = filteredData.map(d => ({
    nome: d.campaign_name.substring(0, 15),
    CPC: d.cpc,
    ROAS: d.roas,
    Margem: d.margin_percentage,
    Gasto: d.total_spent,
    Receita: d.units_sold * d.product_price,
  }));

  // Helper function to get day number since campaign start
  const getCampaignDayNumber = (campaignDays: DailyROASData[], currentDate: string): number => {
    const sorted = [...campaignDays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const startDate = new Date(sorted[0].date);
    const current = new Date(currentDate);
    return Math.floor((current.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
  };

  // Group campaigns by ID first
  const groupedCampaigns = filteredData.reduce((acc, data) => {
    const campaignId = data.campaign_id;
    if (!acc[campaignId]) {
      acc[campaignId] = [];
    }
    acc[campaignId].push(data);
    return acc;
  }, {} as Record<string, DailyROASData[]>);

  // Calculate decisions for grouped data (2 days at a time, or 3 for days 29-30-31)
  const decisionsData = Object.entries(groupedCampaigns).flatMap(([campaignId, campaignDays]) => {
    // Sort by date ascending (oldest first)
    const sorted = [...campaignDays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (sorted.length < 2) {
      console.log(`⚠️ Campaign ${sorted[0]?.campaign_name} has only ${sorted.length} day(s) - need at least 2 for decision`);
      return [];
    }
    
    // Group in pairs of 2 days based on campaign day number
    const pairs: { days: DailyROASData[], dayNumbers: number[] }[] = [];
    
    // Get day numbers for each entry
    const daysWithNumbers = sorted.map((day) => ({
      data: day,
      dayNumber: getCampaignDayNumber(sorted, day.date)
    }));
    
    console.log(`📊 Campaign: ${sorted[0].campaign_name} - Days:`, daysWithNumbers.map(d => `Day ${d.dayNumber} (${d.data.date})`));
    
    // Group by pairs: Days 1-2, 3-4, 5-6, etc.
    let i = 0;
    while (i < daysWithNumbers.length) {
      const currentDayNum = daysWithNumbers[i].dayNumber;
      
      // Special case: Days 29, 30, 31 (if all present)
      if (currentDayNum === 29 && i + 2 < daysWithNumbers.length && 
          daysWithNumbers[i + 1].dayNumber === 30 && 
          daysWithNumbers[i + 2].dayNumber === 31) {
        pairs.push({
          days: [daysWithNumbers[i].data, daysWithNumbers[i + 1].data, daysWithNumbers[i + 2].data],
          dayNumbers: [29, 30, 31]
        });
        i += 3;
        continue;
      }
      
      // Normal case: pair current with next
      if (i + 1 < daysWithNumbers.length) {
        pairs.push({
          days: [daysWithNumbers[i].data, daysWithNumbers[i + 1].data],
          dayNumbers: [daysWithNumbers[i].dayNumber, daysWithNumbers[i + 1].dayNumber]
        });
        i += 2;
      } else {
        // Odd day out - skip it for now (needs one more day)
        console.log(`⏸️ Day ${currentDayNum} waiting for next day to form a pair`);
        i++;
      }
    }
    
    console.log(`✅ Created ${pairs.length} pair(s) for ${sorted[0].campaign_name}`);
    
    // Calculate decision for each pair
    return pairs.map(({ days: pair, dayNumbers }) => {
      // Calculate cumulative metrics for the pair
      const totalSpent = pair.reduce((sum, day) => sum + day.total_spent, 0);
      const totalRevenue = pair.reduce((sum, day) => sum + (day.purchases * day.product_price), 0);
      const totalCOG = pair.reduce((sum, day) => sum + (day.purchases * day.cog), 0);
      const marginEuros = totalRevenue - totalSpent - totalCOG;
      const marginPercentage = totalRevenue > 0 ? (marginEuros / totalRevenue) * 100 : 0;
      const roas = totalSpent > 0 ? totalRevenue / totalSpent : 0;
      const totalPurchases = pair.reduce((sum, day) => sum + day.purchases, 0);
      const totalAtc = pair.reduce((sum, day) => sum + day.atc, 0);
      const avgCpc = pair.reduce((sum, day) => sum + day.cpc, 0) / pair.length;
      
      // Get thresholds based on market type
      const thresholds = {
        low: { spend1: 7, spend2: 9, cpc: 0.30 },
        mid: { spend1: 15, spend2: 20, cpc: 0.45 },
        high: { spend1: 25, spend2: 35, cpc: 1.00 }
      };
      const { spend1, spend2, cpc: cpcThreshold } = thresholds[marketType];
      
      // Determine if this is the first pair (days 1-2)
      const isFirstPair = dayNumbers[0] === 1 && dayNumbers[1] === 2;
      
      let decisao: "KILL" | "MANTER" | "SCALE" = "MANTER";
      let motivo = "";
      
      const dayRangeStr = dayNumbers.length === 3 
        ? `Dias ${dayNumbers[0]}-${dayNumbers[1]}-${dayNumbers[2]}` 
        : `Dias ${dayNumbers[0]}-${dayNumbers[1]}`;
      
      const dateRangeStr = pair.length === 3
        ? `${new Date(pair[0].date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}-${new Date(pair[1].date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}-${new Date(pair[2].date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}`
        : `${new Date(pair[0].date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })} - ${new Date(pair[1].date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}`;
      
      // DAYS 1-2 Logic: Use market thresholds
      if (isFirstPair) {
        // KILL: High spend, high CPC, no sales
        if (totalSpent >= spend2 && avgCpc > cpcThreshold && totalPurchases === 0) {
          decisao = "KILL";
          motivo = `${dayRangeStr} (${marketType.toUpperCase()}): Gasto ${totalSpent.toFixed(2)}€ ≥ ${spend2}€, CPC médio ${avgCpc.toFixed(2)}€ > ${cpcThreshold}€ e sem vendas. Datas: ${dateRangeStr}`;
        }
        // KILL: Spend passed threshold without sales
        else if (totalSpent >= spend2 && totalPurchases === 0) {
          decisao = "KILL";
          motivo = `${dayRangeStr} (${marketType.toUpperCase()}): Gasto ${totalSpent.toFixed(2)}€ ≥ ${spend2}€ sem vendas. Datas: ${dateRangeStr}`;
        }
        // SCALE: Good margin even on first days
        else if (marginPercentage > 15) {
          decisao = "SCALE";
          motivo = `${dayRangeStr} (${marketType.toUpperCase()}): Margem ${marginPercentage.toFixed(1)}% > 15% com ${totalPurchases} venda(s). Gasto: ${totalSpent.toFixed(2)}€, Receita: ${totalRevenue.toFixed(2)}€. Datas: ${dateRangeStr}`;
        }
        // MANTER: Has sales or good metrics
        else if (totalPurchases >= 1 || (avgCpc < cpcThreshold && totalAtc >= 1)) {
          decisao = "MANTER";
          motivo = `${dayRangeStr} (${marketType.toUpperCase()}): ${totalPurchases} venda(s), ${totalAtc} ATC, CPC médio ${avgCpc.toFixed(2)}€ < ${cpcThreshold}€. Margem: ${marginPercentage.toFixed(1)}%. Gasto: ${totalSpent.toFixed(2)}€. Datas: ${dateRangeStr}`;
        }
        // MANTER: Still gathering data
        else {
          decisao = "MANTER";
          motivo = `${dayRangeStr} (${marketType.toUpperCase()}): Aguardando mais dados. Gasto: ${totalSpent.toFixed(2)}€, ${totalPurchases} venda(s), ${totalAtc} ATC. Datas: ${dateRangeStr}`;
        }
      }
      // DAYS 3+ Logic: Use margin-based decisions
      else {
        // SCALE: Margin > 15%
        if (marginPercentage > 15) {
          decisao = "SCALE";
          motivo = `${dayRangeStr}: Margem ${marginPercentage.toFixed(1)}% > 15%. Gasto: ${totalSpent.toFixed(2)}€, Receita: ${totalRevenue.toFixed(2)}€, Lucro: ${marginEuros.toFixed(2)}€. Datas: ${dateRangeStr}`;
        }
        // KILL: Negative margin
        else if (marginPercentage < 0) {
          decisao = "KILL";
          motivo = `${dayRangeStr}: Margem negativa ${marginPercentage.toFixed(1)}%. Gasto: ${totalSpent.toFixed(2)}€, Receita: ${totalRevenue.toFixed(2)}€, Prejuízo: ${Math.abs(marginEuros).toFixed(2)}€. Datas: ${dateRangeStr}`;
        }
        // KILL: High spend without sales
        else if (totalPurchases === 0 && totalSpent > 50) {
          decisao = "KILL";
          motivo = `${dayRangeStr}: Gasto ${totalSpent.toFixed(2)}€ > 50€ sem vendas. ${totalAtc} ATC mas sem conversões. Datas: ${dateRangeStr}`;
        }
        // MANTER: Margin between 0-15%
        else if (marginPercentage >= 0 && marginPercentage <= 15) {
          decisao = "MANTER";
          motivo = `${dayRangeStr}: Margem ${marginPercentage.toFixed(1)}% entre 0-15%. Gasto: ${totalSpent.toFixed(2)}€, Receita: ${totalRevenue.toFixed(2)}€, ${totalPurchases} venda(s). Datas: ${dateRangeStr}`;
        }
        // Default MANTER
        else {
          decisao = "MANTER";
          motivo = `${dayRangeStr}: Aguardando mais dados. Margem: ${marginPercentage.toFixed(1)}%, Gasto: ${totalSpent.toFixed(2)}€. Datas: ${dateRangeStr}`;
        }
      }
      
      return {
        id: pair.map(d => d.id).join('-'),
        campaign_id: campaignId,
        campaign_name: pair[0].campaign_name,
        dateRange: dateRangeStr,
        dayRange: dayRangeStr,
        total_spent: totalSpent,
        purchases: totalPurchases,
        atc: totalAtc,
        cpc: avgCpc,
        roas: roas,
        margin_euros: marginEuros,
        margin_percentage: marginPercentage,
        product_price: pair[0].product_price,
        cog: pair[0].cog,
        decisao,
        motivo,
        days: pair
      };
    });
  });

  const decisionCounts = {
    KILL: decisionsData.filter(d => d.decisao === "KILL").length,
    MANTER: decisionsData.filter(d => d.decisao === "MANTER").length,
    SCALE: decisionsData.filter(d => d.decisao === "SCALE").length,
    DESCALE: 0,
  };

  if (loading) {
    return <LoadingOverlay message={t('common.loading')} />;
  }

  if (!hasFacebookIntegration || !hasShopifyIntegration) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <Card className="glass-card rounded-3xl p-8 max-w-2xl mx-auto mt-20 border-2 border-border/50">
              <h2 className="text-2xl font-bold mb-4">{t("dailyRoas.integrationsNeeded")}</h2>
              <p className="text-muted-foreground mb-6">
                {t("dailyRoas.integrationsDesc")}
              </p>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${hasFacebookIntegration ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'}`}>
                  <h3 className="font-semibold mb-1">
                    {hasFacebookIntegration ? '✅ ' : '❌ '}{t("dailyRoas.facebookAds")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {hasFacebookIntegration ? t("dailyRoas.integrationActive") : t("dailyRoas.neededForCampaigns")}
                  </p>
                </div>
                <div className={`p-4 rounded-lg border ${hasShopifyIntegration ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'}`}>
                  <h3 className="font-semibold mb-1">
                    {hasShopifyIntegration ? '✅ ' : '❌ '}{t("dailyRoas.shopify")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {hasShopifyIntegration ? t("dailyRoas.integrationActive") : t("dailyRoas.neededForProducts")}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <Button onClick={() => navigate("/settings")} className="w-full">
                  {t("dailyRoas.goToSettings")}
                </Button>
              </div>
            </Card>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto">
          {/* Header */}
          <div className="glass-card rounded-2xl md:rounded-3xl p-4 md:p-6 mb-4 md:mb-6 border-2 border-border/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">{t('dailyRoas.title')}</h1>
                <p className="text-sm md:text-base text-muted-foreground">{t('dailyRoas.subtitle')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Market Type Selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('dailyRoas.market')}</label>
                  <Select value={marketType} onValueChange={(value: "low" | "mid" | "high") => setMarketType(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('dailyRoas.selectMarket')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('dailyRoas.lowBudget')}</SelectItem>
                      <SelectItem value="mid">{t('dailyRoas.midBudget')}</SelectItem>
                      <SelectItem value="high">{t('dailyRoas.highBudget')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {adAccounts.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('dailyRoas.adAccountLabel')}</label>
                    <Select value={selectedAdAccount} onValueChange={handleAdAccountChange}>
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder={t('dailyRoas.selectAdAccount')} />
                      </SelectTrigger>
                      <SelectContent>
                        {adAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Ações - Empilhadas */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('dailyRoas.actions')}</label>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      onClick={() => fetchFacebookCampaigns()}
                      disabled={isFetchingCampaigns || !selectedAdAccount}
                      className="h-9 text-sm"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isFetchingCampaigns ? 'animate-spin' : ''}`} />
                      {t('dailyRoas.updateCampaigns')}
                    </Button>
                    <Button variant="outline" onClick={exportToCSV} className="h-9 text-sm">
                      <Download className="w-4 h-4 mr-2" />
                      {t('dailyRoas.exportReport')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Tabs */}
          <Card className="glass-card rounded-2xl md:rounded-3xl p-4 md:p-6 mb-4 md:mb-6 border-2 border-border/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className="text-lg md:text-xl font-bold">{t('dailyRoas.title')} - {t('dailyRoas.campaignsByDay')}</h2>
              {!showAddCampaign && (
                <Button onClick={() => setShowAddCampaign(true)} size="sm" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('dailyRoas.addCampaign')}
                </Button>
              )}
            </div>

            {showAddCampaign && (
              <Card className="p-3 md:p-4 mb-4 border border-primary/30 bg-primary/5">
                <h3 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">{t('dailyRoas.selectFacebookCampaign')}</h3>
                
                {/* Show selected Ad Account */}
                {selectedAdAccount && (
                  <div className="mb-3 p-2 md:p-3 rounded-lg bg-muted/50 border border-border/50">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">{t('dailyRoas.adAccountLabel')}:</label>
                    <p className="text-xs md:text-sm font-semibold">
                      {adAccounts.find(acc => acc.id === selectedAdAccount)?.name || selectedAdAccount}
                    </p>
                  </div>
                )}

                {/* Campaign Selector */}
                <div className="mb-3">
                  <label className="text-xs md:text-sm font-medium mb-2 block">{t('dailyRoas.campaign')}:</label>
                  {isFetchingCampaigns ? (
                    <div className="flex items-center justify-center p-3 md:p-4 text-muted-foreground text-xs md:text-sm">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {t('dailyRoas.loadingCampaigns')}
                    </div>
                  ) : facebookCampaigns.length === 0 ? (
                    <div className="p-3 md:p-4 text-center text-muted-foreground border border-dashed rounded text-xs md:text-sm">
                      {selectedAdAccount 
                        ? t('dailyRoas.noCampaignsRefresh')
                        : t('dailyRoas.selectAdAccountFirst')}
                    </div>
                  ) : (
                    <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('dailyRoas.selectCampaignPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {facebookCampaigns
                          .filter(campaign => campaign.status === "ACTIVE")
                          .map((campaign) => (
                            <SelectItem key={campaign.id} value={campaign.id}>
                              {campaign.name} - {campaign.status}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Campaign History */}
                {campaignHistory.length > 0 && (
                  <div className="mb-4 p-4 rounded-lg bg-muted/30 border border-primary/20">
                    <h4 className="font-semibold mb-3 text-primary">📊 {t('dailyRoas.campaignHistory')} ({campaignHistory.length} {t('common.days')})</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {campaignHistory.map((entry, index) => {
                        const dayNumber = campaignHistory.length - index;
                        const { decisao, motivo } = determineDecision(entry, dayNumber, marketType);
                        
                        return (
                          <div key={entry.id} className="p-3 rounded-lg bg-background border border-border/50">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-semibold">{t('dailyRoas.day')} {dayNumber}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {new Date(entry.date).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB')}
                                </span>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                decisao === "SCALE" ? "bg-green-500/20 text-green-700 dark:text-green-400" :
                                decisao === "KILL" ? "bg-red-500/20 text-red-700 dark:text-red-400" :
                                decisao === "DESCALE" ? "bg-orange-500/20 text-orange-700 dark:text-orange-400" :
                                "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                              }`}>
                                {decisao}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">{t('dailyRoas.spent')}:</span>
                                <span className="ml-1 font-medium">{entry.total_spent.toFixed(2)}€</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">CPC:</span>
                                <span className="ml-1 font-medium">{entry.cpc.toFixed(2)}€</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t('dailyRoas.sales')}:</span>
                                <span className="ml-1 font-medium">{entry.purchases}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t('dailyRoas.atc')}:</span>
                                <span className="ml-1 font-medium">{entry.atc}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t('dailyRoas.roas')}:</span>
                                <span className="ml-1 font-medium">{entry.roas.toFixed(2)}x</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t('dailyRoas.margin')}:</span>
                                <span className={`ml-1 font-medium ${entry.margin_percentage > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {entry.margin_percentage.toFixed(1)}%
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground">{t('dailyRoas.revenue')}:</span>
                                <span className="ml-1 font-medium">{(entry.units_sold * entry.product_price).toFixed(2)}€</span>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground italic">
                              {motivo}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => { 
                      setShowAddCampaign(false); 
                      setSelectedCampaign("");
                      setCampaignHistory([]);
                    }}
                    className="w-full sm:w-auto"
                  >
                    {t('dailyRoas.cancel')}
                  </Button>
                  <Button 
                    onClick={addCampaignToDay}
                    disabled={!selectedCampaign}
                    className="w-full sm:w-auto"
                  >
                    {t('dailyRoas.add')}
                  </Button>
                </div>
              </Card>
            )}

            <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
              <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="today" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2">
                  {t('dailyRoas.today')} ({todayDate})
                </TabsTrigger>
                {uniqueDays.map((date: string) => (
                  <TabsTrigger key={date} value={date} className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2">
                    {new Date(date).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB', { day: '2-digit', month: '2-digit' })}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedDay} className="mt-6">
                {/* KPIs for selected day */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-4 md:mb-6">
                  <Card className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 border-2 border-border/50">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('dailyRoas.totalSpend')}</p>
                    <p className="text-lg md:text-2xl font-bold">{kpis.totalSpend.toFixed(2)}€</p>
                  </Card>
                  <Card className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 border-2 border-border/50">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('dailyRoas.totalRevenue')}</p>
                    <p className="text-lg md:text-2xl font-bold text-green-500">{kpis.totalRevenue.toFixed(2)}€</p>
                  </Card>
                  <Card className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 border-2 border-border/50">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('dailyRoas.averageROAS')}</p>
                    <p className="text-lg md:text-2xl font-bold">{kpis.avgROAS.toFixed(2)}</p>
                  </Card>
                  <Card className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 border-2 border-border/50">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('dailyRoas.totalMargin')}</p>
                    <p className="text-lg md:text-2xl font-bold">{kpis.totalMargemEuros.toFixed(2)}€</p>
                  </Card>
                  <Card className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 border-2 border-border/50">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('dailyRoas.averageMargin')}</p>
                    <p className="text-lg md:text-2xl font-bold">{kpis.avgMargemPerc.toFixed(1)}%</p>
                  </Card>
                  <Card className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 border-2 border-border/50">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('dailyRoas.totalSales')}</p>
                    <p className="text-lg md:text-2xl font-bold">{kpis.totalVendas}</p>
                  </Card>
                </div>

                {/* Table for selected day */}
                <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">
                  {t('dailyRoas.campaigns')} - {selectedDay === "today" ? t('dailyRoas.today') : new Date(selectedDay).toLocaleDateString()}
                </h3>
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 md:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[160px] md:min-w-[200px] text-xs md:text-sm">{t('dailyRoas.campaignName')}</TableHead>
                          <TableHead className="min-w-[90px] md:min-w-[100px] text-xs md:text-sm">{t('dailyRoas.totalSpentEur')}</TableHead>
                          <TableHead className="min-w-[70px] md:min-w-[80px] text-xs md:text-sm">{t('dailyRoas.cpcEur')}</TableHead>
                          <TableHead className="min-w-[60px] md:min-w-[80px] text-xs md:text-sm">{t('dailyRoas.atc')}</TableHead>
                          <TableHead className="min-w-[70px] md:min-w-[80px] text-xs md:text-sm">{t('dailyRoas.purchases')}</TableHead>
                          <TableHead className="min-w-[70px] md:min-w-[80px] text-xs md:text-sm">{t('dailyRoas.price')}</TableHead>
                          <TableHead className="min-w-[70px] md:min-w-[80px] text-xs md:text-sm">{t('dailyRoas.cog')} €</TableHead>
                          <TableHead className="min-w-[80px] md:min-w-[100px] text-xs md:text-sm">{t('dailyRoas.units')}</TableHead>
                          <TableHead className="min-w-[70px] md:min-w-[80px] text-xs md:text-sm">{t('dailyRoas.roas')}</TableHead>
                          <TableHead className="min-w-[100px] md:min-w-[120px] text-xs md:text-sm">{t('dailyRoas.marginEur')}</TableHead>
                          <TableHead className="min-w-[90px] md:min-w-[100px] text-xs md:text-sm">{t('dailyRoas.marginPerc')}</TableHead>
                          <TableHead className="min-w-[90px] md:min-w-[100px] text-xs md:text-sm">{t('dailyRoas.decision')}</TableHead>
                          <TableHead className="min-w-[70px] md:min-w-[80px] text-xs md:text-sm">{t('dailyRoas.actionsTable')}</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={13} className="text-center py-8 text-muted-foreground text-xs md:text-sm">
                            {t('dailyRoas.noDataForDay')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredData.map((data) => {
                          const calculated = calculateMetrics(data);
                          
                          // Calculate day number for this campaign
                          const campaignEntries = dailyData.filter(d => 
                            d.campaign_id === data.campaign_id || d.campaign_name === data.campaign_name
                          ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                          
                          const dayNumber = getCampaignDayNumber(campaignEntries, data.date);
                          const { decisao, motivo } = determineDecision(calculated, dayNumber, marketType);
                          
                          return (
                            <TableRow key={data.id}>
                              <TableCell className="font-medium text-xs md:text-sm">{data.campaign_name}</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{data.total_spent.toFixed(2)}€</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{data.cpc.toFixed(2)}€</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{data.atc}</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{data.purchases}</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{data.product_price.toFixed(2)}€</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{data.cog.toFixed(2)}€</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{data.purchases}</TableCell>
                              <TableCell className="font-semibold text-green-500 text-xs md:text-sm">{calculated.roas.toFixed(2)}</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{calculated.margin_euros.toFixed(2)}€</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{calculated.margin_percentage.toFixed(1)}%</TableCell>
                              <TableCell>
                                <div 
                                  className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                                    decisao === "SCALE" ? "bg-green-500/20 text-green-700 dark:text-green-400" :
                                    decisao === "KILL" ? "bg-red-500/20 text-red-700 dark:text-red-400" :
                                    decisao === "DESCALE" ? "bg-orange-500/20 text-orange-700 dark:text-orange-400" :
                                    "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                                  }`}
                                  title={motivo}
                                >
                                  {decisao}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteCampaign(data.id)}
                                  className="h-7 w-7 md:h-8 md:w-8 p-0"
                                >
                                  <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </div>

              </TabsContent>
            </Tabs>
          </Card>

          {/* Decision Modal */}
          <Dialog open={showDecisionModal} onOpenChange={setShowDecisionModal}>
            <DialogContent className="max-w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl text-center">📊 {t('dailyRoas.detailedAnalysis')}</DialogTitle>
                <DialogDescription className="text-sm text-center">
                  {t('dailyRoas.allMetricsAndRecommendations')}
                </DialogDescription>
              </DialogHeader>
              {selectedDecisionData && (
                <div className="space-y-4">
                  {/* Campaign Header */}
                  <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/50">
                    <h4 className="font-bold text-lg md:text-xl mb-1">{selectedDecisionData.campaign_name}</h4>
                    <p className="text-sm text-muted-foreground">📅 {selectedDecisionData.dateRange}</p>
                  </div>

                  {/* All Metrics - Centralized Grid */}
                  <div className="glass-card p-4 md:p-6 rounded-lg border-2 border-border/50">
                    <h5 className="font-semibold mb-4 text-center text-base md:text-lg">📈 {t('dailyRoas.allMetrics')}</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">{t('dailyRoas.totalSpent')}</p>
                        <p className="font-bold text-lg">{selectedDecisionData.total_spent.toFixed(2)}€</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">CPC</p>
                        <p className="font-bold text-lg">{selectedDecisionData.cpc.toFixed(2)}€</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">ATC</p>
                        <p className="font-bold text-lg">{selectedDecisionData.atc}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">{t('dailyRoas.purchases')}</p>
                        <p className="font-bold text-lg">{selectedDecisionData.purchases}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">{t('dailyRoas.productPrice')}</p>
                        <p className="font-bold text-lg">{selectedDecisionData.product_price.toFixed(2)}€</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">COG</p>
                        <p className="font-bold text-lg">{selectedDecisionData.cog.toFixed(2)}€</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">{t('dailyRoas.units')}</p>
                        <p className="font-bold text-lg">{selectedDecisionData.purchases}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                        <p className="text-xs text-muted-foreground mb-1">ROAS</p>
                        <p className="font-bold text-lg text-green-600 dark:text-green-400">{selectedDecisionData.roas.toFixed(2)}x</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">Margem €</p>
                        <p className={`font-bold text-lg ${selectedDecisionData.margin_euros > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {selectedDecisionData.margin_euros.toFixed(2)}€
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border border-border/30 col-span-2 md:col-span-3">
                        <p className="text-xs text-muted-foreground mb-1">Margem %</p>
                        <p className={`font-bold text-2xl ${
                          selectedDecisionData.margin_percentage > 15 ? 'text-green-600 dark:text-green-400' : 
                          selectedDecisionData.margin_percentage < 0 ? 'text-red-600 dark:text-red-400' : 
                          'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {selectedDecisionData.margin_percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Decision Card */}
                  <div className={`p-4 md:p-6 rounded-lg border-2 ${
                    selectedDecisionData.decisao === "KILL" ? "bg-red-500/20 border-red-500" :
                    selectedDecisionData.decisao === "SCALE" ? "bg-green-500/20 border-green-500" :
                    "bg-yellow-500/20 border-yellow-500"
                  }`}>
                    <div className="flex items-center justify-center gap-3 mb-4">
                      {selectedDecisionData.decisao === "KILL" && <X className="w-6 h-6 md:w-8 md:h-8" />}
                      {selectedDecisionData.decisao === "SCALE" && <TrendingUp className="w-6 h-6 md:w-8 md:h-8" />}
                      {selectedDecisionData.decisao === "MANTER" && <Minus className="w-6 h-6 md:w-8 md:h-8" />}
                      <h3 className="text-xl md:text-2xl font-bold">{t("dailyRoas.decision")}: {selectedDecisionData.decisao}</h3>
                    </div>
                    
                    <div className="bg-background/50 p-3 md:p-4 rounded-lg mb-4 text-center">
                      <h5 className="font-semibold mb-2 text-sm md:text-base">💡 {t("dailyRoas.reason")}</h5>
                      <p className="text-xs md:text-sm">
                        {selectedDecisionData.motivo || `${selectedDecisionData.dateRange}: Margem ${selectedDecisionData.margin_percentage.toFixed(1)}%`}
                      </p>
                      {selectedDecisionData.dayRange && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {selectedDecisionData.dayRange}
                        </p>
                      )}
                    </div>
                    
                    <div className="bg-background/50 p-3 md:p-4 rounded-lg">
                      <h5 className="font-semibold mb-3 text-sm md:text-base text-center">🎯 {t("dailyRoas.decisionLogic")}</h5>
                      <div className="space-y-3 text-xs md:text-sm">
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="font-semibold mb-2">📅 {t("dailyRoas.days12").replace('{{marketType}}', marketType.toUpperCase())}</p>
                          <ul className="space-y-1 ml-4 list-disc text-xs">
                            <li><span className="text-red-500 font-bold">KILL:</span> {t("dailyRoas.killReason1")}</li>
                            <li><span className="text-green-500 font-bold">SCALE:</span> {t("dailyRoas.scaleReason1")}</li>
                            <li><span className="text-yellow-500 font-bold">MANTER:</span> {t("dailyRoas.keepReason1")}</li>
                          </ul>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="font-semibold mb-2">📅 {t("dailyRoas.days3Plus")}</p>
                          <ul className="space-y-1 ml-4 list-disc text-xs">
                            <li><span className="text-green-500 font-bold">SCALE:</span> {t("dailyRoas.scaleReason2")}</li>
                            <li><span className="text-yellow-500 font-bold">MANTER:</span> {t("dailyRoas.keepReason2")}</li>
                            <li><span className="text-red-500 font-bold">KILL:</span> {t("dailyRoas.killReason2")}</li>
                          </ul>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-xs text-center">
                            ℹ️ {t("dailyRoas.decisionDetails")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default CampaignControl;
