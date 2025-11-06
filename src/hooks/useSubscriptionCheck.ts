import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { subscriptionService } from '@/services/subscriptionService';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

export const useSubscriptionCheck = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { needsUpdate } = await subscriptionService.checkExpiredSubscriptions();

        // If anything expired, call the edge function
        if (needsUpdate) {
          const { success, error } = await subscriptionService.triggerExpiredSubscriptionCheck();
          
          if (!success) {
            logger.error('Error checking expired subscriptions:', error);
          } else {
            // Invalidate relevant queries to update UI
            await queryClient.invalidateQueries({ queryKey: ['subscription'] });
            await queryClient.invalidateQueries({ queryKey: ['profile'] });
            await queryClient.invalidateQueries({ queryKey: ['usage'] });
            
            toast({
              title: "Plano Expirado",
              description: "Seu plano expirou e foi revertido para o plano FREE. Renove sua assinatura para continuar.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        logger.error('Error in subscription check:', error);
      }
    };

    // Check on mount
    checkSubscription();

    // Check every 5 minutes
    const interval = setInterval(checkSubscription, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [toast, queryClient]);
};
