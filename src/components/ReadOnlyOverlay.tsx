import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReadOnlyOverlayProps {
  planName: string;
  daysUntilSuspension: number | null;
}

export const ReadOnlyOverlay = ({ planName, daysUntilSuspension }: ReadOnlyOverlayProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
      <div className="glass-card p-8 max-w-md text-center pointer-events-auto">
        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-destructive" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">{t('subscription.readOnlyTitle')}</h2>
        <p className="text-muted-foreground mb-4">
          {t('subscription.subscriptionExpired').replace('{{planName}}', planName)}
          {daysUntilSuspension && (
            <> {t('subscription.daysUntilSuspension').replace('{{days}}', String(daysUntilSuspension))}</>
          )}
        </p>
        
        <div className="bg-muted p-4 rounded-lg mb-6">
          <p className="text-sm">
            {t('subscription.readOnlyCapabilities')}
          </p>
          <ul className="text-sm text-left mt-2 space-y-1">
            <li>✓ {t('subscription.viewData')}</li>
            <li>✓ {t('subscription.exportReports')}</li>
            <li>✗ {t('subscription.cannotCreateCampaigns')}</li>
            <li>✗ {t('subscription.cannotSyncData')}</li>
          </ul>
        </div>

        <Button 
          onClick={() => navigate('/settings?tab=billing')}
          size="lg"
          className="w-full"
        >
          {t('subscription.reactivateSubscription')}
        </Button>
      </div>
    </div>
  );
};
