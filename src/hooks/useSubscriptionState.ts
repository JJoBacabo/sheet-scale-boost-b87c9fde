import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type SubscriptionState = 'active' | 'expired' | 'suspended' | 'archived';

interface SubscriptionStateInfo {
  state: SubscriptionState;
  readonly: boolean;
  daysUntilSuspension: number | null;
  daysUntilArchive: number | null;
  planName: string;
  planCode: string;
  showBanner: boolean;
  allowedPages: string[];
}

export const useSubscriptionState = () => {
  const [stateInfo, setStateInfo] = useState<SubscriptionStateInfo>({
    state: 'active',
    readonly: false,
    daysUntilSuspension: null,
    daysUntilArchive: null,
    planName: 'FREE',
    planCode: 'free',
    showBanner: false,
    allowedPages: ['settings', 'products'],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check both subscription and profile
        const [subscriptionResult, profileResult] = await Promise.all([
          supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('subscription_plan, subscription_status, trial_ends_at')
            .eq('user_id', user.id)
            .maybeSingle()
        ]);

        const subscription = subscriptionResult.data;
        const profile = profileResult.data;

        // Check if trial is active
        const isTrialActive = 
          profile?.subscription_plan === 'trial' &&
          profile?.subscription_status === 'active' &&
          profile?.trial_ends_at &&
          new Date(profile.trial_ends_at) > new Date();

        if (!subscription && !isTrialActive) {
          // Check if profile has a paid plan even without subscription
          const planCode = (profile?.subscription_plan || 'free').toLowerCase();
          const isPaidPlan = ['expert', 'standard', 'basic', 'beginner'].includes(planCode);
          
          if (isPaidPlan) {
            // Has paid plan in profile, treat as active
            const planName = planCode.toUpperCase();
            
            // Determine allowed pages based on plan
            let allowedPages: string[] = [];
            switch (planCode) {
              case 'expert':
                allowedPages = ['dashboard', 'campaign-control', 'profit-sheet', 'products', 'meta-dashboard', 'product-research', 'settings', 'integrations'];
                break;
              case 'standard':
                allowedPages = ['dashboard', 'campaign-control', 'profit-sheet', 'products', 'meta-dashboard', 'settings', 'integrations'];
                break;
              case 'basic':
                allowedPages = ['dashboard', 'campaign-control', 'profit-sheet', 'products', 'meta-dashboard', 'settings', 'integrations'];
                break;
              case 'beginner':
                allowedPages = ['dashboard', 'products', 'settings', 'integrations', 'campaign-control'];
                break;
              default:
                allowedPages = ['settings', 'products', 'integrations'];
            }
            
            console.log('✅ useSubscriptionState - Paid plan in profile (no subscription):', {
              planCode,
              planName,
              allowedPages
            });
            
            setStateInfo({
              state: 'active',
              readonly: false,
              daysUntilSuspension: null,
              daysUntilArchive: null,
              planName,
              planCode,
              showBanner: false,
              allowedPages,
            });
            return;
          }
          
          // Free plan (no subscription, no trial, no paid plan in profile)
          setStateInfo({
            state: 'active',
            readonly: false,
            daysUntilSuspension: null,
            daysUntilArchive: null,
            planName: 'FREE',
            planCode: 'free',
            showBanner: false,
            allowedPages: ['settings', 'products', 'integrations'],
          });
          return;
        }

        // If trial is active but no subscription, use trial plan info
        if (isTrialActive && !subscription) {
          setStateInfo({
            state: 'active',
            readonly: false,
            daysUntilSuspension: null,
            daysUntilArchive: null,
            planName: 'TRIAL',
            planCode: 'trial',
            showBanner: false,
            allowedPages: ['dashboard', 'campaign-control', 'meta-dashboard', 'products', 'settings', 'integrations', 'profit-sheet'],
          });
          return;
        }

        const now = new Date();
        const state = subscription.state as SubscriptionState;
        let daysUntilSuspension = null;
        let daysUntilArchive = null;
        let allowedPages: string[] = [];

        if (subscription.grace_period_ends_at) {
          const graceEnd = new Date(subscription.grace_period_ends_at);
          daysUntilSuspension = Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        if (subscription.archive_scheduled_at) {
          const archiveDate = new Date(subscription.archive_scheduled_at);
          daysUntilArchive = Math.ceil((archiveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Determine allowed pages based on state
        switch (state) {
          case 'active':
            // Full access based on plan
            allowedPages = ['dashboard', 'campaign-control', 'meta-dashboard', 'product-research', 'products', 'settings', 'integrations', 'profit-sheet'];
            break;
          case 'expired':
            // Read-only access
            allowedPages = ['dashboard', 'campaign-control', 'products', 'settings', 'integrations'];
            break;
          case 'suspended':
            // Only billing/settings
            allowedPages = ['settings'];
            break;
          case 'archived':
            // Minimal access
            allowedPages = ['settings'];
            break;
        }

        setStateInfo({
          state,
          readonly: subscription.readonly_mode || false,
          daysUntilSuspension,
          daysUntilArchive,
          planName: subscription.plan_name || 'FREE',
          planCode: subscription.plan_code || 'free',
          showBanner: state !== 'active',
          allowedPages,
        });
      } catch (error) {
        console.error('Error fetching subscription state:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchState();
  }, []);

  return { stateInfo, loading };
};
