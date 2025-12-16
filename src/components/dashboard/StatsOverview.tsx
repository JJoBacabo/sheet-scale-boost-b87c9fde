import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target, ShoppingCart, Activity, AlertTriangle } from "lucide-react";
import { Card3D } from "@/components/ui/Card3D";
import { memo, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StatsOverviewProps {
  stats: {
    totalCampaigns: number;
    totalProducts: number;
    totalSpent: number;
    totalRevenue: number;
    averageRoas: number;
    activeCampaigns: number;
    totalConversions: number;
    averageCpc: number;
    totalSupplierCost: number;
    hasProductsWithoutCost?: boolean;
  };
  storeCurrency?: string;
}

export const StatsOverview = memo(({ stats, storeCurrency = 'EUR' }: StatsOverviewProps) => {
  const { t } = useLanguage();
  const { formatAmount } = useCurrency();
  const profit = stats.totalRevenue - stats.totalSpent - stats.totalSupplierCost;
  const profitMargin = stats.totalRevenue > 0 ? (profit / stats.totalRevenue) * 100 : 0;
  const hasProductsWithoutCost = stats.hasProductsWithoutCost || false;

  const statCards = useMemo(() => [
    {
      title: t("dashboard.totalRevenue"),
      value: formatAmount(stats.totalRevenue, storeCurrency),
      icon: DollarSign,
      trend: stats.totalRevenue > 0 ? "up" : "neutral",
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      border: "border-primary/20",
      warning: false
    },
    {
      title: t("dashboard.totalAdSpend"),
      value: formatAmount(stats.totalSpent, storeCurrency),
      icon: TrendingDown,
      trend: "neutral",
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      border: "border-blue-500/20",
      warning: false
    },
    {
      title: t("dashboard.profit"),
      value: hasProductsWithoutCost ? '0.00' : formatAmount(profit, storeCurrency),
      icon: hasProductsWithoutCost ? AlertTriangle : (profit >= 0 ? TrendingUp : TrendingDown),
      trend: hasProductsWithoutCost ? "neutral" : (profit >= 0 ? "up" : "down"),
      gradient: profit >= 0 ? "from-primary/20 to-primary-glow/20" : "from-destructive/20 to-red-500/20",
      iconBg: hasProductsWithoutCost ? "bg-warning/10" : (profit >= 0 ? "bg-primary/10" : "bg-destructive/10"),
      iconColor: hasProductsWithoutCost ? "text-warning" : (profit >= 0 ? "text-primary" : "text-destructive"),
      border: hasProductsWithoutCost ? "border-warning/40" : (profit >= 0 ? "border-primary/20" : "border-destructive/20"),
      warning: hasProductsWithoutCost,
      warningMessage: t('products.incompleteCosts')
    },
    {
      title: t("dashboard.averageRoas"),
      value: stats.averageRoas.toFixed(2),
      icon: Target,
      trend: stats.averageRoas >= 2 ? "up" : stats.averageRoas >= 1 ? "neutral" : "down",
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      border: "border-emerald-500/20",
      warning: false
    },
    {
      title: t("dashboard.totalSupplierCost"),
      value: formatAmount(stats.totalSupplierCost, storeCurrency),
      icon: ShoppingCart,
      trend: "neutral",
      gradient: "from-purple-500/20 to-pink-500/20",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
      border: "border-purple-500/20",
      warning: false
    },
    {
      title: t("dashboard.conversions"),
      value: stats.totalConversions.toString(),
      icon: ShoppingCart,
      trend: stats.totalConversions > 0 ? "up" : "neutral",
      gradient: "from-indigo-500/20 to-purple-500/20",
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-500",
      border: "border-indigo-500/20",
      warning: false
    },
    {
      title: t("dashboard.averageCpc"),
      value: formatAmount(stats.averageCpc, storeCurrency),
      icon: DollarSign,
      trend: "neutral",
      gradient: "from-cyan-500/20 to-blue-500/20",
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-500",
      border: "border-cyan-500/20",
      warning: false
    },
    {
      title: t("dashboard.profitMargin"),
      value: hasProductsWithoutCost ? '0.0%' : `${profitMargin.toFixed(1)}%`,
      icon: hasProductsWithoutCost ? AlertTriangle : (profitMargin >= 0 ? TrendingUp : TrendingDown),
      trend: hasProductsWithoutCost ? "neutral" : (profitMargin >= 20 ? "up" : "neutral"),
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconBg: hasProductsWithoutCost ? "bg-warning/10" : "bg-emerald-500/10",
      iconColor: hasProductsWithoutCost ? "text-warning" : "text-emerald-500",
      border: hasProductsWithoutCost ? "border-warning/40" : "border-emerald-500/20",
      warning: hasProductsWithoutCost,
      warningMessage: t('products.incompleteCosts')
    }
  ], [stats, storeCurrency, hasProductsWithoutCost, profit, profitMargin, t, formatAmount]);

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const cardContent = (
            <Card3D 
              intensity="medium" 
              glow={stat.trend === "up"}
              className={stat.warning ? "h-full cursor-pointer hover:border-warning/60 transition-colors" : "h-full"}
            >
              <div className="relative p-1.5 sm:p-2 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between mb-1">
                  {stat.warning ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`p-1 rounded-md ${stat.iconBg}`}>
                          <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.iconColor}`} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{stat.warningMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className={`p-1 rounded-md ${stat.iconBg}`}>
                      <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.iconColor}`} />
                    </div>
                  )}
                {stat.trend !== "neutral" && !stat.warning && (
                  <div
                    className={`px-1 py-0.5 rounded-md text-[10px] sm:text-xs font-medium ${
                      stat.trend === "up" 
                        ? "bg-primary/10 text-primary" 
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {stat.trend === "up" ? "↑" : "↓"}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{stat.title}</p>
                <p className={`text-sm sm:text-base md:text-lg font-bold ${stat.iconColor}`}>
                  {stat.value}
                </p>
                {stat.warning && (
                  <p className="text-[9px] sm:text-[10px] text-warning mt-0.5">{t("dashboard.clickToAddQuotes")}</p>
                )}
              </div>
            </div>
          </Card3D>
        );

        return (
          <div key={index}>
            {stat.warning ? (
              <Link to="/products">{cardContent}</Link>
            ) : (
              cardContent
            )}
          </div>
        );
        })}
      </div>
    </TooltipProvider>
  );
});

StatsOverview.displayName = 'StatsOverview';
