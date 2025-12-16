import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, ShoppingBag, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

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
      label: t('onboarding.step1Title') || 'Conectar Meta Ads',
      completed: hasFacebookAds,
      icon: Facebook,
    },
    {
      id: "shopify",
      label: t('onboarding.step2Title') || 'Conectar Shopify',
      completed: hasShopify,
      icon: ShoppingBag,
    },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;
  const allCompleted = completedSteps === steps.length;

  if (loading || allCompleted) {
    return null;
  }

  const handleClick = () => {
    navigate("/settings?tab=integrations");
  };

  return (
    <button
      onClick={handleClick}
      className="w-full glass-card rounded-lg border border-border/50 p-3 hover:border-primary/30 transition-all duration-200 hover:shadow-md group cursor-pointer"
    >
      <div className="flex items-center gap-3">
        {/* Progress Icons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = step.completed;
            return (
              <div
                key={step.id}
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground group-hover:bg-muted"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="flex-1 relative h-2 bg-muted/30 rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${progress}%`,
            }}
          />
        </div>

        {/* Progress Text */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-medium text-muted-foreground">
            {completedSteps}/{steps.length}
          </span>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </button>
  );
};
