import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingOverlay } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { CurrencySelector } from "@/components/CurrencySelector";
import { PageLayout } from "@/components/PageLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card3D } from "@/components/ui/Card3D";
import { motion } from "framer-motion";
import { useCurrency } from "@/contexts/CurrencyContext";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Store, 
  Facebook, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Edit2,
  Check,
  X,
  AlertTriangle
} from "lucide-react";
import { format, subDays, isWithinInterval } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Integration {
  id: string;
  integration_type: string;
  metadata: any;
}

interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
}

interface ProfitRow {
  date: string;
  revenue: number;
  cog: number;
  adSpend: number;
  shopifyRefunds: number;
  otherExpenses: number;
  manualRefunds: number;
  transactionFee: number;
  profit: number;
  roas: number;
  profitMargin: number;
  cogPercentage: number;
  totalRefunds: number;
}

const ProfitSheet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { selectedCurrency, convertFromEUR, formatAmount, convertBetween } = useCurrency();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeCurrency, setStoreCurrency] = useState<string>('EUR');
  
  // Selection state
  const [shopifyIntegrations, setShopifyIntegrations] = useState<Integration[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [hasFacebookIntegration, setHasFacebookIntegration] = useState(false);
  const [selectedShopify, setSelectedShopify] = useState<string>("");
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  // Profit sheet data
  const [profitData, setProfitData] = useState<ProfitRow[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [datePreset, setDatePreset] = useState("last_30d");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Editable fields
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ otherExpenses: string; manualRefunds: string }>({
    otherExpenses: "",
    manualRefunds: ""
  });

  // Summary totals
  const [totals, setTotals] = useState({
    revenue: 0,
    profit: 0,
    adSpend: 0,
    avgRoas: 0,
  });
  const [hasProductsWithoutCost, setHasProductsWithoutCost] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        fetchIntegrations(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Auto-fetch data when confirmed and date range changes
  useEffect(() => {
    if (isConfirmed && selectedShopify && selectedAdAccount) {
      fetchProfitData();
    }
  }, [isConfirmed, dateRange, selectedShopify, selectedAdAccount]);

  // Setup realtime updates for profit sheet entries
  useEffect(() => {
    if (!isConfirmed || !selectedShopify || !selectedAdAccount) return;

    const channel = supabase
      .channel('profit-sheet-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profit_sheet_entries',
          filter: `shopify_integration_id=eq.${selectedShopify}`
        },
        (payload) => {
          console.log('📊 Profit sheet entry changed:', payload);
          fetchProfitData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isConfirmed, selectedShopify, selectedAdAccount]);

  const fetchIntegrations = async (userId: string) => {
    try {
      const { data: integrations, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', userId)
        .in('integration_type', ['shopify', 'facebook_ads']);

      if (error) throw error;

      const shopify = integrations?.filter(i => i.integration_type === 'shopify') || [];
      const facebook = integrations?.filter(i => i.integration_type === 'facebook_ads') || [];

      console.log('Shopify integrations:', shopify);
      console.log('Facebook integration:', facebook);

      setShopifyIntegrations(shopify);
      setHasFacebookIntegration(facebook.length > 0);

      // If Facebook is connected, fetch ad accounts
      if (facebook.length > 0) {
        await fetchAdAccounts();
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  const fetchAdAccounts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('facebook-campaigns', {
        body: { action: 'listAdAccounts' }
      });

      if (error) {
        // Silently fail - don't show error toast for expected failures
        console.log("⚠️ Could not fetch ad accounts (likely not connected or token expired)");
        setAdAccounts([]);
        return;
      }
      
      if (data?.adAccounts) {
        console.log("✅ Found", data.adAccounts.length, "ad accounts");
        setAdAccounts(data.adAccounts);
      } else {
        console.log("⚠️ No ad accounts in response");
        setAdAccounts([]);
      }
    } catch (error: any) {
      // Silently handle errors - don't show toast for expected failures
      console.log("⚠️ Could not fetch ad accounts:", error.message);
      setAdAccounts([]);
    }
  };

  // Smart matching algorithm for Shopify stores
  const findBestShopifyMatch = (searchName: string, candidates: Integration[]): string | null => {
    if (!searchName || candidates.length === 0) return null;

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const searchNormalized = normalize(searchName);
    const searchChars = searchNormalized.split('');

    console.log('Finding match for:', searchName, 'normalized:', searchNormalized);

    let bestMatch: { id: string; score: number; name: string } | null = null;

    for (const candidate of candidates) {
      // Try multiple sources for the name
      const candidateNames = [
        candidate.metadata?.shop_name,
        candidate.metadata?.shop_domain,
        candidate.metadata?.store_name,
      ].filter(Boolean);

      for (const candidateName of candidateNames) {
        if (!candidateName) continue;
        
        const candidateNormalized = normalize(candidateName);
        const candidateChars = candidateNormalized.split('');

        console.log('  Testing against:', candidateName, 'normalized:', candidateNormalized);

        let score = 0;
        
        // Check if all search characters exist in candidate (in any order)
        let matchedChars = 0;
        for (const searchChar of searchChars) {
          if (candidateChars.includes(searchChar)) {
            matchedChars++;
          }
        }
        score += matchedChars * 2;

        // Character by character position matching
        const minLength = Math.min(searchNormalized.length, candidateNormalized.length);
        for (let i = 0; i < minLength; i++) {
          if (searchNormalized[i] === candidateNormalized[i]) {
            score += 3; // Higher weight for position match
          }
        }

        // Bonus for exact substring match
        if (candidateNormalized.includes(searchNormalized)) {
          score += 20;
        }
        if (searchNormalized.includes(candidateNormalized)) {
          score += 15;
        }

        console.log('    Score:', score);

        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { id: candidate.id, score, name: candidateName };
        }
      }
    }

    console.log('Best match:', bestMatch);

    // Only return match if score is reasonable
    const minScore = Math.min(searchChars.length * 2, 6);
    return bestMatch && bestMatch.score >= minScore ? bestMatch.id : null;
  };

  // Smart matching algorithm for Ad Accounts
  const findBestAdAccountMatch = (searchName: string, candidates: AdAccount[]): string | null => {
    if (!searchName || candidates.length === 0) return null;

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const searchNormalized = normalize(searchName);
    const searchChars = searchNormalized.split('');

    console.log('Finding ad account match for:', searchName, 'normalized:', searchNormalized);

    let bestMatch: { id: string; score: number; name: string } | null = null;

    for (const candidate of candidates) {
      const candidateNormalized = normalize(candidate.name);
      const candidateChars = candidateNormalized.split('');

      console.log('  Testing against:', candidate.name, 'normalized:', candidateNormalized);

      let score = 0;
      
      // Check if all search characters exist in candidate (in any order)
      let matchedChars = 0;
      for (const searchChar of searchChars) {
        if (candidateChars.includes(searchChar)) {
          matchedChars++;
        }
      }
      score += matchedChars * 2;

      // Character by character position matching
      const minLength = Math.min(searchNormalized.length, candidateNormalized.length);
      for (let i = 0; i < minLength; i++) {
        if (searchNormalized[i] === candidateNormalized[i]) {
          score += 3;
        }
      }

      // Bonus for exact substring match
      if (candidateNormalized.includes(searchNormalized)) {
        score += 20;
      }
      if (searchNormalized.includes(candidateNormalized)) {
        score += 15;
      }

      console.log('    Score:', score);

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { id: candidate.id, score, name: candidate.name };
      }
    }

    console.log('Best ad account match:', bestMatch);

    const minScore = Math.min(searchChars.length * 2, 6);
    return bestMatch && bestMatch.score >= minScore ? bestMatch.id : null;
  };

  const handleShopifyChange = (value: string) => {
    setSelectedShopify(value);
    
    // Find matching Ad Account
    const selectedIntegration = shopifyIntegrations.find(i => i.id === value);
    if (selectedIntegration) {
      const shopName = selectedIntegration.metadata?.shop_name || '';
      const matchId = findBestAdAccountMatch(shopName, adAccounts);
      if (matchId) {
        console.log('Auto-matched ad account:', matchId);
        setSelectedAdAccount(matchId);
      }
    }
  };

  const handleAdAccountChange = (value: string) => {
    setSelectedAdAccount(value);
    
    // Find matching Shopify store
    const selectedAccount = adAccounts.find(acc => acc.id === value);
    if (selectedAccount) {
      console.log('Ad account selected, name:', selectedAccount.name);
      const matchId = findBestShopifyMatch(selectedAccount.name, shopifyIntegrations);
      if (matchId) {
        console.log('Auto-matched Shopify store:', matchId);
        setSelectedShopify(matchId);
      }
    }
  };

  const handleConfirm = async () => {
    if (!selectedShopify || !selectedAdAccount) {
      toast({
        title: t('common.error'),
        description: t('profitSheet.selectStoreDesc'),
        variant: "destructive"
      });
      return;
    }

    setIsConfirmed(true);
    await fetchProfitData();
  };

  const fetchProfitData = async () => {
    if (!user || !selectedShopify || !selectedAdAccount) return;

    setIsFetchingData(true);
    try {
      console.log('📊 Fetching profit data...');

      // Check for products without cost_price
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, cost_price')
        .eq('user_id', user.id)
        .eq('integration_id', selectedShopify);

      if (!productsError) {
        const missingCost = products?.some(p => !p.cost_price || p.cost_price === 0) || false;
        setHasProductsWithoutCost(missingCost);
        console.log('🏷️ Products without cost:', missingCost);
      }

      const dateFrom = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const dateTo = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase.functions.invoke('profit-sheet-data', {
        body: {
          shopifyIntegrationId: selectedShopify,
          adAccountId: selectedAdAccount,
          dateFrom,
          dateTo,
        }
      });

      if (error) {
        console.error('Error fetching profit data:', error);
        throw error;
      }

      console.log('✅ Raw data received:', data);

      // Set store currency
      if (data.storeCurrency) {
        setStoreCurrency(data.storeCurrency);
        console.log('💱 Store currency set to:', data.storeCurrency);
      }

      // Process and calculate all values
      const processedData: ProfitRow[] = data.data.map((day: any) => {
        const revenue = parseFloat(day.revenue || 0);
        const cog = parseFloat(day.cog || 0);
        const adSpend = parseFloat(day.adSpend || 0);
        const shopifyRefunds = parseFloat(day.shopifyRefunds || 0);
        const otherExpenses = parseFloat(day.otherExpenses || 0);
        const manualRefunds = parseFloat(day.manualRefunds || 0);

        // Calculate derived values
        const totalRefunds = shopifyRefunds + manualRefunds;
        const transactionFee = revenue * 0.05; // 5% of revenue
        const profit = revenue - cog - adSpend - otherExpenses - totalRefunds - transactionFee;
        const totalSpend = adSpend + otherExpenses;
        const roas = totalSpend > 0 ? revenue / totalSpend : 0;
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
        const cogPercentage = revenue > 0 ? (cog / revenue) * 100 : 0;

        return {
          date: day.date,
          revenue,
          cog,
          adSpend,
          shopifyRefunds,
          otherExpenses,
          manualRefunds,
          transactionFee,
          profit,
          roas,
          profitMargin,
          cogPercentage,
          totalRefunds,
        };
      });

      setProfitData(processedData);

      // Calculate totals
      const totalRevenue = processedData.reduce((sum, row) => sum + row.revenue, 0);
      const totalProfit = processedData.reduce((sum, row) => sum + row.profit, 0);
      const totalAdSpend = processedData.reduce((sum, row) => sum + row.adSpend, 0);
      const totalSpend = processedData.reduce((sum, row) => sum + (row.adSpend + row.otherExpenses), 0);
      const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

      setTotals({
        revenue: totalRevenue,
        profit: totalProfit,
        adSpend: totalAdSpend,
        avgRoas,
      });

      console.log('✅ Processed', processedData.length, 'days of data');
    } catch (error: any) {
      console.error('❌ Error fetching profit data:', error);
      toast({
        title: t('settings.errorLoadingData'),
        description: error.message || t('profitSheet.noData'),
        variant: "destructive"
      });
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    
    switch (preset) {
      case 'today':
        setDateRange({ from: now, to: now });
        break;
      case 'last_7d':
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case 'last_30d':
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case 'all':
        setDateRange({ from: undefined, to: undefined });
        break;
      default:
        break;
    }

    if (isConfirmed) {
      fetchProfitData();
    }
  };

  const handleEditRow = (date: string, otherExpenses: number, manualRefunds: number) => {
    setEditingRow(date);
    setEditValues({
      otherExpenses: otherExpenses.toString(),
      manualRefunds: manualRefunds.toString()
    });
  };

  const handleSaveRow = async (date: string) => {
    if (!user || !selectedShopify || !selectedAdAccount) return;

    try {
      const { error } = await supabase
        .from('profit_sheet_entries')
        .upsert({
          user_id: user.id,
          shopify_integration_id: selectedShopify,
          ad_account_id: selectedAdAccount,
          date,
          other_expenses: parseFloat(editValues.otherExpenses) || 0,
          manual_refunds: parseFloat(editValues.manualRefunds) || 0,
        });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('profitSheet.savedSuccessfully'),
      });

      // Refresh data
      await fetchProfitData();
      setEditingRow(null);
    } catch (error: any) {
      console.error('Error saving row:', error);
      toast({
        title: t('settings.errorLoadingData'),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
  };

  if (loading) {
    return <LoadingOverlay message={t('profitSheet.loading')} />;
  }

  return (
    <PageLayout
      title={t('profitSheet.title')}
      subtitle={t('profitSheet.subtitle')}
      actions={<CurrencySelector />}
    >
            {!isConfirmed ? (
              <>
                {/* Store and Ad Account Selection */}
                <Card3D intensity="low" className="p-6">
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold mb-2">{t('profitSheet.selectStore')}</h2>
                      <p className="text-muted-foreground">
                        {t('profitSheet.selectStoreDesc')}
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Shopify Store Selector */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Store className="w-4 h-4" />
                          {t('profitSheet.shopifyStore')}
                        </label>
                        <Select value={selectedShopify} onValueChange={handleShopifyChange}>
                          <SelectTrigger className="w-full btn-glass h-12">
                            <SelectValue placeholder={t('profitSheet.selectShopify')} />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-card border-border">
                            {shopifyIntegrations.map((integration) => (
                              <SelectItem key={integration.id} value={integration.id}>
                                {integration.metadata?.shop_name || 
                                 integration.metadata?.shop_domain || 
                                 `${t('products.store')} ${integration.id.slice(0, 8)}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedShopify && (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {t('profitSheet.selected')}
                          </Badge>
                        )}
                      </div>

                      {/* Facebook Ad Account Selector */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Facebook className="w-4 h-4" />
                          {t('profitSheet.adAccount')}
                        </label>
                        {!hasFacebookIntegration ? (
                          <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                            {t('metaDashboard.connectDesc')}
                          </div>
                        ) : adAccounts.length === 0 ? (
                          <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                            {t('common.loading')}
                          </div>
                        ) : (
                          <>
                            <Select value={selectedAdAccount} onValueChange={handleAdAccountChange}>
                              <SelectTrigger className="w-full btn-glass h-12">
                                <SelectValue placeholder={t('profitSheet.selectAdAccount')} />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-card border-border">
                                {adAccounts.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {account.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedAdAccount && (
                              <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {t('profitSheet.selected')}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center pt-6">
                      <Button
                        onClick={handleConfirm}
                        disabled={!selectedShopify || !selectedAdAccount}
                        className="btn-gradient h-12 px-8 text-base font-medium"
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        {t('profitSheet.confirmSelection')}
                      </Button>
                    </div>
                    </div>
                  </Card3D>
                </>
              ) : (
              <>
                {/* Date Range Filter */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                    <Select value={datePreset} onValueChange={handleDatePresetChange}>
                      <SelectTrigger className="w-full sm:w-[180px] btn-glass h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-card border-border">
                        <SelectItem value="today">{t('profitSheet.today')}</SelectItem>
                        <SelectItem value="last_7d">{t('profitSheet.last7Days')}</SelectItem>
                        <SelectItem value="last_30d">{t('profitSheet.last30Days')}</SelectItem>
                        <SelectItem value="all">{t('profitSheet.allPeriods')}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="btn-glass h-11 w-full sm:w-auto justify-start text-left">
                          <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">
                            {dateRange.from && dateRange.to ? (
                              `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}`
                            ) : (
                              t('profitSheet.customize')
                            )}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50 bg-card border-border" align="start">
                        <CalendarComponent
                          mode="range"
                          selected={{ from: dateRange.from, to: dateRange.to }}
                          onSelect={(range) => {
                            if (range) {
                              setDateRange({ from: range.from, to: range.to });
                              setDatePreset("custom");
                              fetchProfitData();
                            }
                          }}
                          numberOfMonths={1}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button
                    variant="outline"
                    className="btn-glass h-11"
                    onClick={() => setIsConfirmed(false)}
                  >
                    {t('profitSheet.changeSelection')}
                  </Button>
                </div>

                {/* Missing Cost Warning */}
                {hasProductsWithoutCost && (
                  <Link to="/products">
                    <Alert className="border-warning/50 bg-warning/10 hover:bg-warning/20 transition-colors cursor-pointer">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <AlertDescription className="text-warning font-medium">
                        {t('products.incompleteCosts')} - {t('dashboard.clickToAddQuotes')}
                      </AlertDescription>
                    </Alert>
                  </Link>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <Card className="relative p-4 sm:p-6 glass-card rounded-2xl sm:rounded-3xl border-2 border-border/50 overflow-hidden group hover:shadow-glow transition-all duration-300">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-primary/10 flex items-center justify-center group-hover:bg-gradient-primary transition-all">
                        <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">{t('profitSheet.totalRevenue')}</p>
                      <h3 className="text-2xl sm:text-3xl font-bold truncate">{formatAmount(totals.revenue, storeCurrency)}</h3>
                    </div>
                  </Card>

                  <Card className="relative p-4 sm:p-6 glass-card rounded-2xl sm:rounded-3xl border-2 border-border/50 overflow-hidden group hover:shadow-glow transition-all duration-300">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-primary/10 flex items-center justify-center group-hover:bg-gradient-primary transition-all">
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">{t('profitSheet.totalProfit')}</p>
                      <h3 className={`text-2xl sm:text-3xl font-bold truncate ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatAmount(totals.profit, storeCurrency)}
                      </h3>
                    </div>
                  </Card>

                  <Card className="relative p-4 sm:p-6 glass-card rounded-2xl sm:rounded-3xl border-2 border-border/50 overflow-hidden group hover:shadow-glow transition-all duration-300">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-primary/10 flex items-center justify-center group-hover:bg-gradient-primary transition-all">
                        <Facebook className="w-5 h-5 sm:w-6 sm:h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">{t('profitSheet.totalAdSpend')}</p>
                      <h3 className="text-2xl sm:text-3xl font-bold truncate">{formatAmount(totals.adSpend, storeCurrency)}</h3>
                    </div>
                  </Card>

                  <Card className="relative p-4 sm:p-6 glass-card rounded-2xl sm:rounded-3xl border-2 border-border/50 overflow-hidden group hover:shadow-glow transition-all duration-300">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-primary/10 flex items-center justify-center group-hover:bg-gradient-primary transition-all">
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">{t('profitSheet.avgRoas')}</p>
                      <h3 className="text-2xl sm:text-3xl font-bold">{totals.avgRoas.toFixed(2)}x</h3>
                    </div>
                  </Card>
                </div>

                {/* Profit Sheet Table */}
                <Card className="p-3 sm:p-6 glass-card rounded-2xl sm:rounded-3xl border-2 border-border/50">
                  <div className="mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>💱 {t('profitSheet.allValuesConverted')} {selectedCurrency.code} ({selectedCurrency.name})</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full divide-y divide-border/50">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left p-2 sm:p-4 font-semibold text-xs sm:text-sm whitespace-nowrap sticky left-0 bg-card z-10">{t('profitSheet.date')}</th>
                            <th className="text-right p-2 sm:p-4 font-semibold text-xs sm:text-sm whitespace-nowrap">{t('profitSheet.revenue')}</th>
                            <th className="text-right p-2 sm:p-4 font-semibold text-xs sm:text-sm whitespace-nowrap">{t('profitSheet.cog')}</th>
                            <th className="text-right p-2 sm:p-4 font-semibold text-xs sm:text-sm whitespace-nowrap">{t('profitSheet.adSpend')}</th>
                            <th className="text-right p-2 sm:p-4 font-semibold text-xs sm:text-sm whitespace-nowrap">{t('profitSheet.others')}</th>
                            <th className="text-right p-2 sm:p-4 font-semibold text-xs sm:text-sm whitespace-nowrap">{t('profitSheet.refunds')}</th>
                            <th className="text-right p-2 sm:p-4 font-semibold text-xs sm:text-sm whitespace-nowrap">{t('profitSheet.fee')}</th>
                            <th className="text-right p-2 sm:p-4 font-semibold text-xs sm:text-sm whitespace-nowrap">{t('profitSheet.profit')}</th>
                            <th className="text-right p-2 sm:p-4 font-semibold text-xs sm:text-sm whitespace-nowrap">{t('profitSheet.roas')}</th>
                            <th className="text-right p-2 sm:p-4 font-semibold text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">{t('profitSheet.profitMargin')}</th>
                            <th className="text-right p-2 sm:p-4 font-semibold text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">{t('profitSheet.cogPercentage')}</th>
                            <th className="text-center p-2 sm:p-4 font-semibold text-xs sm:text-sm whitespace-nowrap">{t('profitSheet.actions')}</th>
                          </tr>
                        </thead>
                       <tbody>
                         {isFetchingData ? (
                           <tr>
                             <td colSpan={12} className="text-center p-8 sm:p-12">
                               <div className="flex items-center justify-center gap-2">
                                 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                 <span className="text-xs sm:text-sm text-muted-foreground">{t('profitSheet.loading')}</span>
                               </div>
                             </td>
                           </tr>
                         ) : profitData.length === 0 ? (
                           <tr>
                             <td colSpan={12} className="text-center p-8 sm:p-12 text-xs sm:text-sm text-muted-foreground">
                               {t('profitSheet.noDataForPeriod')}
                             </td>
                           </tr>
                         ) : (
                           profitData.map((row) => (
                             <tr key={row.date} className="border-b border-border/30 hover:bg-accent/5">
                                <td className="p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap sticky left-0 bg-card z-10">
                                  {format(new Date(row.date), 'dd/MM/yy')}
                                </td>
                                <td className="text-right p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">{formatAmount(row.revenue, storeCurrency)}</td>
                                <td className="text-right p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">{formatAmount(row.cog, storeCurrency)}</td>
                                <td className="text-right p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">{formatAmount(row.adSpend, storeCurrency)}</td>
                                <td className="text-right p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">
                                  {editingRow === row.date ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editValues.otherExpenses}
                                      onChange={(e) => setEditValues({ ...editValues, otherExpenses: e.target.value })}
                                      className="w-20 h-7 text-right text-xs"
                                    />
                                  ) : (
                                    formatAmount(row.otherExpenses, storeCurrency)
                                  )}
                                </td>
                               <td className="text-right p-2 sm:p-4 text-xs sm:text-sm">
                                 {editingRow === row.date ? (
                                   <Input
                                     type="number"
                                     step="0.01"
                                     value={editValues.manualRefunds}
                                     onChange={(e) => setEditValues({ ...editValues, manualRefunds: e.target.value })}
                                     className="w-20 h-7 text-right text-xs"
                                   />
                                  ) : (
                                    <div className="whitespace-nowrap">
                                      {row.shopifyRefunds > 0 && (
                                        <div className="text-[10px] sm:text-xs text-muted-foreground">
                                          Shop: {formatAmount(row.shopifyRefunds, storeCurrency)}
                                        </div>
                                      )}
                                      {row.manualRefunds > 0 && (
                                        <div className="text-[10px] sm:text-xs text-blue-600">
                                          Man: {formatAmount(row.manualRefunds, storeCurrency)}
                                        </div>
                                      )}
                                      <div className="font-medium">{formatAmount(row.totalRefunds, storeCurrency)}</div>
                                    </div>
                                  )}
                               </td>
                                <td className="text-right p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap text-muted-foreground">
                                  {formatAmount(row.transactionFee, storeCurrency)}
                                </td>
                                <td className={`text-right p-2 sm:p-4 text-xs sm:text-sm font-semibold whitespace-nowrap ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatAmount(row.profit, storeCurrency)}
                                </td>
                               <td className="text-right p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">{row.roas.toFixed(2)}x</td>
                               <td className="text-right p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">{row.profitMargin.toFixed(1)}%</td>
                               <td className="text-right p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">{row.cogPercentage.toFixed(1)}%</td>
                               <td className="text-center p-2 sm:p-4">
                                 {editingRow === row.date ? (
                                   <div className="flex items-center justify-center gap-1">
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={() => handleSaveRow(row.date)}
                                       className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                                     >
                                       <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                     </Button>
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={handleCancelEdit}
                                       className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                                     >
                                       <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                     </Button>
                                   </div>
                                 ) : (
                                   <Button
                                     size="sm"
                                     variant="ghost"
                                     onClick={() => handleEditRow(row.date, row.otherExpenses, row.manualRefunds)}
                                     className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                   >
                                     <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                   </Button>
                                 )}
                               </td>
                             </tr>
                           ))
                         )}
                      </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              </>
            )}
    </PageLayout>
  );
};

export default ProfitSheet;
