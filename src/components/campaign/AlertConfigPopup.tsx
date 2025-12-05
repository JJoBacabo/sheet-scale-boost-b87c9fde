import { useState, useEffect } from "react";
import { Bell, BellOff, Volume2, Mail, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface CampaignAlert {
  id: string;
  campaign_id: string;
  user_id: string;
  metric_type: string;
  operator: string;
  threshold_value: number;
  is_active: boolean;
  triggered_at: string | null;
  notification_channels: string[];
}

interface AlertConfigPopupProps {
  campaignId: string;
  campaignName: string;
  userId: string;
  currentMetrics: {
    results: number;
    spent: number;
    cpc: number;
    roas: number;
  };
  onAlertTriggered?: (alert: CampaignAlert) => void;
}

const METRICS = [
  { value: "results", label: "Resultados", labelEn: "Results" },
  { value: "spent", label: "Montante Gasto", labelEn: "Amount Spent" },
  { value: "cpc", label: "CPC", labelEn: "CPC" },
  { value: "roas", label: "ROAS", labelEn: "ROAS" },
];

const OPERATORS = [
  { value: ">=", label: "≥ (Maior ou igual)" },
  { value: "<=", label: "≤ (Menor ou igual)" },
  { value: "=", label: "= (Igual)" },
];

export function AlertConfigPopup({ 
  campaignId, 
  campaignName, 
  userId, 
  currentMetrics,
  onAlertTriggered 
}: AlertConfigPopupProps) {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<CampaignAlert[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [metricType, setMetricType] = useState("results");
  const [operator, setOperator] = useState(">=");
  const [thresholdValue, setThresholdValue] = useState("");
  const [channels, setChannels] = useState<string[]>(["visual"]);

  // Load existing alerts
  useEffect(() => {
    if (open && userId) {
      loadAlerts();
    }
  }, [open, campaignId, userId]);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("campaign_alerts")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("user_id", userId);

      if (error) throw error;
      setAlerts((data || []) as CampaignAlert[]);
    } catch (error) {
      console.error("Error loading alerts:", error);
    }
  };

  const handleSaveAlert = async () => {
    if (!thresholdValue || isNaN(parseFloat(thresholdValue))) {
      toast({
        title: t("common.error"),
        description: t("alerts.invalidValue"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaign_alerts")
        .insert({
          campaign_id: campaignId,
          user_id: userId,
          metric_type: metricType,
          operator: operator,
          threshold_value: parseFloat(thresholdValue),
          notification_channels: channels,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setAlerts([...alerts, data as CampaignAlert]);
      setThresholdValue("");
      
      toast({
        title: t("common.success"),
        description: t("alerts.created"),
      });
    } catch (error) {
      console.error("Error creating alert:", error);
      toast({
        title: t("common.error"),
        description: t("alerts.createError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("campaign_alerts")
        .delete()
        .eq("id", alertId);

      if (error) throw error;

      setAlerts(alerts.filter(a => a.id !== alertId));
      toast({
        title: t("common.success"),
        description: t("alerts.deleted"),
      });
    } catch (error) {
      console.error("Error deleting alert:", error);
    }
  };

  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("campaign_alerts")
        .update({ is_active: isActive })
        .eq("id", alertId);

      if (error) throw error;

      setAlerts(alerts.map(a => 
        a.id === alertId ? { ...a, is_active: isActive } : a
      ));
    } catch (error) {
      console.error("Error toggling alert:", error);
    }
  };

  const toggleChannel = (channel: string) => {
    setChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const hasActiveAlerts = alerts.some(a => a.is_active);
  const hasTriggeredAlerts = alerts.some(a => a.triggered_at && a.is_active);

  const getMetricLabel = (metric: string) => {
    const m = METRICS.find(m => m.value === metric);
    return language === "pt" ? m?.label : m?.labelEn;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "h-7 w-7 hover:bg-primary/10 hover:text-primary relative",
            hasTriggeredAlerts && "text-warning"
          )}
          title={t("alerts.configureAlerts")}
        >
          {hasActiveAlerts ? (
            <Bell className={cn("w-4 h-4", hasTriggeredAlerts && "animate-pulse")} />
          ) : (
            <BellOff className="w-4 h-4 text-muted-foreground" />
          )}
          {hasTriggeredAlerts && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-1">{t("alerts.configureAlerts")}</h4>
            <p className="text-xs text-muted-foreground truncate">{campaignName}</p>
          </div>

          {/* Existing Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("alerts.activeAlerts")}</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg border text-xs",
                      alert.triggered_at ? "border-warning/50 bg-warning/10" : "border-border/50 bg-card/50"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Switch
                        checked={alert.is_active}
                        onCheckedChange={(checked) => handleToggleAlert(alert.id, checked)}
                        className="scale-75"
                      />
                      <span className="truncate">
                        {getMetricLabel(alert.metric_type)} {alert.operator} {alert.threshold_value}
                      </span>
                      {alert.triggered_at && (
                        <span className="text-warning">⚠️</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {alert.notification_channels.includes("visual") && <Eye className="w-3 h-3 text-muted-foreground" />}
                      {alert.notification_channels.includes("sound") && <Volume2 className="w-3 h-3 text-muted-foreground" />}
                      {alert.notification_channels.includes("email") && <Mail className="w-3 h-3 text-muted-foreground" />}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 hover:text-destructive"
                        onClick={() => handleDeleteAlert(alert.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Alert Form */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <Label className="text-xs text-muted-foreground">{t("alerts.newAlert")}</Label>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("alerts.metric")}</Label>
                <Select value={metricType} onValueChange={setMetricType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRICS.map(m => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">
                        {language === "pt" ? m.label : m.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">{t("alerts.operator")}</Label>
                <Select value={operator} onValueChange={setOperator}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t("alerts.thresholdValue")}</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={t("alerts.enterValue")}
                value={thresholdValue}
                onChange={(e) => setThresholdValue(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{t("alerts.notifications")}</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={channels.includes("visual")}
                    onCheckedChange={() => toggleChannel("visual")}
                    className="h-3.5 w-3.5"
                  />
                  <Eye className="w-3 h-3" />
                  {t("alerts.visual")}
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={channels.includes("sound")}
                    onCheckedChange={() => toggleChannel("sound")}
                    className="h-3.5 w-3.5"
                  />
                  <Volume2 className="w-3 h-3" />
                  {t("alerts.sound")}
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={channels.includes("email")}
                    onCheckedChange={() => toggleChannel("email")}
                    className="h-3.5 w-3.5"
                  />
                  <Mail className="w-3 h-3" />
                  Email
                </label>
              </div>
            </div>

            <Button 
              onClick={handleSaveAlert} 
              disabled={loading || !thresholdValue}
              className="w-full h-8 text-xs"
            >
              {loading ? t("common.loading") : t("alerts.createAlert")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
