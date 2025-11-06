import { AlertCircle, Lock, Archive } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface SubscriptionStateBannerProps {
  state: 'expired' | 'suspended' | 'archived';
  daysUntilSuspension: number | null;
  daysUntilArchive: number | null;
  planName: string;
}

export const SubscriptionStateBanner = ({
  state,
  daysUntilSuspension,
  daysUntilArchive,
  planName,
}: SubscriptionStateBannerProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const getBannerContent = () => {
    switch (state) {
      case 'expired':
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          variant: 'destructive' as const,
          title: t('subscription.bannerExpiredTitle').replace('{{planName}}', planName),
          description: daysUntilSuspension
            ? t('subscription.bannerExpiredDesc').replace('{{days}}', String(daysUntilSuspension))
            : t('subscription.bannerExpiredDescNoDate'),
          cta: t('subscription.reactivateNow'),
        };
      
      case 'suspended':
        return {
          icon: <Lock className="h-5 w-5" />,
          variant: 'destructive' as const,
          title: t('subscription.bannerSuspendedTitle'),
          description: daysUntilArchive
            ? t('subscription.bannerSuspendedDesc').replace('{{days}}', String(daysUntilArchive))
            : t('subscription.bannerSuspendedDescNoDate'),
          cta: t('subscription.recoverAccount'),
        };
      
      case 'archived':
        return {
          icon: <Archive className="h-5 w-5" />,
          variant: 'destructive' as const,
          title: t('subscription.bannerArchivedTitle'),
          description: t('subscription.bannerArchivedDesc'),
          cta: t('subscription.newPlan'),
        };
    }
  };

  const content = getBannerContent();

  return (
    <Alert variant={content.variant} className="mb-6">
      <div className="flex items-center gap-3">
        {content.icon}
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{content.title}</h3>
          <AlertDescription className="text-sm">
            {content.description}
          </AlertDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/settings?tab=billing')}
          className="shrink-0"
        >
          {content.cta}
        </Button>
      </div>
    </Alert>
  );
};
