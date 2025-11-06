import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Facebook, ShoppingBag, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

export const OnboardingModal = ({ open, onClose }: OnboardingModalProps) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const { t } = useLanguage();

  const steps = [
    {
      icon: Facebook,
      titleKey: 'onboarding.step1Title',
      descKey: 'onboarding.step1Desc',
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: ShoppingBag,
      titleKey: 'onboarding.step2Title',
      descKey: 'onboarding.step2Desc',
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Package,
      titleKey: 'onboarding.step3Title',
      descKey: 'onboarding.step3Desc',
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  const handleStart = () => {
    localStorage.setItem("onboarding_completed", "true");
    navigate("/settings");
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem("onboarding_skipped", "true");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] glass-card border-2 border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center mb-2">
            {t('onboarding.title')} 🎉
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-center text-base">
            {t('onboarding.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStep;
            
            return (
              <div
                key={index}
                className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${
                  index === currentStep
                    ? "glass-card border-2 border-primary/30 scale-[1.02]"
                    : "glass-card border border-border/50"
                }`}
              >
                <div className={`w-14 h-14 rounded-xl ${step.bgColor} flex items-center justify-center flex-shrink-0 relative`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-7 h-7 text-success" />
                  ) : (
                    <Icon className={`w-7 h-7 ${step.color}`} />
                  )}
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{t(step.titleKey)}</h3>
                  <p className="text-muted-foreground text-sm">{t(step.descKey)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={handleStart}
            className="btn-gradient w-full text-lg py-6 shadow-glow"
            size="lg"
          >
            {t('onboarding.startButton')}
          </Button>
          <Button
            onClick={handleSkip}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
          >
            {t('onboarding.skipButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
