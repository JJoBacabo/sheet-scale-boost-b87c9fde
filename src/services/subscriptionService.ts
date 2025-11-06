import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export const subscriptionService = {
  async checkExpiredSubscriptions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { needsUpdate: false };

      let needsUpdate = false;

      // Check trial expiration
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_status, trial_ends_at')
        .eq('user_id', user.id)
        .single();

      if (profile && 
          profile.subscription_plan === 'trial' && 
          profile.subscription_status === 'active' &&
          profile.trial_ends_at) {
        const trialEnd = new Date(profile.trial_ends_at);
        const now = new Date();

        if (trialEnd < now) {
          logger.info('⏰ Trial expired, triggering check function...');
          needsUpdate = true;
        }
      }

      // Check paid subscription expiration
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subscription) {
        const periodEnd = new Date(subscription.current_period_end);
        const now = new Date();

        if (periodEnd < now) {
          logger.info('⏰ Subscription expired, triggering check function...');
          needsUpdate = true;
        }
      }

      return { needsUpdate };
    } catch (error) {
      logger.error('Error checking subscription:', error);
      return { needsUpdate: false, error };
    }
  },

  async triggerExpiredSubscriptionCheck() {
    try {
      const { error } = await supabase.functions.invoke('check-expired-subscriptions');
      
      if (error) {
        logger.error('Error checking expired subscriptions:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error in subscription check:', error);
      return { success: false, error };
    }
  },
};
