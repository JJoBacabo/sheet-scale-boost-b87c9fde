import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TrialStatus {
  isActive: boolean;
  daysRemaining: number;
  endsAt: Date | null;
  isExpired: boolean;
  showWarning: boolean;
}

export const useTrialStatus = () => {
  const [status, setStatus] = useState<TrialStatus>({
    isActive: false,
    daysRemaining: 0,
    endsAt: null,
    isExpired: false,
    showWarning: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrialStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user has active paid subscription FIRST
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        // If has active paid subscription, no trial
        if (subscription) {
          setStatus({
            isActive: false,
            daysRemaining: 0,
            endsAt: null,
            isExpired: false,
            showWarning: false,
          });
          setLoading(false);
          return;
        }

        // Only check trial if no paid subscription
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_plan, subscription_status, trial_ends_at')
          .eq('user_id', user.id)
          .single();

        if (!profile) return;

        const now = new Date();
        const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
        
        const isTrialActive = 
          profile.subscription_plan === 'trial' &&
          profile.subscription_status === 'active' &&
          trialEndsAt &&
          trialEndsAt > now;

        const daysRemaining = trialEndsAt 
          ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        const isExpired = 
          profile.subscription_plan === 'trial' &&
          trialEndsAt &&
          trialEndsAt <= now;

        const showWarning = isTrialActive && daysRemaining <= 3;

        setStatus({
          isActive: isTrialActive,
          daysRemaining: Math.max(0, daysRemaining),
          endsAt: trialEndsAt,
          isExpired,
          showWarning,
        });
      } catch (error) {
        console.error('Error fetching trial status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrialStatus();

    // Refresh every hour
    const interval = setInterval(fetchTrialStatus, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { status, loading };
};
