import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SUBSCRIPTION_LIMITS } from '@/lib/constants';

interface SubscriptionLimits {
  storeLimit: number;
  campaignLimit: number;
  features: string[];
  isTrialActive: boolean;
  trialEndsAt: Date | null;
}

// Helper function to get limits based on plan code
const getLimitsForPlan = (planCode: string): { stores: number; campaigns: number; features: string[] } => {
  const planUpper = planCode.toUpperCase();
  
  switch (planUpper) {
    case 'FREE':
      return SUBSCRIPTION_LIMITS.FREE;
    case 'TRIAL':
      return SUBSCRIPTION_LIMITS.TRIAL;
    case 'BEGINNER':
      return SUBSCRIPTION_LIMITS.BEGINNER;
    case 'BASIC':
      return SUBSCRIPTION_LIMITS.BASIC;
    case 'STANDARD':
      return SUBSCRIPTION_LIMITS.STANDARD;
    case 'EXPERT':
      return SUBSCRIPTION_LIMITS.EXPERT;
    default:
      return SUBSCRIPTION_LIMITS.FREE;
  }
};

export const useSubscriptionLimits = () => {
  const [limits, setLimits] = useState<SubscriptionLimits>({
    storeLimit: 0,
    campaignLimit: 0,
    features: [],
    isTrialActive: false,
    trialEndsAt: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Get profile to check plan and trial status
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_plan, subscription_status, trial_ends_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profile) {
          // No profile = FREE plan
          setLimits({
            storeLimit: 0,
            campaignLimit: 0,
            features: [],
            isTrialActive: false,
            trialEndsAt: null,
          });
          setLoading(false);
          return;
        }

        const planCode = (profile.subscription_plan || 'free').toLowerCase();
        const subscriptionStatus = (profile.subscription_status || 'inactive').toLowerCase();

        console.log('🔍 Subscription Limits Debug:', {
          planCode,
          subscriptionStatus,
          trialEndsAt: profile.trial_ends_at,
          profileData: profile
        });

        // Check if trial is active (not expired)
        const isTrialActive = 
          planCode === 'trial' &&
          subscriptionStatus === 'active' &&
          profile.trial_ends_at &&
          new Date(profile.trial_ends_at) > new Date();

        // If trial is active, use Standard plan limits
        if (isTrialActive) {
          const trialLimits = SUBSCRIPTION_LIMITS.TRIAL;
          setLimits({
            storeLimit: trialLimits.stores,
            campaignLimit: trialLimits.campaigns,
            features: trialLimits.features,
            isTrialActive: true,
            trialEndsAt: new Date(profile.trial_ends_at),
          });
          setLoading(false);
          return;
        }

        // Check paid subscription first (subscriptions table takes precedence)
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('store_limit, campaign_limit, features_enabled, plan_code, status')
          .eq('user_id', user.id)
          .maybeSingle(); // Removed .eq('status', 'active') to see all subscriptions

        console.log('🔍 Subscription table check:', {
          subscription,
          subError,
          hasSubscription: !!subscription
        });

        if (subscription && subscription.status === 'active') {
          // Use limits from subscriptions table if available
          const features = Array.isArray(subscription.features_enabled) 
            ? subscription.features_enabled.map(f => String(f))
            : [];
          
          console.log('✅ Using limits from subscription table:', {
            storeLimit: subscription.store_limit,
            campaignLimit: subscription.campaign_limit,
            features
          });

          setLimits({
            storeLimit: subscription.store_limit ?? 0,
            campaignLimit: subscription.campaign_limit ?? 0, // 0 = unlimited for Expert
            features,
            isTrialActive: false,
            trialEndsAt: null,
          });
          setLoading(false);
          return;
        }

        // If no active subscription, check profile subscription_plan
        // This handles cases where subscription hasn't synced yet but profile has plan
        // IMPORTANT: If it's a paid plan, always apply limits regardless of subscription_status
        if (planCode && planCode !== 'free' && planCode !== 'trial') {
          const isPaidPlan = ['expert', 'standard', 'basic', 'beginner'].includes(planCode);
          
          // If it's a paid plan, always use its limits (don't check subscription_status)
          if (isPaidPlan) {
            const planLimits = getLimitsForPlan(planCode);
            
            console.log('✅ Using limits from profile plan (paid plan detected):', {
              planCode,
              subscriptionStatus,
              hasSubscription: !!subscription,
              planLimits
            });

            setLimits({
              storeLimit: planLimits.stores,
              campaignLimit: planLimits.campaigns,
              features: planLimits.features,
              isTrialActive: false,
              trialEndsAt: null,
            });
            setLoading(false);
            return;
          }
        }

        // FREE plan (expired trial, inactive subscription, or no plan)
        console.log('⚠️ Falling back to FREE plan limits');
        setLimits({
          storeLimit: 0,
          campaignLimit: 0,
          features: [],
          isTrialActive: false,
          trialEndsAt: null,
        });
      } catch (error) {
        console.error('Error fetching subscription limits:', error);
        // On error, default to FREE plan
        setLimits({
          storeLimit: 0,
          campaignLimit: 0,
          features: [],
          isTrialActive: false,
          trialEndsAt: null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLimits();
  }, []);

  return { limits, loading };
};
