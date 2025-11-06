import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useLanguage } from '@/contexts/LanguageContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TrialBanner = () => {
  const { status, loading } = useTrialStatus();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (loading || !status.isActive) return null;

  const isWarning = status.showWarning;

  return (
    <Alert 
      className={`mb-4 border-2 ${
        isWarning 
          ? 'bg-destructive/10 border-destructive/50' 
          : 'bg-primary/10 border-primary/50'
      }`}
    >
      <div className="flex items-center gap-3">
        {isWarning ? (
          <Clock className="h-5 w-5 text-destructive" />
        ) : (
          <Sparkles className="h-5 w-5 text-primary" />
        )}
        <div className="flex-1">
          <AlertDescription className="text-sm font-medium">
            {isWarning ? (
              <>
                {t('trial.expiringWarning', { days: status.daysRemaining })}
              </>
            ) : (
              <>
                {t('trial.activeMessage', { days: status.daysRemaining })}
              </>
            )}
          </AlertDescription>
        </div>
        <Button
          variant={isWarning ? 'destructive' : 'default'}
          size="sm"
          onClick={() => navigate('/settings?tab=billing')}
        >
          {t('trial.upgradeNow')}
        </Button>
      </div>
    </Alert>
  );
};
