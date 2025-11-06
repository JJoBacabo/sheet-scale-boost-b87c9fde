import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, ShoppingBag, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface SetupProgressProps {
  userId: string;
}

export const SetupProgress = ({ userId }: SetupProgressProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [hasFacebookAds, setHasFacebookAds] = useState(false);
  const [hasShopify, setHasShopify] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkIntegrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const checkIntegrations = async () => {
    try {
      const { data: integrations } = await supabase
        .from("integrations")
        .select("integration_type")
        .eq("user_id", userId);

      if (integrations) {
        setHasFacebookAds(integrations.some(i => i.integration_type === "facebook_ads"));
        setHasShopify(integrations.some(i => i.integration_type === "shopify"));
      }
    } catch (error) {
      console.error("Error checking integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      id: "facebook",
      label: t('onboarding.step1Title'),
      completed: hasFacebookAds,
      icon: Facebook,
      onClick: () => navigate("/settings?tab=integrations"),
    },
    {
      id: "shopify",
      label: t('onboarding.step2Title'),
      completed: hasShopify,
      icon: ShoppingBag,
      onClick: () => navigate("/settings?tab=integrations"),
    },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;
  const allCompleted = completedSteps === steps.length;

  if (loading) {
    return null;
  }

  // Don't show if everything is complete
  if (allCompleted) {
    return null;
  }

  return (
    <div className="relative" style={{ perspective: "1000px" }}>
      <div 
        className="relative glass-card rounded-3xl border-2 border-border/50 overflow-hidden"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateX(2deg)",
        }}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground">
                {t('onboarding.setupTitle')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {completedSteps} {t('dashboard.of')} {steps.length} {t('onboarding.stepsCompleted')}
              </p>
            </div>
            <div className="relative">
              <div className="text-4xl font-bold text-foreground">
                {Math.round(progress)}%
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <div className="relative h-3 bg-muted/30 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ 
                width: `${progress}%`,
                boxShadow: "0 0 20px hsl(var(--primary) / 0.5)"
              }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = step.completed;
            
            return (
              <div
                key={step.id}
                className="relative group"
                style={{
                  transformStyle: "preserve-3d",
                  animation: `fade-in 0.4s ease-out ${index * 0.15}s both`
                }}
              >
                <button
                  onClick={step.onClick}
                  className={cn(
                    "w-full flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 text-left relative",
                    "hover:-translate-y-1 hover:shadow-lg",
                    isCompleted
                      ? "bg-primary/10 border-2 border-primary/30"
                      : "bg-background/50 border-2 border-border/30 hover:border-primary/30"
                  )}
                  style={{
                    transform: "translateZ(0)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300",
                      isCompleted
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "bg-muted/50 text-muted-foreground group-hover:bg-muted"
                    )}
                    style={{
                      transform: isCompleted ? "translateZ(20px) scale(1.05)" : "translateZ(10px)",
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-7 h-7" />
                    ) : (
                      <Icon className="w-7 h-7 group-hover:text-primary transition-colors" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded",
                        isCompleted
                          ? "bg-primary/20 text-primary"
                          : "bg-muted/50 text-muted-foreground"
                      )}>
                        {t('onboarding.step')} {index + 1}
                      </span>
                    </div>
                    <h4 className="font-semibold text-base text-foreground">
                      {step.label}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {isCompleted ? t('onboarding.completed') : t('onboarding.clickToSetup')}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                    isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/30 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  )}>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        {completedSteps === 0 && (
          <div className="px-6 pb-6 pt-2">
            <Button
              onClick={() => navigate("/settings?tab=integrations")}
              className="w-full h-12 btn-gradient text-base font-semibold rounded-xl"
            >
              {t('onboarding.startButton')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
