import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionState } from './useSubscriptionState';

interface FeatureGateResult {
  canAccess: boolean;
  reason?: string;
  limit?: number;
  current?: number;
  upgradeRequired: boolean;
}

export const useFeatureGate = () => {
  const { stateInfo } = useSubscriptionState();
  const [usageData, setUsageData] = useState<{
    storesUsed: number;
    campaignsUsed: number;
    storesLimit: number;
    campaignsLimit: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: usage } = await supabase
          .from('usage_counters')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (usage) {
          setUsageData({
            storesUsed: usage.stores_used,
            campaignsUsed: usage.campaigns_used,
            storesLimit: usage.stores_limit,
            campaignsLimit: usage.campaigns_limit,
          });
        }
      } catch (error) {
        console.error('Error fetching usage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, []);

  const checkStoreLimit = (): FeatureGateResult => {
    if (stateInfo.readonly) {
      return {
        canAccess: false,
        reason: 'Conta em modo leitura',
        upgradeRequired: true,
      };
    }

    if (!usageData) {
      return { canAccess: true, upgradeRequired: false };
    }

    if (usageData.storesUsed >= usageData.storesLimit) {
      return {
        canAccess: false,
        reason: 'Limite de lojas atingido',
        limit: usageData.storesLimit,
        current: usageData.storesUsed,
        upgradeRequired: true,
      };
    }

    return {
      canAccess: true,
      limit: usageData.storesLimit,
      current: usageData.storesUsed,
      upgradeRequired: false,
    };
  };

  const checkCampaignLimit = (): FeatureGateResult => {
    if (stateInfo.readonly) {
      return {
        canAccess: false,
        reason: 'Conta em modo leitura',
        upgradeRequired: true,
      };
    }

    if (!usageData) {
      return { canAccess: true, upgradeRequired: false };
    }

    if (usageData.campaignsUsed >= usageData.campaignsLimit) {
      return {
        canAccess: false,
        reason: 'Limite de campanhas atingido',
        limit: usageData.campaignsLimit,
        current: usageData.campaignsUsed,
        upgradeRequired: true,
      };
    }

    return {
      canAccess: true,
      limit: usageData.campaignsLimit,
      current: usageData.campaignsUsed,
      upgradeRequired: false,
    };
  };

  const checkFeature = (feature: string): boolean => {
    if (stateInfo.state === 'archived') return false;
    if (stateInfo.readonly) return false;
    
    // Feature mapping by plan
    const featuresByPlan: Record<string, string[]> = {
      'beginner': ['dashboard', 'products', 'settings', 'integrations', 'campaign-control'],
      'basic': ['dashboard', 'campaign-control', 'profit-sheet', 'products', 'meta-dashboard', 'settings', 'integrations'],
      'standard': ['dashboard', 'campaign-control', 'profit-sheet', 'products', 'meta-dashboard', 'settings', 'integrations'],
      'expert': ['dashboard', 'campaign-control', 'profit-sheet', 'products', 'meta-dashboard', 'product-research', 'settings', 'integrations'],
      'free': ['dashboard', 'products', 'integrations', 'settings'],
    };
    
    const planCode = stateInfo.planCode || 'free';
    const allowedFeatures = featuresByPlan[planCode] || featuresByPlan['free'];
    
    return allowedFeatures.includes(feature);
  };

  return {
    checkStoreLimit,
    checkCampaignLimit,
    checkFeature,
    usageData,
    loading,
  };
};
