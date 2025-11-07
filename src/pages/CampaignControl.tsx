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

// Helper function to safely convert to number
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return (isNaN(num) || !isFinite(num)) ? defaultValue : num;
};

// Helper function to safely format number with toFixed, handling null/undefined/NaN
const safeToFixed = (value: any, decimals: number = 2): string => {
  const num = safeNumber(value, 0);
  return num.toFixed(decimals);
};

const CampaignControl = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const isPortuguese = language === 'pt';
  
  // Helper function to translate decision labels
  const translateDecision = (decision: string): string => {
    if (decision === "KILL") return t('dailyRoas.kill');
    if (decision === "MANTER") return t('dailyRoas.keep');
    if (decision === "SCALE") return t('dailyRoas.scale');
    if (decision === "DESCALE") return t('dailyRoas.descale') || 'DESCALE';
    return decision;
  };
  
  // Helper function to extract BER (Break Even ROAS) from campaign name
  // Looks for decimal numbers in the name (e.g., "2.5", "2,5", "1.2x", etc.)
  const extractBER = (campaignName: string): { ber: number | null; cleanName: string } => {
    if (!campaignName) return { ber: null, cleanName: campaignName };
    
    let ber: number | null = null;
    let cleanName = campaignName;
    
    // First, try to find explicit BER mentions (case insensitive)
    const explicitBERPattern = /\b(?:ber|break[_\s]?even[_\s]?roas?)\s*:?\s*(\d+[,.]\d+)/gi;
    const explicitMatch = campaignName.match(explicitBERPattern);
    if (explicitMatch) {
      const numberMatch = explicitMatch[0].match(/(\d+[,.]\d+)/);
      if (numberMatch) {
        const numberStr = numberMatch[1].replace(',', '.');
        const parsedBer = parseFloat(numberStr);
        if (!isNaN(parsedBer) && parsedBer > 0 && parsedBer < 100) {
          ber = parsedBer;
          cleanName = campaignName
            .replace(new RegExp(explicitMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '')
            .replace(/\s+/g, ' ')
            .trim();
          return { ber, cleanName };
        }
      }
    }
    
    // Look for decimal numbers (with comma or dot) that could be BER
    // Match patterns like: "2.5", "2,5", "1.2x", etc.
    const decimalPattern = /\b(\d+[,.]\d+)\b/g;
    const matches = campaignName.match(decimalPattern);
    
    if (matches && matches.length > 0) {
      // Filter for reasonable BER values (typically between 0.5 and 20)
      const candidates = matches.map(match => {
        const numberStr = match.replace(',', '.');
        return parseFloat(numberStr);
      }).filter(num => !isNaN(num) && num >= 0.1 && num <= 50);
      
      if (candidates.length > 0) {
        // Take the first candidate (most likely the BER)
        ber = candidates[0];
        const matchToRemove = matches[0];
        
        // Remove the BER number from the name, including any trailing 'x' or whitespace
        cleanName = campaignName
          .replace(new RegExp(matchToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*x?', 'gi'), '')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    
    return { ber, cleanName };
  };
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
  const [selectedDay, setSelectedDay] = useState<string>("total");
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
          description: isPortuguese
            ? `${data.campaigns.length} campanhas carregadas.`
            : `${data.campaigns.length} campaigns loaded.`
        });
      } else {
        console.log("⚠️ No campaigns in response");
        setFacebookCampaigns([]);
        
        toast({
          title: t('dailyRoas.noCampaignsFound'),
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
    const unitsSold = safeNumber(data.units_sold, 0);
    const productPrice = safeNumber(data.product_price, 0);
    const cog = safeNumber(data.cog, 0);
    const totalSpent = safeNumber(data.total_spent, 0);
    
    const totalRevenue = unitsSold * productPrice;
    const totalCOG = unitsSold * cog;
    const margin_euros = totalRevenue - totalSpent - totalCOG;
    const margin_percentage = totalRevenue > 0 && isFinite(totalRevenue) ? (margin_euros / totalRevenue) * 100 : 0;
    const roas = totalSpent > 0 && isFinite(totalSpent) ? totalRevenue / totalSpent : 0;

    return {
      ...data,
      roas: isFinite(roas) ? roas : 0,
      margin_euros: isFinite(margin_euros) ? margin_euros : 0,
      margin_percentage: isFinite(margin_percentage) ? margin_percentage : 0,
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
          spent: ((data.total_spent || 0)).toFixed(2) 
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
          (selectedDay === "total" || selectedDay === "today" ? new Date().toISOString().split('T')[0] : selectedDay);

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
          // If it's a unique constraint violation, the day already exists
          if (error.code === '23505') {
            skippedDays++;
            console.log(`⏭️ ${insightDate} already exists (unique constraint)`);
          } else {
            // Other errors should be reported
            throw new Error(`Error saving ${insightDate}: ${error.message}`);
          }
        } else {
          addedDays++;
          console.log(`✅ Successfully saved ${insightDate}`);
        }
      }

      await fetchDailyData();
      setSelectedCampaign("");
      setShowAddCampaign(false);
      setCampaignHistory([]);
      
      if (addedDays > 0) {
      toast({
        title: t('dailyRoas.campaignAdded'),
          description: t('dailyRoas.daysAdded', { count: addedDays })
        });
      } else if (skippedDays > 0) {
        toast({
          title: t('dailyRoas.campaignAlreadyExists'),
          description: t('dailyRoas.allDaysAlreadyExist', { count: skippedDays }),
          variant: "default"
        });
      } else {
        toast({
          title: t('dailyRoas.errorAddingCampaign'),
          description: t('dailyRoas.noDaysAdded'),
          variant: "destructive"
        });
      }
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
  
  // Get data for selected day or total
  const getFilteredData = () => {
    if (selectedDay === "total") {
      // Return all data when "total" is selected - we'll aggregate by campaign
      return dailyData;
    }
    if (selectedDay === "today") {
      return dailyData.filter(d => d.date === todayDate);
    }
    return dailyData.filter(d => d.date === selectedDay);
  };

  const filteredData = getFilteredData();
  
  // Aggregate data by campaign when "total" is selected
  const getAggregatedCampaignData = () => {
    if (selectedDay !== "total") {
      // Return individual day data as-is, but ensure each entry has the necessary structure
      return filteredData.map(data => ({
        ...data,
        aggregated: false,
        total_days: undefined
      }));
    }
    
    // Group by campaign_id or campaign_name
    const campaignMap = new Map<string, {
      campaign_id: string;
      campaign_name: string;
      total_spent: number;
      total_revenue: number;
      total_units_sold: number;
      total_atc: number;
      total_purchases: number;
      total_cog: number;
      product_price: number;
      dates: string[];
      days: DailyROASData[];
    }>();
    
    filteredData.forEach(data => {
      const key = data.campaign_id || data.campaign_name;
      if (!campaignMap.has(key)) {
        campaignMap.set(key, {
          campaign_id: data.campaign_id,
          campaign_name: data.campaign_name,
          total_spent: 0,
          total_revenue: 0,
          total_units_sold: 0,
          total_atc: 0,
          total_purchases: 0,
          total_cog: 0,
          product_price: data.product_price || 0,
          dates: [],
          days: []
        });
      }
      
      const campaign = campaignMap.get(key)!;
      campaign.total_spent += data.total_spent || 0;
      campaign.total_revenue += (data.units_sold || 0) * (data.product_price || 0);
      campaign.total_units_sold += data.units_sold || 0;
      campaign.total_atc += data.atc || 0;
      campaign.total_purchases += data.purchases || 0;
      campaign.total_cog += (data.units_sold || 0) * (data.cog || 0);
      if (!campaign.dates.includes(data.date)) {
        campaign.dates.push(data.date);
      }
      campaign.days.push(data);
    });
    
    // Convert to array and calculate metrics
    return Array.from(campaignMap.values()).map(campaign => {
      const totalDays = campaign.dates.length;
      const totalMarginEuros = campaign.total_revenue - campaign.total_spent - campaign.total_cog;
      const totalMarginPerc = campaign.total_revenue > 0 
        ? (totalMarginEuros / campaign.total_revenue) * 100 
        : 0;
      // Calculate average CPC (total spent / total clicks, where clicks = purchases + ATC)
      const totalClicks = campaign.total_purchases + campaign.total_atc;
      const avgCPC = totalClicks > 0 
        ? campaign.total_spent / totalClicks 
        : 0;
      const roas = campaign.total_spent > 0 
        ? campaign.total_revenue / campaign.total_spent 
        : 0;
      
      // Extract BER from campaign name and clean it
      const { ber: extractedBER, cleanName } = extractBER(campaign.campaign_name);
      
      // Create a synthetic DailyROASData object with aggregated values
      return {
        id: `aggregated-${campaign.campaign_id}`,
        campaign_id: campaign.campaign_id,
        campaign_name: cleanName, // Use cleaned name
        ber: extractedBER, // Store BER for later use
        date: campaign.dates.sort()[0], // First date
        total_spent: campaign.total_spent,
        cpc: avgCPC,
        atc: campaign.total_atc,
        purchases: campaign.total_purchases,
        product_price: campaign.product_price,
        cog: campaign.total_cog > 0 && campaign.total_units_sold > 0 
          ? campaign.total_cog / campaign.total_units_sold 
          : 0,
        units_sold: campaign.total_units_sold,
        roas: roas,
        margin_euros: totalMarginEuros,
        margin_percentage: totalMarginPerc,
        user_id: campaign.days[0]?.user_id || '',
        total_days: totalDays, // Add total days for decision calculation
        aggregated: true // Flag to indicate this is aggregated data
      } as DailyROASData & { total_days: number; aggregated: boolean };
    });
  };
  
  const aggregatedData = getAggregatedCampaignData();
  
  // Calculate KPIs for filtered data
  const calculateFilteredKPIs = () => {
    const dataToUse = selectedDay === "total" ? aggregatedData : filteredData;
    const totalSpend = dataToUse.reduce((sum: number, d: any) => sum + (d.total_spent || 0), 0);
    const totalRevenue = dataToUse.reduce((sum: number, d: any) => sum + ((d.units_sold || 0) * (d.product_price || 0)), 0);
    const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const totalMargemEuros = dataToUse.reduce((sum: number, d: any) => sum + (d.margin_euros || 0), 0);
    const avgMargemPerc = dataToUse.length > 0 
      ? dataToUse.reduce((sum: number, d: any) => sum + (d.margin_percentage || 0), 0) / dataToUse.length 
      : 0;
    const totalVendas = dataToUse.reduce((sum: number, d: any) => sum + (d.purchases || 0), 0);

    return { 
      totalSpend: totalSpend || 0, 
      totalRevenue: totalRevenue || 0, 
      avgROAS: avgROAS || 0, 
      totalMargemEuros: totalMargemEuros || 0, 
      avgMargemPerc: avgMargemPerc || 0, 
      totalVendas: totalVendas || 0 
    };
  };

  const kpis = calculateFilteredKPIs();

  const chartData = aggregatedData.map(d => ({
    nome: (d.campaign_name || '').substring(0, 15),
    CPC: d.cpc || 0,
    ROAS: d.roas || 0,
    Margem: d.margin_percentage || 0,
    Gasto: d.total_spent || 0,
    Receita: (d.units_sold || 0) * (d.product_price || 0),
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
      const totalSpent = pair.reduce((sum, day) => sum + (day.total_spent || 0), 0);
      const totalRevenue = pair.reduce((sum, day) => sum + ((day.purchases || 0) * (day.product_price || 0)), 0);
      const totalCOG = pair.reduce((sum, day) => sum + ((day.purchases || 0) * (day.cog || 0)), 0);
      const marginEuros = totalRevenue - totalSpent - totalCOG;
      const marginPercentage = totalRevenue > 0 ? (marginEuros / totalRevenue) * 100 : 0;
      const roas = totalSpent > 0 ? totalRevenue / totalSpent : 0;
      const totalPurchases = pair.reduce((sum, day) => sum + (day.purchases || 0), 0);
      const totalAtc = pair.reduce((sum, day) => sum + (day.atc || 0), 0);
      const avgCpc = pair.length > 0 ? pair.reduce((sum, day) => sum + (day.cpc || 0), 0) / pair.length : 0;
      
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
                        
                        // Extract BER from campaign name
                        const { ber, cleanName } = extractBER(entry.campaign_name);
                        
                        return (
                          <div key={entry.id} className="p-3 rounded-lg bg-background border border-border/50">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-semibold">{t('dailyRoas.day')} {dayNumber}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {new Date(entry.date).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB')}
                                </span>
                                {ber !== null && (
                                  <span className="ml-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                    BER: {ber.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <span 
                                className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${
                                decisao === "SCALE" ? "bg-green-500/20 text-green-700 dark:text-green-400" :
                                decisao === "KILL" ? "bg-red-500/20 text-red-700 dark:text-red-400" :
                                decisao === "DESCALE" ? "bg-orange-500/20 text-orange-700 dark:text-orange-400" :
                                "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                              }`}
                                onClick={() => {
                                  const calculated = calculateMetrics(entry);
                                  setSelectedDecisionData({
                                    ...calculated,
                                    decisao,
                                    motivo,
                                    campaign_name: cleanName,
                                    ber: ber,
                                    dateRange: new Date(entry.date).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB'),
                                    dayRange: `${t('dailyRoas.day')} ${dayNumber}`
                                  });
                                  setShowDecisionModal(true);
                                }}
                                title={motivo}
                              >
                                {translateDecision(decisao)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">{t('dailyRoas.spent')}:</span>
                                <span className="ml-1 font-medium">{((entry.total_spent || 0)).toFixed(2)}€</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">CPC:</span>
                                <span className="ml-1 font-medium">{((entry.cpc || 0)).toFixed(2)}€</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t('dailyRoas.sales')}:</span>
                                <span className="ml-1 font-medium">{entry.purchases || 0}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t('dailyRoas.atc')}:</span>
                                <span className="ml-1 font-medium">{entry.atc || 0}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t('dailyRoas.roas')}:</span>
                                <span className="ml-1 font-medium">{((entry.roas || 0)).toFixed(2)}x</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t('dailyRoas.margin')}:</span>
                                <span className={`ml-1 font-medium ${(entry.margin_percentage || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {((entry.margin_percentage || 0)).toFixed(1)}%
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground">{t('dailyRoas.revenue')}:</span>
                                <span className="ml-1 font-medium">{(((entry.units_sold || 0) * (entry.product_price || 0))).toFixed(2)}€</span>
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
                <TabsTrigger value="total" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2">
                  {t('dailyRoas.total')}
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
                    <p className="text-lg md:text-2xl font-bold">{((kpis.totalSpend || 0)).toFixed(2)}€</p>
                  </Card>
                  <Card className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 border-2 border-border/50">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('dailyRoas.totalRevenue')}</p>
                    <p className="text-lg md:text-2xl font-bold text-green-500">{((kpis.totalRevenue || 0)).toFixed(2)}€</p>
                  </Card>
                  <Card className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 border-2 border-border/50">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('dailyRoas.averageROAS')}</p>
                    <p className="text-lg md:text-2xl font-bold">{((kpis.avgROAS || 0)).toFixed(2)}</p>
                  </Card>
                  <Card className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 border-2 border-border/50">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('dailyRoas.totalMargin')}</p>
                    <p className="text-lg md:text-2xl font-bold">{((kpis.totalMargemEuros || 0)).toFixed(2)}€</p>
                  </Card>
                  <Card className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 border-2 border-border/50">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('dailyRoas.averageMargin')}</p>
                    <p className="text-lg md:text-2xl font-bold">{((kpis.avgMargemPerc || 0)).toFixed(1)}%</p>
                  </Card>
                  <Card className="glass-card rounded-xl md:rounded-2xl p-3 md:p-4 border-2 border-border/50">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('dailyRoas.totalSales')}</p>
                    <p className="text-lg md:text-2xl font-bold">{kpis.totalVendas}</p>
                  </Card>
                </div>

                {/* Table for selected day */}
                <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">
                  {t('dailyRoas.campaigns')} - {selectedDay === "total" ? t('dailyRoas.total') : selectedDay === "today" ? t('dailyRoas.today') : new Date(selectedDay).toLocaleDateString()}
                </h3>
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 md:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[160px] md:min-w-[200px] text-xs md:text-sm">{t('dailyRoas.campaignName')}</TableHead>
                          <TableHead className="min-w-[70px] md:min-w-[80px] text-xs md:text-sm">BER</TableHead>
                          <TableHead className="min-w-[70px] md:min-w-[80px] text-xs md:text-sm">{t('dailyRoas.roas')}</TableHead>
                          <TableHead className="min-w-[90px] md:min-w-[100px] text-xs md:text-sm">{t('dailyRoas.totalSpentEur')}</TableHead>
                          <TableHead className="min-w-[70px] md:min-w-[80px] text-xs md:text-sm">{t('dailyRoas.cpcEur')}</TableHead>
                          <TableHead className="min-w-[60px] md:min-w-[80px] text-xs md:text-sm">{t('dailyRoas.atc')}</TableHead>
                          <TableHead className="min-w-[70px] md:min-w-[80px] text-xs md:text-sm">{t('dailyRoas.purchases')}</TableHead>
                          <TableHead className="min-w-[70px] md:min-w-[80px] text-xs md:text-sm">{t('dailyRoas.price')}</TableHead>
                          <TableHead className="min-w-[70px] md:min-w-[80px] text-xs md:text-sm">{t('dailyRoas.cog')} €</TableHead>
                          <TableHead className="min-w-[80px] md:min-w-[100px] text-xs md:text-sm">{t('dailyRoas.units')}</TableHead>
                          <TableHead className="min-w-[100px] md:min-w-[120px] text-xs md:text-sm">{t('dailyRoas.marginEur')}</TableHead>
                          <TableHead className="min-w-[90px] md:min-w-[100px] text-xs md:text-sm">{t('dailyRoas.marginPerc')}</TableHead>
                          <TableHead className="min-w-[90px] md:min-w-[100px] text-xs md:text-sm">{t('dailyRoas.decision')}</TableHead>
                          <TableHead className="min-w-[70px] md:min-w-[80px] text-xs md:text-sm">{t('dailyRoas.actionsTable')}</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {aggregatedData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={14} className="text-center py-8 text-muted-foreground text-xs md:text-sm">
                            {t('dailyRoas.noDataForDay')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        aggregatedData.map((data) => {
                          const calculated = calculateMetrics(data);
                          
                          // For aggregated data, use total_days; otherwise calculate day number
                          let dayNumber: number;
                          if ((data as any).aggregated && (data as any).total_days) {
                            dayNumber = (data as any).total_days;
                          } else {
                          const campaignEntries = dailyData.filter(d => 
                            d.campaign_id === data.campaign_id || d.campaign_name === data.campaign_name
                          ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            dayNumber = getCampaignDayNumber(campaignEntries, data.date);
                          }
                          
                          const { decisao, motivo } = determineDecision(calculated, dayNumber, marketType);
                          
                          // Extract BER from campaign name (or use stored BER if available)
                          const storedBER = (data as any).ber;
                          const { ber, cleanName } = storedBER !== undefined 
                            ? { ber: storedBER, cleanName: data.campaign_name }
                            : extractBER(data.campaign_name);
                          
                          return (
                            <TableRow key={data.id}>
                              <TableCell className="font-medium text-xs md:text-sm">
                                {cleanName}
                                {(data as any).aggregated && (data as any).total_days && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({t('dailyRoas.total')}: {(data as any).total_days} {isPortuguese ? 'dias' : 'days'})
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">
                                {ber !== null && ber !== undefined ? (
                                  <span className="text-orange-600 dark:text-orange-400 font-bold">
                                    {ber.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="font-semibold text-green-500 text-xs md:text-sm">{((calculated.roas || 0)).toFixed(2)}</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{((data.total_spent || 0)).toFixed(2)}€</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{((data.cpc || 0)).toFixed(2)}€</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{data.atc || 0}</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{data.purchases || 0}</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{((data.product_price || 0)).toFixed(2)}€</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{((data.cog || 0)).toFixed(2)}€</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{data.units_sold || 0}</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{((calculated.margin_euros || 0)).toFixed(2)}€</TableCell>
                              <TableCell className="font-semibold text-xs md:text-sm">{((calculated.margin_percentage || 0)).toFixed(1)}%</TableCell>
                              <TableCell>
                                <div 
                                  className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${
                                    decisao === "SCALE" ? "bg-green-500/20 text-green-700 dark:text-green-400" :
                                    decisao === "KILL" ? "bg-red-500/20 text-red-700 dark:text-red-400" :
                                    decisao === "DESCALE" ? "bg-orange-500/20 text-orange-700 dark:text-orange-400" :
                                    "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                                  }`}
                                  title={motivo}
                                  onClick={() => {
                                    setSelectedDecisionData({
                                      ...calculated,
                                      decisao,
                                      motivo,
                                      campaign_name: cleanName, // Use cleaned name
                                      ber: ber, // Include BER in modal data
                                      dateRange: (data as any).aggregated 
                                        ? `${t('dailyRoas.total')}: ${(data as any).total_days} ${isPortuguese ? 'dias' : 'days'}`
                                        : new Date(data.date).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB'),
                                      dayRange: (data as any).aggregated 
                                        ? `${t('dailyRoas.total')} ${(data as any).total_days} ${isPortuguese ? 'dias' : 'days'}`
                                        : `${t('dailyRoas.day')} ${dayNumber}`,
                                      totalDays: (data as any).total_days || dayNumber
                                    });
                                    setShowDecisionModal(true);
                                  }}
                                >
                                  {translateDecision(decisao)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // For aggregated data, delete all entries for this campaign
                                    if ((data as any).aggregated) {
                                      // Delete all days for this campaign
                                      const campaignDays = dailyData.filter(d => 
                                        d.campaign_id === data.campaign_id || d.campaign_name === data.campaign_name
                                      );
                                      campaignDays.forEach(day => deleteCampaign(day.id));
                                    } else {
                                      deleteCampaign(data.id);
                                    }
                                  }}
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
            <DialogContent className="max-w-full sm:max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  {selectedDecisionData?.campaign_name}
                </DialogTitle>
              </DialogHeader>
              {selectedDecisionData && (
                <div className="space-y-4">
                  {/* Decision */}
                  <div className={`p-4 rounded-lg border ${
                    selectedDecisionData.decisao === "KILL" 
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" :
                    selectedDecisionData.decisao === "SCALE" 
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" :
                    "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      {selectedDecisionData.decisao === "KILL" && <X className="w-5 h-5 text-red-600 dark:text-red-400" />}
                      {selectedDecisionData.decisao === "SCALE" && <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />}
                      {selectedDecisionData.decisao === "MANTER" && <Minus className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />}
                      <h3 className={`text-lg font-semibold ${
                        selectedDecisionData.decisao === "KILL" ? "text-red-600 dark:text-red-400" :
                        selectedDecisionData.decisao === "SCALE" ? "text-green-600 dark:text-green-400" :
                        "text-yellow-600 dark:text-yellow-400"
                      }`}>
                        {translateDecision(selectedDecisionData.decisao)}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {selectedDecisionData.dateRange}
                      {selectedDecisionData.dayRange && ` • ${selectedDecisionData.dayRange}`}
                    </p>
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-sm font-medium mb-1">{t("dailyRoas.reason")}</p>
                      <p className="text-sm text-foreground">
                        {selectedDecisionData.motivo || `${selectedDecisionData.dateRange}: ${isPortuguese ? 'Margem' : 'Margin'} ${((selectedDecisionData.margin_percentage || 0)).toFixed(1)}%`}
                      </p>
                    </div>
                  </div>

                  {/* Decision Logic */}
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <h5 className="font-semibold mb-3 text-sm">{t("dailyRoas.decisionLogic")}</h5>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium mb-2 text-muted-foreground">
                          {t("dailyRoas.days12").replace('{{marketType}}', marketType.toUpperCase())}
                        </p>
                        <ul className="space-y-1 ml-4 list-disc text-xs">
                          <li>
                            <span className="font-medium text-red-600 dark:text-red-400">{translateDecision("KILL")}:</span>{" "}
                            <span className="text-foreground">{t("dailyRoas.killReason1")}</span>
                          </li>
                          <li>
                            <span className="font-medium text-green-600 dark:text-green-400">{translateDecision("SCALE")}:</span>{" "}
                            <span className="text-foreground">{t("dailyRoas.scaleReason1")}</span>
                          </li>
                          <li>
                            <span className="font-medium text-yellow-600 dark:text-yellow-400">{translateDecision("MANTER")}:</span>{" "}
                            <span className="text-foreground">{t("dailyRoas.keepReason1")}</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-2 text-muted-foreground">
                          {t("dailyRoas.days3Plus")}
                        </p>
                        <ul className="space-y-1 ml-4 list-disc text-xs">
                          <li>
                            <span className="font-medium text-green-600 dark:text-green-400">{translateDecision("SCALE")}:</span>{" "}
                            <span className="text-foreground">{t("dailyRoas.scaleReason2")}</span>
                          </li>
                          <li>
                            <span className="font-medium text-yellow-600 dark:text-yellow-400">{translateDecision("MANTER")}:</span>{" "}
                            <span className="text-foreground">{t("dailyRoas.keepReason2")}</span>
                          </li>
                          <li>
                            <span className="font-medium text-red-600 dark:text-red-400">{translateDecision("KILL")}:</span>{" "}
                            <span className="text-foreground">{t("dailyRoas.killReason2")}</span>
                          </li>
                        </ul>
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
