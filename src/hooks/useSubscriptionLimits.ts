import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionLimits {
  storeLimit: number;
  campaignLimit: number;
  features: string[];
  isTrialActive: boolean;
  trialEndsAt: Date | null;
}

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
        if (!user) return;

        // Get profile to check trial status
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_plan, subscription_status, trial_ends_at')
          .eq('user_id', user.id)
          .single();

        if (!profile) return;

        // Check if trial is active (not expired)
        const isTrialActive = 
          profile.subscription_plan === 'trial' &&
          profile.subscription_status === 'active' &&
          profile.trial_ends_at &&
          new Date(profile.trial_ends_at) > new Date();

        // If trial is active, use Standard plan limits
        if (isTrialActive) {
          setLimits({
            storeLimit: 2, // Standard plan limit
            campaignLimit: 40, // Standard plan limit
            features: ['basic_analytics', 'product_sync', 'campaign_management', 'ai_cotacao'],
            isTrialActive: true,
            trialEndsAt: new Date(profile.trial_ends_at),
          });
        } else {
          // Check paid subscription
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

          if (subscription) {
            const features = Array.isArray(subscription.features_enabled) 
              ? subscription.features_enabled.map(f => String(f))
              : [];
              
            setLimits({
              storeLimit: subscription.store_limit || 0,
              campaignLimit: subscription.campaign_limit || 0,
              features,
              isTrialActive: false,
              trialEndsAt: null,
            });
          } else {
            // FREE plan (expired trial or no subscription)
            setLimits({
              storeLimit: 0,
              campaignLimit: 0,
              features: [],
              isTrialActive: false,
              trialEndsAt: null,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching subscription limits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLimits();
  }, []);

  return { limits, loading };
};
