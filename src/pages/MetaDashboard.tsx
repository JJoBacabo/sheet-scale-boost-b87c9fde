import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingOverlay } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import {
  Search,
  Filter,
  Eye,
  Trash2,
  AlertTriangle,
  Pause,
  Play,
  DollarSign,
  Target,
  Zap,
  MousePointerClick,
  Calendar,
  RefreshCw,
  ExternalLink,
  Settings2,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card3D } from "@/components/ui/Card3D";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

interface FacebookCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  created_time: string;
  start_time?: string;
  stop_time?: string;
  insights?: {
    data: Array<{
      impressions: string;
      clicks: string;
      spend: string;
      cpc?: string;
      cpm?: string;
      ctr?: string;
      reach?: string;
      actions?: Array<{ action_type: string; value: string }>;
      action_values?: Array<{ action_type: string; value: string }>;
    }>;
  };
}

interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
}

interface ColumnConfig {
  id: string;
  labelKey: string;
  isAlwaysVisible: boolean;
  isDefaultVisible: boolean;
  getValue: (campaign: FacebookCampaign, insights: any) => any;
  render: (value: any, campaign: FacebookCampaign, insights: any) => React.ReactNode;
}

const MetaDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<FacebookCampaign[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isConnected, setIsConnected] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<FacebookCampaign | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [datePreset, setDatePreset] = useState("today");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [campaignToPause, setCampaignToPause] = useState<string | null>(null);
  const [campaignToActivate, setCampaignToActivate] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("metaDashboard_selectedColumns");
    if (saved) {
      return JSON.parse(saved);
    }
    // No need for defaults since main columns are always visible
    return [];
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        checkConnection(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkConnection = async (userId: string) => {
    const { data, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("integration_type", "facebook_ads")
      .maybeSingle();

    if (data && !error) {
      setIsConnected(true);
      fetchAdAccounts();
    } else {
      setIsConnected(false);
    }
  };

  const fetchAdAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("facebook-campaigns", {
        body: { action: "listAdAccounts" },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: t("metaDashboard.errorLoadingAccounts"),
          description: data.error,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (data.adAccounts && data.adAccounts.length > 0) {
        setAdAccounts(data.adAccounts);
        const firstAccount = data.adAccounts[0].id;
        setSelectedAdAccount(firstAccount);
        // Fetch campaigns for the first account automatically
        await fetchCampaigns(firstAccount);
      } else {
        toast({
          title: t("metaDashboard.noAccountsFound"),
          description: t("metaDashboard.noAccountsFoundDesc"),
          variant: "destructive",
        });
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Error fetching ad accounts:", error);
      toast({
        title: t("metaDashboard.errorLoadingAccounts"),
        description: error.message || t("metaDashboard.unknownErrorLoadingAccounts"),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const fetchCampaigns = async (adAccountId?: string) => {
    if (!adAccountId && !selectedAdAccount) {
      console.warn("No ad account selected, skipping campaign fetch");
      return;
    }

    setLoading(true);
    try {
      const accountToUse = adAccountId || selectedAdAccount;
      console.log("Fetching campaigns for account:", accountToUse);

      // Prepare date parameters based on preset
      let dateParams: any = { datePreset };

      if (datePreset === "custom" && dateRange.from && dateRange.to) {
        dateParams = {
          datePreset: "custom",
          dateFrom: format(dateRange.from, "yyyy-MM-dd"),
          dateTo: format(dateRange.to, "yyyy-MM-dd"),
        };
      }

      const { data, error } = await supabase.functions.invoke("facebook-campaigns", {
        body: {
          action: "list",
          adAccountId: accountToUse,
          ...dateParams,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: t("metaDashboard.errorLoadingCampaigns"),
          description: data.error,
          variant: "destructive",
        });
      } else {
        setCampaigns(data.campaigns || []);
        console.log(`Loaded ${data.campaigns?.length || 0} campaigns`);
      }
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      toast({
        title: t("metaDashboard.errorLoadingCampaigns"),
        description: error.message || t("metaDashboard.unknownErrorLoadingCampaigns"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Optimized filtering with useMemo
  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns;

    if (searchQuery) {
      filtered = filtered.filter((campaign) => campaign.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((campaign) => campaign.status.toLowerCase() === statusFilter);
    }

    return filtered;
  }, [searchQuery, statusFilter, campaigns]);

  // Auto-fetch when datePreset changes (except for custom)
  useEffect(() => {
    if (selectedAdAccount && datePreset !== "custom") {
      fetchCampaigns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datePreset, selectedAdAccount]);

  const handlePauseCampaign = async (campaignId: string) => {
    if (!campaignId) {
      toast({
        title: t("metaDashboard.error"),
        description: t("metaDashboard.invalidCampaignId"),
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("facebook-campaigns", {
        body: { action: "pause", campaignId },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: t("metaDashboard.pausedSuccess"),
          description: t("metaDashboard.pausedDesc"),
        });
        fetchCampaigns();
      } else {
        toast({
          title: t("metaDashboard.errorPausing"),
          description: data.error || t("metaDashboard.unknownError"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error pausing campaign:", error);
      toast({
        title: t("metaDashboard.errorPausingCampaign"),
        description: error.message || t("metaDashboard.unknownError"),
        variant: "destructive",
      });
    } finally {
      setCampaignToPause(null);
    }
  };

  const handleActivateCampaign = async (campaignId: string) => {
    if (!campaignId) {
      toast({
        title: t("metaDashboard.error"),
        description: t("metaDashboard.invalidCampaignId"),
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("facebook-campaigns", {
        body: { action: "activate", campaignId },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: t("metaDashboard.activatedSuccess"),
          description: t("metaDashboard.activatedDesc"),
        });
        fetchCampaigns();
      } else {
        toast({
          title: t("metaDashboard.errorActivating"),
          description: data.error || t("metaDashboard.unknownError"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error activating campaign:", error);
      toast({
        title: t("metaDashboard.errorActivatingCampaign"),
        description: error.message || t("metaDashboard.unknownError"),
        variant: "destructive",
      });
    } finally {
      setCampaignToActivate(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!campaignId) {
      toast({
        title: t("metaDashboard.error"),
        description: t("metaDashboard.invalidCampaignId"),
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("facebook-campaigns", {
        body: { action: "delete", campaignId },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: t("metaDashboard.deletedSuccess"),
          description: t("metaDashboard.deletedDesc"),
        });
        fetchCampaigns();
      } else {
        toast({
          title: t("metaDashboard.errorDeleting"),
          description: data.error || t("metaDashboard.unknownError"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error deleting campaign:", error);
      toast({
        title: t("metaDashboard.errorDeletingCampaign"),
        description: error.message || t("metaDashboard.unknownError"),
        variant: "destructive",
      });
    } finally {
      setCampaignToDelete(null);
    }
  };

  const getInsightData = (campaign: FacebookCampaign) => {
    const insights = campaign.insights?.data?.[0];
    if (!insights)
      return {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        cpc: 0,
        cpm: 0,
        ctr: 0,
        reach: 0,
        linkClicks: 0,
        landingPageViews: 0,
        costPerLandingPageView: 0,
        costPerResult: 0,
        roas: 0,
        results: 0,
      };

    const conversions = insights.actions?.find((a) => a.action_type === "purchase")?.value || "0";
    const linkClicks =
      insights.actions?.find((a) => a.action_type === "link_click")?.value ||
      insights.actions?.find((a) => a.action_type === "outbound_click")?.value ||
      "0";
    const landingPageViews = insights.actions?.find((a) => a.action_type === "landing_page_view")?.value || "0";
    const purchaseValue = insights.action_values?.find((a) => a.action_type === "purchase")?.value || "0";

    const spend = parseFloat(insights.spend || "0");
    const revenue = parseFloat(purchaseValue);
    const roas = spend > 0 ? revenue / spend : 0;

    const allResults =
      insights.actions?.reduce((sum, action) => {
        if (
          action.action_type === "purchase" ||
          action.action_type === "lead" ||
          action.action_type === "link_click" ||
          action.action_type === "post_engagement"
        ) {
          return sum + parseInt(action.value || "0");
        }
        return sum;
      }, 0) || 0;

    const costPerResult = allResults > 0 ? spend / allResults : 0;
    const costPerLandingPageView = parseInt(landingPageViews) > 0 ? spend / parseInt(landingPageViews) : 0;

    return {
      impressions: parseInt(insights.impressions || "0"),
      clicks: parseInt(insights.clicks || "0"),
      spend,
      conversions: parseInt(conversions),
      cpc: parseFloat(insights.cpc || "0"),
      cpm: parseFloat(insights.cpm || "0"),
      ctr: parseFloat(insights.ctr || "0"),
      reach: parseInt(insights.reach || "0"),
      linkClicks: parseInt(linkClicks),
      landingPageViews: parseInt(landingPageViews),
      costPerLandingPageView,
      costPerResult,
      roas,
      results: allResults,
    };
  };

  const handleAdAccountChange = (accountId: string) => {
    if (!accountId) {
      console.warn("Invalid account ID");
      return;
    }
    console.log("Changing to account:", accountId);
    setSelectedAdAccount(accountId);
    fetchCampaigns(accountId);
  };

  // Column configuration
  // Order: Start Date, Name, Status, Resultados, Budget, Amount Spent, CPC, ROAS, Actions
  const allColumns: ColumnConfig[] = [
    {
      id: "startDate",
      labelKey: "metaDashboard.startDate",
      isAlwaysVisible: true,
      isDefaultVisible: true,
      getValue: (campaign) => campaign.start_time || campaign.created_time,
      render: (_, campaign) =>
        campaign.start_time
          ? format(new Date(campaign.start_time), "dd/MM/yyyy")
          : format(new Date(campaign.created_time), "dd/MM/yyyy"),
    },
    {
      id: "name",
      labelKey: "metaDashboard.name",
      isAlwaysVisible: true,
      isDefaultVisible: true,
      getValue: (campaign) => campaign.name,
      render: (_, campaign) => (
        <div>
          <div className="font-semibold">{campaign.name}</div>
          <div className="text-xs text-muted-foreground">
            ID: {campaign.id} • {campaign.objective}
          </div>
        </div>
      ),
    },
    {
      id: "status",
      labelKey: "metaDashboard.status",
      isAlwaysVisible: true,
      isDefaultVisible: true,
      getValue: (campaign) => campaign.status,
      render: (_, campaign) => (
        <Badge
          className={
            campaign.status === "ACTIVE"
              ? "bg-success/20 text-success border-success/30"
              : campaign.status === "PAUSED"
                ? "bg-warning/20 text-warning border-warning/30"
                : "bg-muted/50 text-muted-foreground border-muted"
          }
        >
          {campaign.status}
        </Badge>
      ),
    },
    {
      id: "results",
      labelKey: "metaDashboard.results",
      isAlwaysVisible: true,
      isDefaultVisible: true,
      getValue: (_, insights) => insights.results,
      render: (_, __, insights) => insights.results.toString(),
    },
    {
      id: "budget",
      labelKey: "metaDashboard.budget",
      isAlwaysVisible: true,
      isDefaultVisible: true,
      getValue: (campaign) => campaign.daily_budget || campaign.lifetime_budget,
      render: (_, campaign) =>
        campaign.daily_budget
          ? `€${(parseFloat(campaign.daily_budget) / 100).toFixed(2)}/dia`
          : campaign.lifetime_budget
            ? `€${(parseFloat(campaign.lifetime_budget) / 100).toFixed(2)}`
            : "—",
    },
    {
      id: "spent",
      labelKey: "metaDashboard.spent",
      isAlwaysVisible: true,
      isDefaultVisible: true,
      getValue: (_, insights) => insights.spend,
      render: (_, __, insights) => `€${insights.spend.toFixed(2)}`,
    },
    {
      id: "cpc",
      labelKey: "metaDashboard.cpc",
      isAlwaysVisible: true,
      isDefaultVisible: true,
      getValue: (_, insights) => insights.cpc,
      render: (_, __, insights) => `€${insights.cpc.toFixed(2)}`,
    },
    {
      id: "roas",
      labelKey: "metaDashboard.roas",
      isAlwaysVisible: true,
      isDefaultVisible: true,
      getValue: (_, insights) => insights.roas,
      render: (_, __, insights) => (insights.roas > 0 ? `${insights.roas.toFixed(2)}x` : "—"),
    },
    {
      id: "cpm",
      labelKey: "metaDashboard.cpm",
      isAlwaysVisible: false,
      isDefaultVisible: false,
      getValue: (_, insights) => insights.cpm,
      render: (_, __, insights) => `€${insights.cpm.toFixed(2)}`,
    },
    {
      id: "ctr",
      labelKey: "metaDashboard.ctr",
      isAlwaysVisible: false,
      isDefaultVisible: false,
      getValue: (_, insights) => insights.ctr,
      render: (_, __, insights) => `${insights.ctr.toFixed(2)}%`,
    },
    {
      id: "impressions",
      labelKey: "metaDashboard.impressions",
      isAlwaysVisible: false,
      isDefaultVisible: false,
      getValue: (_, insights) => insights.impressions,
      render: (_, __, insights) => insights.impressions.toLocaleString(),
    },
    {
      id: "reach",
      labelKey: "metaDashboard.reach",
      isAlwaysVisible: false,
      isDefaultVisible: false,
      getValue: (_, insights) => insights.reach,
      render: (_, __, insights) => insights.reach.toLocaleString(),
    },
    {
      id: "linkClicks",
      labelKey: "metaDashboard.linkClicks",
      isAlwaysVisible: false,
      isDefaultVisible: false,
      getValue: (_, insights) => insights.linkClicks,
      render: (_, __, insights) => insights.linkClicks.toLocaleString(),
    },
    {
      id: "landingPageViews",
      labelKey: "metaDashboard.landingPageViews",
      isAlwaysVisible: false,
      isDefaultVisible: false,
      getValue: (_, insights) => insights.landingPageViews,
      render: (_, __, insights) => insights.landingPageViews.toLocaleString(),
    },
    {
      id: "costPerResult",
      labelKey: "metaDashboard.costPerResult",
      isAlwaysVisible: false,
      isDefaultVisible: false,
      getValue: (_, insights) => insights.costPerResult,
      render: (_, __, insights) => `€${insights.costPerResult.toFixed(2)}`,
    },
    {
      id: "costPerLandingPageView",
      labelKey: "metaDashboard.costPerLandingPageView",
      isAlwaysVisible: false,
      isDefaultVisible: false,
      getValue: (_, insights) => insights.costPerLandingPageView,
      render: (_, __, insights) => `€${insights.costPerLandingPageView.toFixed(2)}`,
    },
    {
      id: "actions",
      labelKey: "metaDashboard.actions",
      isAlwaysVisible: true,
      isDefaultVisible: true,
      getValue: () => null,
      render: (_, campaign) => (
        <div className="flex gap-2 justify-center">
          <Button
            size="sm"
            variant="outline"
            className="btn-glass"
            onClick={() => {
              setSelectedCampaign(campaign);
              setShowDetailsDialog(true);
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>

          {campaign.status === "ACTIVE" ? (
            <Button
              size="sm"
              className="mt-4 bg-warning/90 hover:bg-warning text-warning-foreground border-2 border-warning shadow-lg hover:shadow-warning/50 transition-all duration-300 font-semibold"
              onClick={() => setCampaignToPause(campaign.id)}
            >
              <Pause className="w-4 h-4 mr-1" />
              {t('metaDashboard.pause')}
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-success/90 hover:bg-success text-success-foreground border-2 border-success shadow-lg hover:shadow-success/50 transition-all duration-300 font-semibold"
              onClick={() => setCampaignToActivate(campaign.id)}
            >
              <Play className="w-4 h-4 mr-1" />
              {t('metaDashboard.activate')}
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="btn-glass hover:border-destructive/40"
            onClick={() => setCampaignToDelete(campaign.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem("metaDashboard_selectedColumns", JSON.stringify(selectedColumns));
  }, [selectedColumns]);

  const getVisibleColumns = () => {
    const alwaysVisible = allColumns.filter((col) => col.isAlwaysVisible);
    const customColumns = allColumns.filter((col) => !col.isAlwaysVisible && selectedColumns.includes(col.id));
    return [...alwaysVisible, ...customColumns];
  };

  const visibleColumns = getVisibleColumns();

  const handleColumnToggle = (columnId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId],
    );
  };

  const handleResetColumns = () => {
    setSelectedColumns(allColumns.filter((col) => col.isDefaultVisible && !col.isAlwaysVisible).map((col) => col.id));
  };

  if (loading) {
    return <LoadingOverlay message={t("metaDashboard.loading")} />;
  }

  if (!isConnected) {
    return (
      <PageLayout
        title={t("metaDashboard.title")}
        subtitle={t("metaDashboard.connectFacebookDesc")}
      >
        <div className="container max-w-4xl mx-auto">
          <Card3D intensity="low" className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-warning" />
            <h2 className="text-2xl font-bold mb-2">{t("metaDashboard.connectTitle")}</h2>
            <p className="text-muted-foreground mb-6">{t("metaDashboard.connectDesc")}</p>
            <Button className="btn-gradient" onClick={() => navigate("/settings")}>
              <ExternalLink className="w-4 h-4 mr-2" />
              {t("metaDashboard.goToSettings")}
            </Button>
          </Card3D>
        </div>
      </PageLayout>
    );
  }

  // Calculate totals
  const totalSpent = campaigns.reduce((sum, c) => sum + getInsightData(c).spend, 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + getInsightData(c).impressions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + getInsightData(c).clicks, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + getInsightData(c).conversions, 0);
  const avgCPC = totalClicks > 0 ? totalSpent / totalClicks : 0;
  const avgCPM = totalImpressions > 0 ? (totalSpent / totalImpressions) * 1000 : 0;
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <PageLayout
      title={t("metaDashboard.title")}
      subtitle={t('metaDashboard.subtitle')}
      badge={
        <Badge className="bg-success/20 text-success border-success/30">
          {t("metaDashboard.connectedBadge")}
        </Badge>
      }
    >
            {/* Ad Account Selector & Filters */}
            <Card3D intensity="low" className="p-5">
              <div className="flex flex-col lg:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">{t("metaDashboard.adAccount")}</label>
                  <Select value={selectedAdAccount} onValueChange={handleAdAccountChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("metaDashboard.selectAccount")} />
                    </SelectTrigger>
                    <SelectContent>
                      {adAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} - {account.account_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">{t("metaDashboard.period")}</label>
                  <Select
                    value={datePreset}
                    onValueChange={(value) => {
                      setDatePreset(value);
                      if (value === "custom") {
                        setShowDatePicker(true);
                      } else {
                        setShowDatePicker(false);
                        if (value === "today") {
                          setDateRange({ from: new Date(), to: new Date() });
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <Calendar className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">{t("metaDashboard.today")}</SelectItem>
                      <SelectItem value="last_7d">{t("metaDashboard.last7Days")}</SelectItem>
                      <SelectItem value="last_30d">{t("metaDashboard.last30Days")}</SelectItem>
                      <SelectItem value="last_90d">{t("metaDashboard.last90Days")}</SelectItem>
                      <SelectItem value="this_month">{t("metaDashboard.thisMonth")}</SelectItem>
                      <SelectItem value="custom">{t("metaDashboard.custom")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {showDatePicker && datePreset === "custom" && (
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">{t("metaDashboard.dateRange")}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal glass-card",
                            !dateRange?.from && "text-muted-foreground",
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                              </>
                            ) : (
                              format(dateRange.from, "dd/MM/yyyy")
                            )
                          ) : (
                            <span>{t("metaDashboard.selectRange")}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 glass-card border-2 border-border/50" align="start">
                        <CalendarComponent
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange?.from}
                          selected={{ from: dateRange?.from, to: dateRange?.to }}
                          onSelect={(range: any) => {
                            setDateRange({ from: range?.from, to: range?.to });
                          }}
                          numberOfMonths={2}
                          className="pointer-events-auto"
                        />
                        <div className="p-3 border-t border-border/50">
                          <Button
                            className="w-full btn-gradient"
                            onClick={() => {
                              fetchCampaigns();
                              setShowDatePicker(false);
                            }}
                            disabled={!dateRange?.from || !dateRange?.to}
                          >
                            {t("metaDashboard.applyFilter")}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <Button className="btn-gradient" onClick={() => fetchCampaigns()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t("metaDashboard.refresh")}
                </Button>
              </div>
            </Card3D>

            {/* Search & Filter */}
            <Card intensity="low" className="p-5 glass-card">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder={t("metaDashboard.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder={t("metaDashboard.status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("metaDashboard.filterAll")}</SelectItem>
                    <SelectItem value="active">{t("metaDashboard.filterActive")}</SelectItem>
                    <SelectItem value="paused">{t("metaDashboard.filterInactive")}</SelectItem>
                  </SelectContent>
                </Select>

                <Popover open={showColumnSettings} onOpenChange={setShowColumnSettings}>
                  <PopoverTrigger asChild>
                    <button className="flex h-10 w-full md:w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        <span>{t('metaDashboard.customize')}</span>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 glass-card border-2 border-border/50" align="end">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">{t("metaDashboard.selectColumns")}</h4>

                      <div className="border-t border-border/50 pt-4 space-y-2 max-h-96 overflow-y-auto">
                        {allColumns
                          .filter((col) => !col.isAlwaysVisible)
                          .map((column) => (
                            <div key={column.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={column.id}
                                checked={selectedColumns.includes(column.id)}
                                onCheckedChange={() => handleColumnToggle(column.id)}
                              />
                              <label htmlFor={column.id} className="text-sm cursor-pointer flex-1">
                                {t(column.labelKey)}
                              </label>
                            </div>
                          ))}
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-border/50">
                        <Button variant="outline" size="sm" onClick={handleResetColumns} className="flex-1">
                          {t("metaDashboard.resetColumns")}
                        </Button>
                        <Button size="sm" onClick={() => setShowColumnSettings(false)} className="flex-1 btn-gradient">
                          {t("metaDashboard.applyColumns")}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </Card>

            {/* Campaigns List - Simplified */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{t('metaDashboard.campaignsTitle')} ({filteredCampaigns.length})</h2>
              </div>

              {filteredCampaigns.length === 0 ? (
                <Card3D intensity="low" className="p-8 text-center">
                  <p className="text-muted-foreground">{t("metaDashboard.noCampaigns")}</p>
                </Card3D>
              ) : (
                <div className="grid gap-4">
                  {filteredCampaigns.map((campaign) => {
                    const insights = getInsightData(campaign);
                    return (
                      <Card3D
                        key={campaign.id}
                        intensity="low"
                        className="p-5 hover:border-primary/30 transition-all group relative"
                      >
                        <div className="flex flex-col lg:flex-row gap-6 relative">
                          {/* Eye icon in top-right */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-0 right-0 h-8 w-8 hover:bg-primary/10 hover:text-primary z-10"
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Campaign Info */}
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-4 pr-10">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold mb-1">{campaign.name}</h3>
                                <p className="text-xs text-muted-foreground">{campaign.objective}</p>
                              </div>
                            </div>

                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                              <div className="p-3 rounded-lg bg-background/30 border border-border/20">
                                <p className="text-xs text-muted-foreground mb-1">{t('metaDashboard.spent')}</p>
                                <p className="text-lg font-bold">€{insights.spend.toFixed(2)}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-background/30 border border-border/20">
                                <p className="text-xs text-muted-foreground mb-1">{t('metaDashboard.results')}</p>
                                <p className="text-lg font-bold">{insights.results}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-background/30 border border-border/20">
                                <p className="text-xs text-muted-foreground mb-1">CPC</p>
                                <p className="text-lg font-bold">€{insights.cpc.toFixed(2)}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-background/30 border border-border/20">
                                <p className="text-xs text-muted-foreground mb-1">ROAS</p>
                                <p className="text-lg font-bold">
                                  {insights.roas > 0 ? `${insights.roas.toFixed(2)}x` : "—"}
                                </p>
                              </div>
                              <div className="p-3 flex flex-col items-center justify-center gap-2">
                                <Badge
                                  className={
                                    campaign.status === "ACTIVE"
                                      ? "bg-success/20 text-success border-success/30"
                                      : campaign.status === "PAUSED"
                                        ? "bg-warning/20 text-warning border-warning/30"
                                        : "bg-muted/50 text-muted-foreground border-muted"
                                  }
                                >
                                  {campaign.status === "ACTIVE" ? t("metaDashboard.active") : campaign.status === "PAUSED" ? t("metaDashboard.paused") : campaign.status}
                                </Badge>
                                {campaign.status === "ACTIVE" ? (
                                  <Button
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-2 border-destructive shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all duration-300 font-bold w-full h-auto py-2"
                                    onClick={() => setCampaignToPause(campaign.id)}
                                  >
                                    <Pause className="w-4 h-4 mr-1.5" />
                                    <span className="text-sm">{t("metaDashboard.pause")}</span>
                                  </Button>
                                ) : (
                                  <Button
                                    className="bg-success/90 hover:bg-success text-success-foreground border-2 border-success shadow-lg hover:shadow-success/50 transition-all duration-300 font-semibold w-full h-auto py-2"
                                    onClick={() => setCampaignToActivate(campaign.id)}
                                  >
                                    <Play className="w-4 h-4 mr-1.5" />
                                    <span className="text-sm">{t("metaDashboard.activate")}</span>
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Budget Info */}
                            <div className="text-xs text-muted-foreground">
                              <span>{t("metaDashboard.budget")}: </span>
                              <span className="font-medium">
                                {campaign.daily_budget
                                  ? `€${(parseFloat(campaign.daily_budget) / 100).toFixed(2)}${t("metaDashboard.perDay")}`
                                  : campaign.lifetime_budget
                                    ? `€${(parseFloat(campaign.lifetime_budget) / 100).toFixed(2)} ${t("metaDashboard.total")}`
                                    : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card3D>
                    );
                  })}
                </div>
                )}
              </div>

      {/* Campaign Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="glass-card max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("metaDashboard.detailsTitle")}</DialogTitle>
              <DialogDescription>{t("metaDashboard.detailsDesc")}</DialogDescription>
            </DialogHeader>
            {selectedCampaign && (
              <div className="space-y-6">
                <div className="text-center pb-4 border-b border-border/50">
                  <h3 className="text-2xl font-bold mb-2">{selectedCampaign.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">ID: {selectedCampaign.id}</p>
                  <div className="flex items-center gap-2 justify-center text-sm">
                    <Badge className={selectedCampaign.status === "ACTIVE" ? "bg-success/20 text-success" : "bg-muted"}>
                      {selectedCampaign.status}
                    </Badge>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{selectedCampaign.objective}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {(() => {
                    const insights = getInsightData(selectedCampaign);
                    return (
                      <>
                        <div className="p-4 glass-card rounded-lg text-center transition-all duration-300 group cursor-pointer">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t("metaDashboard.impressions")}
                          </p>
                          <p className="text-2xl font-bold">
                            {insights.impressions.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-4 glass-card rounded-lg text-center transition-all duration-300 group cursor-pointer">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t("metaDashboard.reach")}
                          </p>
                          <p className="text-2xl font-bold">
                            {insights.reach.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-4 glass-card rounded-lg text-center transition-all duration-300 group cursor-pointer">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t("metaDashboard.clicks")}
                          </p>
                          <p className="text-2xl font-bold">
                            {insights.clicks.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-4 glass-card rounded-lg text-center transition-all duration-300 group cursor-pointer">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t("metaDashboard.linkClicks")}
                          </p>
                          <p className="text-2xl font-bold">
                            {insights.linkClicks.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-4 glass-card rounded-lg text-center transition-all duration-300 group cursor-pointer">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t("metaDashboard.results")}
                          </p>
                          <p className="text-2xl font-bold">
                            {insights.results.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-4 glass-card rounded-lg text-center transition-all duration-300 group cursor-pointer">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t("metaDashboard.landingPageViews")}
                          </p>
                          <p className="text-2xl font-bold">
                            {insights.landingPageViews.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-4 glass-card rounded-lg text-center transition-all duration-300 group cursor-pointer">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t("metaDashboard.spend")}
                          </p>
                          <p className="text-2xl font-bold">
                            €{insights.spend.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-4 glass-card rounded-lg text-center transition-all duration-300 group cursor-pointer">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t("metaDashboard.cpc")}
                          </p>
                          <p className="text-2xl font-bold">
                            €{insights.cpc.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-4 glass-card rounded-lg text-center transition-all duration-300 group cursor-pointer">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t("metaDashboard.cpm")}
                          </p>
                          <p className="text-2xl font-bold">
                            €{insights.cpm.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-4 glass-card rounded-lg text-center transition-all duration-300 group cursor-pointer">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t("metaDashboard.ctr")}
                          </p>
                          <p className="text-2xl font-bold">
                            {insights.ctr.toFixed(2)}%
                          </p>
                        </div>
                        <div className="p-4 glass-card rounded-lg text-center transition-all duration-300 group cursor-pointer">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t("metaDashboard.costPerResult")}
                          </p>
                          <p className="text-2xl font-bold">
                            €{insights.costPerResult.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-4 glass-card rounded-lg text-center transition-all duration-300 group cursor-pointer">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t("metaDashboard.costPerLandingPageView")}
                          </p>
                          <p className="text-2xl font-bold">
                            €{insights.costPerLandingPageView.toFixed(2)}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="pt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    {t("metaDashboard.createdOn")}:{" "}
                    {format(new Date(selectedCampaign.created_time), "dd/MM/yyyy HH:mm")}
                  </p>

                  {/* Delete Campaign Button */}
                  <div className="flex justify-center">
                    <Button
                      variant="destructive"
                      size="lg"
                      className="min-w-[200px]"
                      onClick={() => {
                        setCampaignToDelete(selectedCampaign.id);
                        setShowDetailsDialog(false);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("metaDashboard.removeCampaign")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!campaignToDelete} onOpenChange={(open) => !open && setCampaignToDelete(null)}>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle>{t("metaDashboard.confirmDeleteTitle")}</DialogTitle>
              <DialogDescription>{t("metaDashboard.confirmDeleteDesc")}</DialogDescription>
            </DialogHeader>
            <div className="flex gap-4 justify-end pt-4">
              <Button variant="outline" onClick={() => setCampaignToDelete(null)}>
                {t("metaDashboard.cancel")}
              </Button>
              <Button variant="destructive" onClick={() => campaignToDelete && handleDeleteCampaign(campaignToDelete)}>
                {t("metaDashboard.confirmDelete")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Pause Confirmation Dialog */}
        <Dialog open={!!campaignToPause} onOpenChange={(open) => !open && setCampaignToPause(null)}>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle>{t("metaDashboard.confirmPauseTitle")}</DialogTitle>
              <DialogDescription>{t("metaDashboard.confirmPauseDesc")}</DialogDescription>
            </DialogHeader>
            <div className="flex gap-4 justify-end pt-4">
              <Button variant="outline" onClick={() => setCampaignToPause(null)}>
                {t("metaDashboard.cancel")}
              </Button>
              <Button className="btn-gradient" onClick={() => campaignToPause && handlePauseCampaign(campaignToPause)}>
                {t("metaDashboard.confirmPause")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Activate Confirmation Dialog */}
        <Dialog open={!!campaignToActivate} onOpenChange={(open) => !open && setCampaignToActivate(null)}>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle>{t("metaDashboard.confirmActivateTitle")}</DialogTitle>
              <DialogDescription>{t("metaDashboard.confirmActivateDesc")}</DialogDescription>
            </DialogHeader>
            <div className="flex gap-4 justify-end pt-4">
              <Button variant="outline" onClick={() => setCampaignToActivate(null)}>
                {t("metaDashboard.cancel")}
              </Button>
              <Button
                className="btn-gradient"
                onClick={() => campaignToActivate && handleActivateCampaign(campaignToActivate)}
              >
                {t("metaDashboard.confirmActivate")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </PageLayout>
  );
};

export default MetaDashboard;
