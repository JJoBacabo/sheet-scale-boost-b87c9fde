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

        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!subscription) {
          // Free plan
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
