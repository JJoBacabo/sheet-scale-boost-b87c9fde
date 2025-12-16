import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target, ShoppingCart, Activity, AlertTriangle } from "lucide-react";
import { Card3D } from "@/components/ui/Card3D";
import { motion } from "framer-motion";
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

export const StatsOverview = ({ stats, storeCurrency = 'EUR' }: StatsOverviewProps) => {
  const { t } = useLanguage();
  const { formatAmount } = useCurrency();
  const profit = stats.totalRevenue - stats.totalSpent - stats.totalSupplierCost;
  const profitMargin = stats.totalRevenue > 0 ? (profit / stats.totalRevenue) * 100 : 0;
  const hasProductsWithoutCost = stats.hasProductsWithoutCost || false;

  const statCards = [
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
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const cardContent = (
            <Card3D 
              intensity="medium" 
              glow={stat.trend === "up"}
              className={stat.warning ? "h-[15px] cursor-pointer hover:border-warning/60 transition-colors" : "h-[15px]"}
            >
              <div className="relative px-1 py-0 h-[15px] flex items-center justify-between gap-1 overflow-hidden">
                <div className="flex items-center gap-1 flex-shrink-0">
                  {stat.warning ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          className={`p-0 rounded ${stat.iconBg}`}
                          whileHover={{ rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <Icon className={`h-2 w-2 ${stat.iconColor}`} />
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{stat.warningMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <motion.div
                      className={`p-0 rounded ${stat.iconBg}`}
                      whileHover={{ rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Icon className={`h-2 w-2 ${stat.iconColor}`} />
                    </motion.div>
                  )}
                  <p className="text-[8px] text-muted-foreground leading-none whitespace-nowrap">{stat.title}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <motion.p
                    className={`text-[8px] font-bold leading-none ${stat.iconColor} whitespace-nowrap`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
                  >
                    {stat.value}
                  </motion.p>
                  {stat.trend !== "neutral" && !stat.warning && (
                    <div
                      className={`text-[8px] font-medium leading-none ${
                        stat.trend === "up" 
                          ? "text-primary" 
                          : "text-destructive"
                      }`}
                    >
                      {stat.trend === "up" ? "↑" : "↓"}
                    </div>
                  )}
                </div>
                {stat.warning && (
                  <p className="text-[7px] text-warning leading-none whitespace-nowrap ml-1">{t("dashboard.clickToAddQuotes")}</p>
                )}
              </div>
            </Card3D>
        );

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30, rotateX: -10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
          >
            {stat.warning ? (
              <Link to="/products">{cardContent}</Link>
            ) : (
              cardContent
            )}
          </motion.div>
        );
        })}
      </div>
    </TooltipProvider>
  );
};
