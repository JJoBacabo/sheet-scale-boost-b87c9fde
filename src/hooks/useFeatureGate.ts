import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionState } from './useSubscriptionState';
import { SUBSCRIPTION_LIMITS } from '@/lib/constants';

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
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch both usage counters and profile/subscription
        const [usageResult, profileResult, subscriptionResult] = await Promise.all([
          supabase
            .from('usage_counters')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('subscription_plan, subscription_status, trial_ends_at')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('subscriptions')
            .select('store_limit, campaign_limit, status')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle()
        ]);

        const usage = usageResult.data;
        const profile = profileResult.data;
        const subscription = subscriptionResult.data;

        // Get limits from subscription first, then profile, then usage_counters
        let storesLimit = usage?.stores_limit || 0;
        let campaignsLimit = usage?.campaigns_limit || 0;

        // If subscription exists and is active, use its limits
        if (subscription && subscription.status === 'active') {
          storesLimit = subscription.store_limit ?? storesLimit;
          campaignsLimit = subscription.campaign_limit ?? campaignsLimit;
        } else if (profile) {
          // Check if trial is active
          const isTrialActive = 
            profile.subscription_plan === 'trial' &&
            profile.subscription_status === 'active' &&
            profile.trial_ends_at &&
            new Date(profile.trial_ends_at) > new Date();

          if (isTrialActive) {
            // Use trial limits (same as Standard)
            storesLimit = SUBSCRIPTION_LIMITS.TRIAL.stores;
            campaignsLimit = SUBSCRIPTION_LIMITS.TRIAL.campaigns;
          } else if (profile.subscription_plan) {
            // Use plan limits from profile if it's a paid plan
            const planCode = (profile.subscription_plan || 'free').toLowerCase();
            const isPaidPlan = ['expert', 'standard', 'basic', 'beginner'].includes(planCode);
            
            if (isPaidPlan && (profile.subscription_status === 'active' || !subscription)) {
              // If it's a paid plan and status is active OR no subscription record exists
              const planCodeUpper = planCode.toUpperCase();
              const planLimits = SUBSCRIPTION_LIMITS[planCodeUpper as keyof typeof SUBSCRIPTION_LIMITS] || SUBSCRIPTION_LIMITS.FREE;
              
              console.log('✅ useFeatureGate - Using limits from profile:', {
                planCode,
                subscriptionStatus: profile.subscription_status,
                planLimits
              });
              
              storesLimit = planLimits.stores;
              campaignsLimit = planLimits.campaigns;
            } else {
              // Free plan or inactive
              storesLimit = 0;
              campaignsLimit = 0;
            }
          } else {
            // Free plan
            storesLimit = 0;
            campaignsLimit = 0;
          }
        }

        setUsageData({
          storesUsed: usage?.stores_used || 0,
          campaignsUsed: usage?.campaigns_used || 0,
          storesLimit,
          campaignsLimit,
        });
      } catch (error) {
        console.error('Error fetching usage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [stateInfo.planCode]); // Re-fetch when plan changes

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

    // Expert plan: campaign_limit = 0 means unlimited
    if (usageData.campaignsLimit === 0 && stateInfo.planCode === 'expert') {
      return {
        canAccess: true,
        limit: -1, // -1 means unlimited
        current: usageData.campaignsUsed,
        upgradeRequired: false,
      };
    }

    // If limit is 0 and not Expert, no campaigns allowed
    if (usageData.campaignsLimit === 0) {
      return {
        canAccess: false,
        reason: 'Campanhas não disponíveis neste plano',
        limit: 0,
        current: usageData.campaignsUsed,
        upgradeRequired: true,
      };
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
      'trial': ['dashboard', 'campaign-control', 'profit-sheet', 'products', 'meta-dashboard', 'settings', 'integrations'], // Trial = Standard
      'free': ['dashboard', 'products', 'integrations', 'settings'],
    };
    
    const planCode = (stateInfo.planCode || 'free').toLowerCase();
    const allowedFeatures = featuresByPlan[planCode] || featuresByPlan['free'];
    
    const hasAccess = allowedFeatures.includes(feature);
    
    console.log('🔍 checkFeature:', {
      feature,
      planCode,
      allowedFeatures,
      hasAccess,
      stateInfo: {
        planCode: stateInfo.planCode,
        planName: stateInfo.planName,
        state: stateInfo.state,
        readonly: stateInfo.readonly
      }
    });
    
    return hasAccess;
  };

  return {
    checkStoreLimit,
    checkCampaignLimit,
    checkFeature,
    usageData,
    loading,
  };
};
