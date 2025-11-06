import { useEffect, useState } from 'react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TrialExpiredModal = () => {
  const { status, loading } = useTrialStatus();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (!loading && status.isExpired && !hasShown) {
      setOpen(true);
      setHasShown(true);
    }
  }, [loading, status.isExpired, hasShown]);

  const handleUpgrade = () => {
    setOpen(false);
    navigate('/settings?tab=billing');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
            <Clock className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-2xl">
            {t('trial.expired.title')}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {t('trial.expired.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">{t('trial.expired.whatHappensNext')}</p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• {t('trial.expired.noAccess')}</li>
            <li>• {t('trial.expired.dataPreserved')}</li>
            <li>• {t('trial.expired.chooseAPlan')}</li>
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="w-full sm:w-auto"
          >
            {t('trial.expired.maybeLater')}
          </Button>
          <Button
            onClick={handleUpgrade}
            className="w-full sm:w-auto"
          >
            {t('trial.expired.viewPlans')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
