import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useActivityTracker = () => {
  const trackActivity = async (activityType: string, activityData?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_activity').insert({
        user_id: user.id,
        activity_type: activityType,
        activity_data: activityData || {},
      });
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  return { trackActivity };
};
