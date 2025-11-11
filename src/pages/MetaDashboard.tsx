import { useEffect, useState, useMemo, useCallback, memo } from "react";
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
  Pencil,
  Clock,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
  image_url?: string;
  thumbnail_url?: string;
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

interface AdSet {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  optimization_goal?: string;
  billing_event?: string;
  targeting?: any;
  created_time?: string;
  updated_time?: string;
}

interface Ad {
  id: string;
  name: string;
  status: string;
  creative?: {
    id: string;
    name?: string;
    title?: string;
    body?: string;
    image_url?: string;
    thumbnail_url?: string;
    object_story_spec?: any;
  };
}

interface ColumnConfig {
  id: string;
  labelKey: string;
  isAlwaysVisible: boolean;
  isDefaultVisible: boolean;
  getValue: (campaign: FacebookCampaign, insights: any) => any;
  render: (value: any, campaign: FacebookCampaign, insights: any) => React.ReactNode;
}

// Memoized Campaign Card Component for better performance
const CampaignCard = memo(({ 
  campaign, 
  insights, 
  onViewDetails, 
  onEdit,
  onPause, 
  onActivate,
  t 
}: { 
  campaign: FacebookCampaign; 
  insights: ReturnType<typeof getInsightData>; 
  onViewDetails: () => void;
  onEdit: () => void;
  onPause: () => void;
  onActivate: () => void;
  t: (key: string) => string;
}) => {
  return (
    <Card className="p-6 glass-card hover:border-[#7BBCFE]/40 transition-all group relative border-2 border-[#7BBCFE]/10 bg-gradient-to-br from-[#0A0C14]/60 to-[#1a1f2e]/40 backdrop-blur-xl hover:shadow-2xl hover:shadow-[#7BBCFE]/10">
      <div className="flex flex-col lg:flex-row gap-6 relative">
        {/* Eye and Edit icons in top-right */}
        <div className="absolute top-0 right-0 flex gap-1 z-10">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            onClick={onViewDetails}
            title={t("metaDashboard.viewDetails")}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            onClick={onEdit}
            title={t("metaDashboard.editCampaign")}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </div>

        {/* Campaign Image */}
        {(campaign.image_url || campaign.thumbnail_url) && (
          <div className="w-full lg:w-28 h-28 lg:h-28 flex-shrink-0 rounded-lg overflow-hidden bg-background/20 border border-border/10">
            <img
              src={campaign.image_url || campaign.thumbnail_url}
              alt={campaign.name}
              className="w-full h-full object-cover opacity-40"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Campaign Info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-4 pr-10">
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">{campaign.name}</h3>
              <p className="text-xs text-muted-foreground">{campaign.objective}</p>
            </div>
          </div>

          {/* Key Metrics - Redesigned */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#7BBCFE]/10 to-[#B8A8FE]/10 border border-[#7BBCFE]/20 hover:border-[#7BBCFE]/40 transition-all">
              <p className="text-xs text-[#7BBCFE]/70 mb-2 font-medium">{t('metaDashboard.spent')}</p>
              <p className="text-xl font-bold text-white">€{insights.spend.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#7BBCFE]/10 to-[#B8A8FE]/10 border border-[#7BBCFE]/20 hover:border-[#7BBCFE]/40 transition-all">
              <p className="text-xs text-[#7BBCFE]/70 mb-2 font-medium">{t('metaDashboard.results')}</p>
              <p className="text-xl font-bold text-white">{insights.results.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#0066FF]/10 to-[#7BBCFE]/10 border border-[#0066FF]/20 hover:border-[#0066FF]/40 transition-all">
              <p className="text-xs text-[#0066FF]/70 mb-2 font-medium">CPC</p>
              <p className="text-xl font-bold text-white">€{insights.cpc.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#B8A8FE]/10 to-[#0066FF]/10 border border-[#B8A8FE]/20 hover:border-[#B8A8FE]/40 transition-all">
              <p className="text-xs text-[#B8A8FE]/70 mb-2 font-medium">ROAS</p>
              <p className="text-xl font-bold text-white">
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
                  onClick={onPause}
                >
                  <Pause className="w-4 h-4 mr-1.5" />
                  <span className="text-sm">{t("metaDashboard.pause")}</span>
                </Button>
              ) : (
                <Button
                  className="bg-success/90 hover:bg-success text-success-foreground border-2 border-success shadow-lg hover:shadow-success/50 transition-all duration-300 font-semibold w-full h-auto py-2"
                  onClick={onActivate}
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
    </Card>
  );
});
CampaignCard.displayName = 'CampaignCard';

// Helper function for insight data (moved outside component)
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<FacebookCampaign | null>(null);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loadingAdSets, setLoadingAdSets] = useState(false);
  const [loadingAds, setLoadingAds] = useState(false);
  const [activeTab, setActiveTab] = useState("campaign");
  const [editFormData, setEditFormData] = useState({
    name: "",
    daily_budget: "",
    lifetime_budget: "",
    start_time: "",
    stop_time: "",
    newImage: "",
  });
  const [editAdSetsData, setEditAdSetsData] = useState<Record<string, any>>({});
  const [editAdsData, setEditAdsData] = useState<Record<string, any>>({});
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
      // Use cached ad_accounts from metadata to avoid API calls
      fetchAdAccounts(data);
    } else {
      setIsConnected(false);
    }
  };

  const fetchAdAccounts = async (integrationData?: any) => {
    setLoading(true);
    try {
      // First, try to use cached ad_accounts from integration metadata
      if (integrationData?.metadata?.ad_accounts && Array.isArray(integrationData.metadata.ad_accounts)) {
        console.log("Using cached ad accounts from integration metadata");
        const cachedAccounts = integrationData.metadata.ad_accounts;
        
        if (cachedAccounts.length > 0) {
          setAdAccounts(cachedAccounts);
          const firstAccount = cachedAccounts[0].id;
          setSelectedAdAccount(firstAccount);
          // Fetch campaigns for the first account automatically
          await fetchCampaigns(firstAccount);
          return;
        }
      }

      // If no cached data, fetch from API (this may hit rate limits)
      console.log("No cached accounts found, fetching from API...");
      const { data, error } = await supabase.functions.invoke("facebook-campaigns", {
        body: { action: "listAdAccounts" },
      });

      if (error) {
        console.error("Edge Function error:", error);
        // Check for rate limiting
        if (error.message?.includes("429") || error.message?.includes("rate limit")) {
          toast({
            title: "⏱️ " + t("metaDashboard.rateLimitReached"),
            description: "Facebook API rate limit reached. Please wait 5-10 minutes before trying again.",
            variant: "destructive",
            duration: 10000,
          });
        }
        // Check if it's a 500 error or network error
        else if (error.message?.includes("500") || error.message?.includes("non-2xx")) {
          toast({
            title: t("metaDashboard.errorLoadingAccounts"),
            description: t("metaDashboard.serverError") || "Server error. Please try again later or check your Facebook connection.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      if (data?.error) {
        // Check if it's a rate limit error from the response
        if (data.code === 'RATE_LIMIT_EXCEEDED' || data.error.includes('80004') || data.error.includes('rate limit')) {
          toast({
            title: "⏱️ Facebook API Rate Limit",
            description: "Too many requests to Facebook. Please wait 5-10 minutes and try refreshing the page.",
            variant: "destructive",
            duration: 10000,
          });
        } else {
          toast({
            title: t("metaDashboard.errorLoadingAccounts"),
            description: data.error,
            variant: "destructive",
          });
        }
        setLoading(false);
        return;
      }

      if (data?.adAccounts && data.adAccounts.length > 0) {
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
        description: error.message || t("metaDashboard.unknownErrorLoadingAccounts") || "Failed to load ad accounts. Please check your connection.",
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

      if (error) {
        console.error("Edge Function error:", error);
        // Check if it's a rate limit error (429)
        if (error.message?.includes("429") || error.message?.includes("rate limit")) {
          toast({
            title: "⏱️ " + t("metaDashboard.rateLimitReached"),
            description: "Facebook API rate limit reached. Please wait 5 minutes before trying again.",
            variant: "destructive",
            duration: 7000,
          });
          setCampaigns([]);
        }
        // Check if it's a 500 error or network error
        else if (error.message?.includes("500") || error.message?.includes("non-2xx")) {
          toast({
            title: t("metaDashboard.errorLoadingCampaigns"),
            description: t("metaDashboard.serverError") || "Server error. Please try again later or check your Facebook connection.",
            variant: "destructive",
          });
          setCampaigns([]);
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      if (data?.error) {
        // Check if it's a rate limit error from the response
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
          toast({
            title: "⏱️ Facebook API Rate Limit",
            description: "Too many requests. Please wait 5 minutes before trying again.",
            variant: "destructive",
            duration: 7000,
          });
        } 
        // Check if it's a connection/permission error
        else if (data.error.includes('No ad account found') || data.error.includes('permissions')) {
          toast({
            title: "🔗 " + t("metaDashboard.connectionError"),
            description: data.error + (data.suggestion ? "\n" + data.suggestion : ""),
            variant: "destructive",
            duration: 7000,
          });
        }
        else {
          toast({
            title: t("metaDashboard.errorLoadingCampaigns"),
            description: data.error,
            variant: "destructive",
          });
        }
        setCampaigns([]);
      } else {
        setCampaigns(data?.campaigns || []);
        console.log(`Loaded ${data?.campaigns?.length || 0} campaigns`);
      }
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      toast({
        title: t("metaDashboard.errorLoadingCampaigns"),
        description: error.message || t("metaDashboard.unknownErrorLoadingCampaigns") || "Failed to load campaigns. Please try again.",
        variant: "destructive",
      });
      setCampaigns([]);
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


  const handleUpdateCampaign = async () => {
    if (!editingCampaign) return;

    try {
      const updates: any = {};
      
      if (editFormData.name && editFormData.name !== editingCampaign.name) {
        updates.name = editFormData.name;
      }
      
      if (editFormData.daily_budget) {
        updates.daily_budget = Math.round(parseFloat(editFormData.daily_budget) * 100);
      }
      
      if (editFormData.lifetime_budget) {
        updates.lifetime_budget = Math.round(parseFloat(editFormData.lifetime_budget) * 100);
      }
      
      if (editFormData.start_time) {
        // Facebook API expects timestamp in seconds or ISO string
        updates.start_time = new Date(editFormData.start_time).toISOString();
      }
      
      if (editFormData.stop_time) {
        // Facebook API expects timestamp in seconds or ISO string
        updates.stop_time = new Date(editFormData.stop_time).toISOString();
      }
      
      // Clear budget if switching between daily and lifetime
      if (editFormData.daily_budget && editingCampaign.lifetime_budget) {
        // Remove lifetime_budget when switching to daily
        updates.lifetime_budget = 0; // Set to 0 to clear it
      }
      if (editFormData.lifetime_budget && editingCampaign.daily_budget) {
        // Remove daily_budget when switching to lifetime
        updates.daily_budget = 0; // Set to 0 to clear it
      }

      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined || updates[key] === null || updates[key] === '') {
          delete updates[key];
        }
      });

      if (Object.keys(updates).length === 0) {
        toast({
          title: t("metaDashboard.noChanges"),
          description: t("metaDashboard.noChangesDesc"),
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("facebook-campaigns", {
        body: {
          action: "update",
          campaignId: editingCampaign.id,
          updates,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: t("metaDashboard.errorUpdating"),
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: t("metaDashboard.updatedSuccess"),
          description: t("metaDashboard.updatedDesc"),
        });
        setShowEditDialog(false);
        setEditingCampaign(null);
        fetchCampaigns();
      }
    } catch (error: any) {
      console.error("Error updating campaign:", error);
      toast({
        title: t("metaDashboard.errorUpdatingCampaign"),
        description: error.message || t("metaDashboard.unknownError"),
        variant: "destructive",
      });
    }
  };

  const fetchAdSetsAndAds = async (campaignId: string) => {
    console.log("🔍 Fetching ad sets and ads for campaign:", campaignId);
    setLoadingAdSets(true);
    setLoadingAds(true);
    
    try {
      // Fetch Ad Sets
      console.log("📋 Fetching ad sets...");
      const { data: adSetsData, error: adSetsError } = await supabase.functions.invoke("facebook-campaigns", {
        body: {
          action: "getAdSets",
          campaignId,
        },
      });

      console.log("📊 Ad Sets response:", adSetsData);
      console.log("❌ Ad Sets error:", adSetsError);

      if (adSetsError) {
        console.error("Error fetching ad sets:", adSetsError);
        throw adSetsError;
      }

      if (adSetsData?.adSets && Array.isArray(adSetsData.adSets)) {
        console.log(`✅ Found ${adSetsData.adSets.length} ad sets`);
        setAdSets(adSetsData.adSets);
        // Initialize edit data for each ad set
        const adSetsEditData: Record<string, any> = {};
        adSetsData.adSets.forEach((adSet: AdSet) => {
          adSetsEditData[adSet.id] = {
            name: adSet.name || "",
            daily_budget: adSet.daily_budget ? (parseFloat(adSet.daily_budget) / 100).toString() : "",
            lifetime_budget: adSet.lifetime_budget ? (parseFloat(adSet.lifetime_budget) / 100).toString() : "",
            optimization_goal: adSet.optimization_goal || "",
            billing_event: adSet.billing_event || "",
          };
        });
        setEditAdSetsData(adSetsEditData);
      } else {
        console.log("⚠️ No ad sets found or invalid data:", adSetsData);
        setAdSets([]);
        setEditAdSetsData({});
      }

      // Fetch Ads
      console.log("📋 Fetching ads...");
      const { data: adsData, error: adsError } = await supabase.functions.invoke("facebook-campaigns", {
        body: {
          action: "getCreatives",
          campaignId,
        },
      });

      console.log("📊 Ads response:", adsData);
      console.log("❌ Ads error:", adsError);

      if (adsError) {
        console.error("Error fetching ads:", adsError);
        throw adsError;
      }

      if (adsData?.ads && Array.isArray(adsData.ads)) {
        console.log(`✅ Found ${adsData.ads.length} ads`);
        setAds(adsData.ads);
        // Initialize edit data for each ad
        const adsEditData: Record<string, any> = {};
        adsData.ads.forEach((ad: Ad) => {
          adsEditData[ad.id] = {
            name: ad.name || "",
            title: ad.creative?.title || "",
            body: ad.creative?.body || "",
            image_url: ad.creative?.image_url || ad.creative?.thumbnail_url || "",
          };
        });
        setEditAdsData(adsEditData);
      } else {
        console.log("⚠️ No ads found or invalid data:", adsData);
        setAds([]);
        setEditAdsData({});
      }
    } catch (error: any) {
      console.error("❌ Error fetching ad sets and ads:", error);
      toast({
        title: t("metaDashboard.errorLoadingAdSets"),
        description: error.message || t("metaDashboard.unknownError"),
        variant: "destructive",
      });
    } finally {
      setLoadingAdSets(false);
      setLoadingAds(false);
    }
  };

  const handleUpdateAdSet = async (adSetId: string) => {
    try {
      const updates: any = {};
      const adSetData = editAdSetsData[adSetId];
      
      if (!adSetData) return;

      if (adSetData.name) updates.name = adSetData.name;
      if (adSetData.daily_budget) {
        updates.daily_budget = Math.round(parseFloat(adSetData.daily_budget) * 100);
      }
      if (adSetData.lifetime_budget) {
        updates.lifetime_budget = Math.round(parseFloat(adSetData.lifetime_budget) * 100);
      }
      if (adSetData.optimization_goal) updates.optimization_goal = adSetData.optimization_goal;
      if (adSetData.billing_event) updates.billing_event = adSetData.billing_event;

      if (Object.keys(updates).length === 0) return;

      const { data, error } = await supabase.functions.invoke("facebook-campaigns", {
        body: {
          action: "updateAdSet",
          adSetId,
          updates,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: t("metaDashboard.errorUpdatingAdSet"),
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: t("metaDashboard.adSetUpdated"),
          description: t("metaDashboard.adSetUpdatedDesc"),
        });
        if (editingCampaign) {
          await fetchAdSetsAndAds(editingCampaign.id);
        }
      }
    } catch (error: any) {
      console.error("Error updating ad set:", error);
      toast({
        title: t("metaDashboard.errorUpdatingAdSet"),
        description: error.message || t("metaDashboard.unknownError"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateAd = async (adId: string) => {
    try {
      const updates: any = {};
      const adData = editAdsData[adId];
      
      if (!adData) return;

      if (adData.name) updates.name = adData.name;
      if (adData.title || adData.body) {
        updates.creative = {};
        if (adData.title) updates.creative.title = adData.title;
        if (adData.body) updates.creative.body = adData.body;
        if (adData.image_url) updates.creative.image_url = adData.image_url;
      }

      if (Object.keys(updates).length === 0) return;

      const { data, error } = await supabase.functions.invoke("facebook-campaigns", {
        body: {
          action: "updateAd",
          adId,
          updates,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: t("metaDashboard.errorUpdatingAd"),
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: t("metaDashboard.adUpdated"),
          description: t("metaDashboard.adUpdatedDesc"),
        });
        if (editingCampaign) {
          await fetchAdSetsAndAds(editingCampaign.id);
        }
      }
    } catch (error: any) {
      console.error("Error updating ad:", error);
      toast({
        title: t("metaDashboard.errorUpdatingAd"),
        description: error.message || t("metaDashboard.unknownError"),
        variant: "destructive",
      });
    }
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
          <Card className="p-8 text-center glass-card">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-warning" />
            <h2 className="text-2xl font-bold mb-2">{t("metaDashboard.connectTitle")}</h2>
            <p className="text-muted-foreground mb-6">{t("metaDashboard.connectDesc")}</p>
            <Button className="btn-gradient" onClick={() => navigate("/settings")}>
              <ExternalLink className="w-4 h-4 mr-2" />
              {t("metaDashboard.goToSettings")}
            </Button>
          </Card>
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
      <div className="space-y-6">
            {/* Ad Account Selector & Filters - Redesigned */}
            <Card className="p-6 glass-card border-2 border-[#7BBCFE]/20 bg-gradient-to-br from-[#0A0C14]/50 to-[#1a1f2e]/30 backdrop-blur-xl">
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

                <Button 
                  className="bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] hover:opacity-90 text-white font-semibold shadow-lg shadow-[#7BBCFE]/30 transition-all duration-300 hover:scale-105" 
                  onClick={() => fetchCampaigns()}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {t("metaDashboard.refresh")}
                </Button>
              </div>
            </Card>

            {/* Search & Filter - Redesigned */}
            <Card className="p-6 glass-card border-2 border-[#7BBCFE]/20 bg-gradient-to-br from-[#0A0C14]/50 to-[#1a1f2e]/30 backdrop-blur-xl">
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

            {/* Campaigns List - Redesigned */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] bg-clip-text text-transparent">
                    {t('metaDashboard.campaignsTitle')}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'}
                  </p>
                </div>
              </div>

              {filteredCampaigns.length === 0 ? (
                <Card className="p-12 text-center glass-card border-2 border-[#7BBCFE]/20 bg-gradient-to-br from-[#0A0C14]/50 to-[#1a1f2e]/30">
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#7BBCFE]/20 to-[#B8A8FE]/20 flex items-center justify-center">
                      <Target className="w-8 h-8 text-[#7BBCFE]" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white mb-2">{t("metaDashboard.noCampaigns")}</p>
                      <p className="text-sm text-muted-foreground">
                        {loading ? "Loading campaigns..." : "No campaigns found. Try adjusting your filters or date range."}
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredCampaigns.map((campaign) => {
                    const insights = getInsightData(campaign);
                    return (
                      <CampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        insights={insights}
                        onViewDetails={() => {
                          setSelectedCampaign(campaign);
                          setShowDetailsDialog(true);
                        }}
                        onEdit={async () => {
                          try {
                            console.log("✏️ Edit button clicked for campaign:", campaign.id, campaign.name);
                            
                            if (!campaign || !campaign.id) {
                              toast({
                                title: t("metaDashboard.error"),
                                description: t("metaDashboard.invalidCampaignId"),
                                variant: "destructive",
                              });
                              return;
                            }

                            setEditingCampaign(campaign);
                            
                            // Safely format dates
                            let startTime = "";
                            let stopTime = "";
                            
                            try {
                              if (campaign.start_time) {
                                const startDate = new Date(campaign.start_time);
                                if (!isNaN(startDate.getTime())) {
                                  startTime = format(startDate, "yyyy-MM-dd'T'HH:mm");
                                }
                              }
                            } catch (e) {
                              console.warn("Error formatting start_time:", e);
                            }
                            
                            try {
                              if (campaign.stop_time) {
                                const stopDate = new Date(campaign.stop_time);
                                if (!isNaN(stopDate.getTime())) {
                                  stopTime = format(stopDate, "yyyy-MM-dd'T'HH:mm");
                                }
                              }
                            } catch (e) {
                              console.warn("Error formatting stop_time:", e);
                            }
                            
                            setEditFormData({
                              name: campaign.name || "",
                              daily_budget: campaign.daily_budget ? (parseFloat(campaign.daily_budget) / 100).toString() : "",
                              lifetime_budget: campaign.lifetime_budget ? (parseFloat(campaign.lifetime_budget) / 100).toString() : "",
                              start_time: startTime,
                              stop_time: stopTime,
                              newImage: "",
                            });
                            setShowEditDialog(true);
                            setActiveTab("campaign");
                            
                            // Reset ad sets and ads before fetching
                            setAdSets([]);
                            setAds([]);
                            setEditAdSetsData({});
                            setEditAdsData({});
                            
                            // Fetch ad sets and ads
                            console.log("📞 Calling fetchAdSetsAndAds for campaign:", campaign.id);
                            try {
                              await fetchAdSetsAndAds(campaign.id);
                              console.log("✅ fetchAdSetsAndAds completed for campaign:", campaign.id);
                            } catch (error: any) {
                              console.error("❌ Error in fetchAdSetsAndAds:", error);
                              // Don't show error toast here as fetchAdSetsAndAds already handles it
                              // Just log it for debugging
                            }
                          } catch (error: any) {
                            console.error("❌ Error in onEdit handler:", error);
                            toast({
                              title: t("metaDashboard.error"),
                              description: error?.message || t("metaDashboard.unknownError"),
                              variant: "destructive",
                            });
                          }
                        }}
                        onPause={() => setCampaignToPause(campaign.id)}
                        onActivate={() => setCampaignToActivate(campaign.id)}
                        t={t}
                      />
                    );
                  })}
                </div>
                )}
              </div>
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

        {/* Edit Campaign Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="glass-card max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                {t("metaDashboard.editCampaign")}
              </DialogTitle>
              <DialogDescription>
                {editingCampaign?.name}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={(value) => {
              console.log("🔄 Tab changed to:", value, "adSets.length:", adSets.length, "ads.length:", ads.length);
              setActiveTab(value);
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="campaign">{t("metaDashboard.campaign")}</TabsTrigger>
                <TabsTrigger value="adsets">
                  {t("metaDashboard.adSets")} ({adSets.length})
                </TabsTrigger>
                <TabsTrigger value="ads">
                  {t("metaDashboard.ads")} ({ads.length})
                </TabsTrigger>
              </TabsList>

              {/* Campaign Tab */}
              <TabsContent value="campaign" className="space-y-4 pt-4">
              {/* Campaign Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("metaDashboard.campaignName")}</label>
                <Input
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder={t("metaDashboard.campaignNamePlaceholder")}
                />
              </div>

              {/* Budget Section */}
              <div className="space-y-4 p-4 rounded-lg bg-background/30 border border-border/20">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {t("metaDashboard.budget")}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Daily Budget */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("metaDashboard.dailyBudget")} {t("metaDashboard.currencySymbol")}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.daily_budget}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditFormData({ 
                          ...editFormData, 
                          daily_budget: value,
                          lifetime_budget: value ? "" : editFormData.lifetime_budget 
                        });
                      }}
                      placeholder={t("metaDashboard.placeholderBudget")}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("metaDashboard.dailyBudgetDesc")}
                    </p>
                  </div>

                  {/* Lifetime Budget */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("metaDashboard.lifetimeBudget")} {t("metaDashboard.currencySymbol")}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.lifetime_budget}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditFormData({ 
                          ...editFormData, 
                          lifetime_budget: value,
                          daily_budget: value ? "" : editFormData.daily_budget 
                        });
                      }}
                      placeholder={t("metaDashboard.placeholderBudget")}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("metaDashboard.lifetimeBudgetDesc")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Schedule Section */}
              <div className="space-y-4 p-4 rounded-lg bg-background/30 border border-border/20">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t("metaDashboard.schedule")}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Time */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("metaDashboard.startTime")}
                    </label>
                    <Input
                      type="datetime-local"
                      value={editFormData.start_time}
                      onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                    />
                  </div>

                  {/* Stop Time */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("metaDashboard.stopTime")}
                    </label>
                    <Input
                      type="datetime-local"
                      value={editFormData.stop_time}
                      onChange={(e) => setEditFormData({ ...editFormData, stop_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Image Section */}
              <div className="space-y-4 p-4 rounded-lg bg-background/30 border border-border/20">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {t("metaDashboard.changeImage")}
                </h3>
                
                {/* Current Image */}
                {editingCampaign?.image_url || editingCampaign?.thumbnail_url ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("metaDashboard.currentImage")}</label>
                    <div className="relative w-full h-48 rounded-lg overflow-hidden bg-background/30 border border-border/20">
                      <img
                        src={editingCampaign.image_url || editingCampaign.thumbnail_url}
                        alt={editingCampaign.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("metaDashboard.noImage")}</p>
                )}

                {/* Upload New Image */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("metaDashboard.uploadImage")}</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Convert to base64 for preview and upload
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64String = reader.result as string;
                          setEditFormData({ ...editFormData, newImage: base64String });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("metaDashboard.imageUploadDesc")}
                  </p>
                </div>
              </div>
              </TabsContent>

              {/* Ad Sets Tab */}
              <TabsContent value="adsets" className="space-y-4 pt-4">
                {(() => {
                  console.log("🔍 Rendering Ad Sets tab - loadingAdSets:", loadingAdSets, "adSets.length:", adSets.length, "adSets:", adSets);
                  return null;
                })()}
                {loadingAdSets ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingOverlay />
                  </div>
                ) : adSets.length === 0 ? (
                  <Card className="p-8 text-center glass-card">
                    <p className="text-muted-foreground">{t("metaDashboard.noAdSets")}</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {adSets.map((adSet) => (
                      <Card key={adSet.id} className="p-4 glass-card">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{adSet.name || adSet.id}</h4>
                            <Badge className={adSet.status === "ACTIVE" ? "bg-success/20 text-success" : "bg-muted"}>
                              {adSet.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>{t("metaDashboard.adSetName")}</Label>
                              <Input
                                value={editAdSetsData[adSet.id]?.name || ""}
                                onChange={(e) => {
                                  setEditAdSetsData({
                                    ...editAdSetsData,
                                    [adSet.id]: { ...editAdSetsData[adSet.id], name: e.target.value },
                                  });
                                }}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>{t("metaDashboard.dailyBudget")} {t("metaDashboard.currencySymbol")}</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editAdSetsData[adSet.id]?.daily_budget || ""}
                                onChange={(e) => {
                                  setEditAdSetsData({
                                    ...editAdSetsData,
                                    [adSet.id]: { 
                                      ...editAdSetsData[adSet.id], 
                                      daily_budget: e.target.value,
                                      lifetime_budget: e.target.value ? "" : editAdSetsData[adSet.id]?.lifetime_budget 
                                    },
                                  });
                                }}
                                placeholder={t("metaDashboard.placeholderBudget")}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>{t("metaDashboard.lifetimeBudget")} {t("metaDashboard.currencySymbol")}</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editAdSetsData[adSet.id]?.lifetime_budget || ""}
                                onChange={(e) => {
                                  setEditAdSetsData({
                                    ...editAdSetsData,
                                    [adSet.id]: { 
                                      ...editAdSetsData[adSet.id], 
                                      lifetime_budget: e.target.value,
                                      daily_budget: e.target.value ? "" : editAdSetsData[adSet.id]?.daily_budget 
                                    },
                                  });
                                }}
                                placeholder={t("metaDashboard.placeholderBudget")}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>{t("metaDashboard.optimizationGoal")}</Label>
                              <Input
                                value={editAdSetsData[adSet.id]?.optimization_goal || ""}
                                onChange={(e) => {
                                  setEditAdSetsData({
                                    ...editAdSetsData,
                                    [adSet.id]: { ...editAdSetsData[adSet.id], optimization_goal: e.target.value },
                                  });
                                }}
                                placeholder={t("metaDashboard.optimizationGoalPlaceholder")}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>{t("metaDashboard.billingEvent")}</Label>
                              <Input
                                value={editAdSetsData[adSet.id]?.billing_event || ""}
                                onChange={(e) => {
                                  setEditAdSetsData({
                                    ...editAdSetsData,
                                    [adSet.id]: { ...editAdSetsData[adSet.id], billing_event: e.target.value },
                                  });
                                }}
                                placeholder={t("metaDashboard.billingEventPlaceholder")}
                              />
                            </div>
                          </div>
                          
                          <Button 
                            className="btn-gradient w-full" 
                            onClick={() => handleUpdateAdSet(adSet.id)}
                          >
                            {t("metaDashboard.saveAdSet")}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Ads Tab */}
              <TabsContent value="ads" className="space-y-4 pt-4">
                {(() => {
                  console.log("🔍 Rendering Ads tab - loadingAds:", loadingAds, "ads.length:", ads.length, "ads:", ads);
                  return null;
                })()}
                {loadingAds ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingOverlay />
                  </div>
                ) : ads.length === 0 ? (
                  <Card className="p-8 text-center glass-card">
                    <p className="text-muted-foreground">{t("metaDashboard.noAds")}</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {ads.map((ad) => (
                      <Card key={ad.id} className="p-4 glass-card">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{ad.name || ad.id}</h4>
                            <Badge className={ad.status === "ACTIVE" ? "bg-success/20 text-success" : "bg-muted"}>
                              {ad.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                              <Label>{t("metaDashboard.adName")}</Label>
                              <Input
                                value={editAdsData[ad.id]?.name || ""}
                                onChange={(e) => {
                                  setEditAdsData({
                                    ...editAdsData,
                                    [ad.id]: { ...editAdsData[ad.id], name: e.target.value },
                                  });
                                }}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>{t("metaDashboard.adTitle")}</Label>
                              <Input
                                value={editAdsData[ad.id]?.title || ""}
                                onChange={(e) => {
                                  setEditAdsData({
                                    ...editAdsData,
                                    [ad.id]: { ...editAdsData[ad.id], title: e.target.value },
                                  });
                                }}
                                placeholder={t("metaDashboard.adTitlePlaceholder")}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>{t("metaDashboard.adBody")}</Label>
                              <Textarea
                                value={editAdsData[ad.id]?.body || ""}
                                onChange={(e) => {
                                  setEditAdsData({
                                    ...editAdsData,
                                    [ad.id]: { ...editAdsData[ad.id], body: e.target.value },
                                  });
                                }}
                                placeholder={t("metaDashboard.adBodyPlaceholder")}
                                rows={4}
                              />
                            </div>
                            
                            {editAdsData[ad.id]?.image_url && (
                              <div className="space-y-2">
                                <Label>{t("metaDashboard.currentImage")}</Label>
                                <div className="relative w-full h-48 rounded-lg overflow-hidden bg-background/30 border border-border/20">
                                  <img
                                    src={editAdsData[ad.id].image_url}
                                    alt={ad.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <Label>{t("metaDashboard.uploadImage")}</Label>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const base64String = reader.result as string;
                                      setEditAdsData({
                                        ...editAdsData,
                                        [ad.id]: { ...editAdsData[ad.id], image_url: base64String },
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="cursor-pointer"
                              />
                            </div>
                          </div>
                          
                          <Button 
                            className="btn-gradient w-full" 
                            onClick={() => handleUpdateAd(ad.id)}
                          >
                            {t("metaDashboard.saveAd")}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex gap-4 justify-end pt-6 border-t border-border/50">
              <Button variant="outline" onClick={() => {
                setShowEditDialog(false);
                setEditingCampaign(null);
                setAdSets([]);
                setAds([]);
                setEditFormData({
                  name: "",
                  daily_budget: "",
                  lifetime_budget: "",
                  start_time: "",
                  stop_time: "",
                  newImage: "",
                });
                setEditAdSetsData({});
                setEditAdsData({});
              }}>
                {t("metaDashboard.cancel")}
              </Button>
              {activeTab === "campaign" && (
                <Button className="btn-gradient" onClick={handleUpdateCampaign}>
                  {t("metaDashboard.saveChanges")}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
    </PageLayout>
  );
};

export default MetaDashboard;
