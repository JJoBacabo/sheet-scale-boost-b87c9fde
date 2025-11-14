import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageLayout } from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, DollarSign, ShoppingCart, Target } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useLanguage } from '@/contexts/LanguageContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function DashboardNew() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [shopifyStores, setShopifyStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 7));
  const [dateTo, setDateTo] = useState<Date>(new Date());

  const { data, isLoading } = useDashboardData({
    shopifyIntegrationId: selectedStore,
    adAccountId: selectedAdAccount,
    dateFrom: format(dateFrom, 'yyyy-MM-dd'),
    dateTo: format(dateTo, 'yyyy-MM-dd'),
  });

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      // Load Shopify stores
      const { data: integrations } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('integration_type', 'shopify');

      if (integrations && integrations.length > 0) {
        setShopifyStores(integrations);
        setSelectedStore(integrations[0].id);
      }

      // Load Facebook ad accounts
      const { data: fbIntegration } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('integration_type', 'facebook_ads')
        .single();

      if (fbIntegration?.metadata) {
        const metadata = fbIntegration.metadata as any;
        if (metadata.ad_accounts) {
          setAdAccounts(metadata.ad_accounts);
          if (metadata.ad_accounts.length > 0) {
            setSelectedAdAccount(metadata.ad_accounts[0].id);
          }
        }
      }
    }

    loadUser();
  }, [navigate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <PageLayout title="Dashboard">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Store Selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">Loja Shopify</label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {shopifyStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.metadata?.myshopify_domain || store.metadata?.shop_domain || 'Loja'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ad Account Selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">Conta de Anúncios</label>
                <Select value={selectedAdAccount} onValueChange={setSelectedAdAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
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

              {/* Date From */}
              <div>
                <label className="text-sm font-medium mb-2 block">Data Início</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateFrom, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => date && setDateFrom(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div>
                <label className="text-sm font-medium mb-2 block">Data Fim</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateTo, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => date && setDateTo(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {/* Metrics Cards */}
        {!isLoading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">Shopify API</p>
                </CardContent>
              </Card>

              {/* Total Ad Spend */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Ad Spend</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data.totalAdSpend)}</div>
                  <p className="text-xs text-muted-foreground">Facebook API</p>
                </CardContent>
              </Card>

              {/* Total Supplier Cost (COG) */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Supplier Cost</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data.totalSupplierCost)}</div>
                  <p className="text-xs text-muted-foreground">Products Table</p>
                </CardContent>
              </Card>

              {/* Profit */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Profit</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data.profit)}</div>
                  <p className="text-xs text-muted-foreground">
                    Margin: {formatPercentage(data.profitMargin)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Conversions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Conversions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalConversions}</div>
                  <p className="text-xs text-muted-foreground">Total orders</p>
                </CardContent>
              </Card>

              {/* Average ROAS */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average ROAS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.averageRoas.toFixed(2)}x</div>
                  <p className="text-xs text-muted-foreground">Return on ad spend</p>
                </CardContent>
              </Card>

              {/* Average CPC */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average CPC</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data.averageCpc)}</div>
                  <p className="text-xs text-muted-foreground">Cost per click</p>
                </CardContent>
              </Card>

              {/* Total Clicks */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalClicks}</div>
                  <p className="text-xs text-muted-foreground">Facebook Ads</p>
                </CardContent>
              </Card>
            </div>

            {/* Daily Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Diários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Data</th>
                        <th className="text-right p-2">Revenue</th>
                        <th className="text-right p-2">Ad Spend</th>
                        <th className="text-right p-2">COG</th>
                        <th className="text-right p-2">Conversions</th>
                        <th className="text-right p-2">Clicks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dailyData.map((day) => (
                        <tr key={day.date} className="border-b">
                          <td className="p-2">{format(new Date(day.date), 'dd/MM/yyyy')}</td>
                          <td className="text-right p-2">{formatCurrency(day.revenue)}</td>
                          <td className="text-right p-2">{formatCurrency(day.adSpend)}</td>
                          <td className="text-right p-2">{formatCurrency(day.cog)}</td>
                          <td className="text-right p-2">{day.conversions}</td>
                          <td className="text-right p-2">{day.clicks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageLayout>
  );
}
