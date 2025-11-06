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
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LimitExceededModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: 'stores' | 'campaigns';
  currentCount: number;
  maxAllowed: number;
}

export const LimitExceededModal = ({
  open,
  onOpenChange,
  limitType,
  currentCount,
  maxAllowed,
}: LimitExceededModalProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/settings?tab=billing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-2xl">
            {t(`limits.exceeded.${limitType}.title`)}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {t(`limits.exceeded.${limitType}.description`, {
              current: currentCount,
              max: maxAllowed,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">{t('limits.exceeded.howToFix')}</p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• {t('limits.exceeded.option1')}</li>
            <li>• {t('limits.exceeded.option2')}</li>
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            {t('limits.exceeded.cancel')}
          </Button>
          <Button
            onClick={handleUpgrade}
            className="w-full sm:w-auto"
          >
            {t('limits.exceeded.upgradePlan')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
