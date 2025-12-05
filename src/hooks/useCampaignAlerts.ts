import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

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

interface CampaignMetrics {
  results: number;
  spent: number;
  cpc: number;
  roas: number;
}

// Notification sound - using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    // Play second beep
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1000;
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.3);
    }, 200);
  } catch (error) {
    console.error("Error playing notification sound:", error);
  }
};

export function useCampaignAlerts(userId: string | undefined) {
  const [alerts, setAlerts] = useState<CampaignAlert[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<Map<string, CampaignAlert>>(new Map());
  const [loading, setLoading] = useState(true);
  const processedAlerts = useRef<Set<string>>(new Set());

  // Load all alerts for user
  const loadAlerts = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from("campaign_alerts")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) throw error;
      setAlerts((data || []) as CampaignAlert[]);
    } catch (error) {
      console.error("Error loading campaign alerts:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Check if alert condition is met
  const checkAlertCondition = (
    alert: CampaignAlert,
    metrics: CampaignMetrics
  ): boolean => {
    const metricValue = metrics[alert.metric_type as keyof CampaignMetrics];
    if (metricValue === undefined) return false;

    switch (alert.operator) {
      case ">=":
        return metricValue >= alert.threshold_value;
      case "<=":
        return metricValue <= alert.threshold_value;
      case "=":
        return Math.abs(metricValue - alert.threshold_value) < 0.01;
      default:
        return false;
    }
  };

  // Check alerts for a specific campaign
  const checkCampaignAlerts = useCallback(async (
    campaignId: string,
    metrics: CampaignMetrics,
    userEmail?: string
  ) => {
    const campaignAlerts = alerts.filter(a => a.campaign_id === campaignId);
    
    for (const alert of campaignAlerts) {
      const isTriggered = checkAlertCondition(alert, metrics);
      const alertKey = `${alert.id}-${Date.now()}`;
      
      if (isTriggered && !processedAlerts.current.has(alert.id)) {
        processedAlerts.current.add(alert.id);
        
        // Update triggered_at in database
        await supabase
          .from("campaign_alerts")
          .update({ triggered_at: new Date().toISOString() })
          .eq("id", alert.id);

        // Add to triggered alerts map
        setTriggeredAlerts(prev => new Map(prev).set(campaignId, alert));

        // Handle notifications based on channels
        if (alert.notification_channels.includes("sound")) {
          playNotificationSound();
        }

        if (alert.notification_channels.includes("email") && userEmail) {
          // Send email notification via edge function
          try {
            await supabase.functions.invoke("send-campaign-alert-email", {
              body: {
                email: userEmail,
                campaignId,
                alertType: alert.metric_type,
                operator: alert.operator,
                thresholdValue: alert.threshold_value,
                currentValue: metrics[alert.metric_type as keyof CampaignMetrics],
              },
            });
          } catch (error) {
            console.error("Error sending alert email:", error);
          }
        }
      } else if (!isTriggered && alert.triggered_at) {
        // Reset alert if condition is no longer met
        processedAlerts.current.delete(alert.id);
        
        await supabase
          .from("campaign_alerts")
          .update({ triggered_at: null })
          .eq("id", alert.id);

        setTriggeredAlerts(prev => {
          const newMap = new Map(prev);
          newMap.delete(campaignId);
          return newMap;
        });
      }
    }
  }, [alerts]);

  // Check if a specific campaign has triggered alerts
  const hasTriggeredAlert = useCallback((campaignId: string): boolean => {
    return triggeredAlerts.has(campaignId);
  }, [triggeredAlerts]);

  // Get alert for a campaign
  const getTriggeredAlert = useCallback((campaignId: string): CampaignAlert | undefined => {
    return triggeredAlerts.get(campaignId);
  }, [triggeredAlerts]);

  // Refresh alerts
  const refreshAlerts = useCallback(() => {
    processedAlerts.current.clear();
    loadAlerts();
  }, [loadAlerts]);

  return {
    alerts,
    triggeredAlerts,
    loading,
    checkCampaignAlerts,
    hasTriggeredAlert,
    getTriggeredAlert,
    refreshAlerts,
  };
}
