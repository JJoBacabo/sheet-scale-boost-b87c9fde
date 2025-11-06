import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Store, TrendingUp, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface UpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'store' | 'campaign';
  current?: number;
  limit?: number;
}

export const UpsellModal = ({ open, onOpenChange, type, current, limit }: UpsellModalProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const content = {
    store: {
      icon: <Store className="w-12 h-12 text-primary" />,
      title: t('subscription.upsellStoreTitle'),
      description: t('subscription.upsellStoreDesc').replace('{{current}}', String(current)).replace('{{limit}}', String(limit)),
      benefits: [
        t('subscription.unlimitedStores'),
        t('subscription.automaticSync'),
        t('subscription.multiStoreManagement'),
        t('subscription.prioritySupport'),
      ],
    },
    campaign: {
      icon: <TrendingUp className="w-12 h-12 text-primary" />,
      title: t('subscription.upsellCampaignTitle'),
      description: t('subscription.upsellCampaignDesc').replace('{{current}}', String(current)).replace('{{limit}}', String(limit)),
      benefits: [
        t('subscription.unlimitedCampaigns'),
        t('subscription.advancedAutomation'),
        t('subscription.performanceAnalysis'),
        t('subscription.detailedROI'),
      ],
    },
  };

  const selected = content[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-2 border-primary/20">
        <DialogHeader>
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
            {selected.icon}
          </div>
          <DialogTitle className="text-2xl text-center">{selected.title}</DialogTitle>
          <DialogDescription className="text-center text-base">
            {selected.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="glass-card p-4 border-2 border-primary/30 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-primary" />
              <p className="font-semibold">{t('subscription.unlockWithUpgrade')}</p>
            </div>
            <ul className="space-y-2">
              {selected.benefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span className="text-sm">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card p-3 rounded-xl border border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              💡 {t('subscription.upgradeTip')}
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            {t('subscription.maybeLater')}
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate('/settings?tab=billing');
            }}
            className="btn-gradient w-full sm:w-auto"
          >
            <Zap className="w-4 h-4 mr-2" />
            {t('subscription.viewPlans')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
