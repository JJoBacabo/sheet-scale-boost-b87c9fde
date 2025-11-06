import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

export const TrialBadge = () => {
  const { status, loading } = useTrialStatus();
  const { t } = useLanguage();

  if (loading || !status.isActive) return null;

  return (
    <Badge 
      variant={status.showWarning ? 'destructive' : 'default'}
      className="flex items-center gap-1"
    >
      <Sparkles className="h-3 w-3" />
      <span className="text-xs font-medium">
        {t('trial.activeMessage', { days: status.daysRemaining })}
      </span>
    </Badge>
  );
};
