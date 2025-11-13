import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DashboardFiltersProps {
  userId: string | undefined;
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  campaignId: string;
  productId: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  platform: string;
}

export const DashboardFilters = ({ userId, onFilterChange }: DashboardFiltersProps) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    campaignId: "all",
    productId: "all",
    dateFrom: undefined,
    dateTo: undefined,
    platform: "all",
  });

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      const [{ data: campaignsData }, { data: productsData }] = await Promise.all([
        supabase.from('campaigns').select('id, campaign_name, platform').eq('user_id', userId),
        supabase.from('products').select('id, product_name').eq('user_id', userId)
      ]);

      setCampaigns(campaignsData || []);
      setProducts(productsData || []);
    };

    fetchData();
  }, [userId]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      campaignId: "all",
      productId: "all",
      dateFrom: undefined,
      dateTo: undefined,
      platform: "all",
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <Card className="p-3 sm:p-4 md:p-6 glass-card rounded-xl sm:rounded-2xl border border-border/50">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10">
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          </div>
          <h3 className="text-sm sm:text-base md:text-lg font-semibold">Filtros</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleReset}
          className="text-muted-foreground hover:text-foreground h-8 text-xs sm:text-sm"
        >
          <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden xs:inline">Limpar</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
        {/* Platform Filter */}
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Plataforma</label>
          <Select value={filters.platform} onValueChange={(v) => handleFilterChange('platform', v)}>
            <SelectTrigger className="glass-card border-border/50 h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="facebook">Facebook Ads</SelectItem>
              <SelectItem value="google">Google Ads</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campaign Filter */}
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Campanha</label>
          <Select value={filters.campaignId} onValueChange={(v) => handleFilterChange('campaignId', v)}>
            <SelectTrigger className="glass-card border-border/50 h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as campanhas</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.campaign_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product Filter */}
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Produto</label>
          <Select value={filters.productId} onValueChange={(v) => handleFilterChange('productId', v)}>
            <SelectTrigger className="glass-card border-border/50 h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.product_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Data início</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "w-full justify-start text-left glass-card border-border/50 h-9 sm:h-10 text-xs sm:text-sm",
                  !filters.dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {filters.dateFrom ? format(filters.dateFrom, "PPP", { locale: pt }) : "Selecionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 glass-card border-border/50" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => handleFilterChange('dateFrom', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date To */}
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">Data fim</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "w-full justify-start text-left glass-card border-border/50 h-9 sm:h-10 text-xs sm:text-sm",
                  !filters.dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {filters.dateTo ? format(filters.dateTo, "PPP", { locale: pt }) : "Selecionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 glass-card border-border/50" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) => handleFilterChange('dateTo', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </Card>
  );
};
