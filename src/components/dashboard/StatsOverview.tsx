import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target, ShoppingCart, Activity } from "lucide-react";
import { Card3D } from "@/components/ui/Card3D";
import { motion } from "framer-motion";

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
  };
}

export const StatsOverview = ({ stats }: StatsOverviewProps) => {
  const formatCurrency = (value: number) => `€${value.toFixed(2)}`;
  const profit = stats.totalRevenue - stats.totalSpent;
  const profitMargin = stats.totalRevenue > 0 ? (profit / stats.totalRevenue) * 100 : 0;

  const statCards = [
    {
      title: "Receita Total",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      trend: stats.totalRevenue > 0 ? "up" : "neutral",
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      border: "border-emerald-500/20"
    },
    {
      title: "Investimento Total",
      value: formatCurrency(stats.totalSpent),
      icon: TrendingDown,
      trend: "neutral",
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      border: "border-blue-500/20"
    },
    {
      title: "Lucro",
      value: formatCurrency(profit),
      icon: profit >= 0 ? TrendingUp : TrendingDown,
      trend: profit >= 0 ? "up" : "down",
      gradient: profit >= 0 ? "from-primary/20 to-primary-glow/20" : "from-destructive/20 to-red-500/20",
      iconBg: profit >= 0 ? "bg-primary/10" : "bg-destructive/10",
      iconColor: profit >= 0 ? "text-primary" : "text-destructive",
      border: profit >= 0 ? "border-primary/20" : "border-destructive/20"
    },
    {
      title: "ROAS Médio",
      value: stats.averageRoas.toFixed(2),
      icon: Target,
      trend: stats.averageRoas >= 2 ? "up" : stats.averageRoas >= 1 ? "neutral" : "down",
      gradient: stats.averageRoas >= 2 ? "from-primary/20 to-emerald-500/20" : "from-warning/20 to-yellow-500/20",
      iconBg: stats.averageRoas >= 2 ? "bg-primary/10" : "bg-warning/10",
      iconColor: stats.averageRoas >= 2 ? "text-primary" : "text-warning",
      border: stats.averageRoas >= 2 ? "border-primary/20" : "border-warning/20"
    },
    {
      title: "Campanhas Ativas",
      value: `${stats.activeCampaigns} / ${stats.totalCampaigns}`,
      icon: Activity,
      trend: "neutral",
      gradient: "from-purple-500/20 to-pink-500/20",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
      border: "border-purple-500/20"
    },
    {
      title: "Conversões",
      value: stats.totalConversions.toString(),
      icon: ShoppingCart,
      trend: stats.totalConversions > 0 ? "up" : "neutral",
      gradient: "from-indigo-500/20 to-purple-500/20",
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-500",
      border: "border-indigo-500/20"
    },
    {
      title: "CPC Médio",
      value: formatCurrency(stats.averageCpc),
      icon: DollarSign,
      trend: "neutral",
      gradient: "from-cyan-500/20 to-blue-500/20",
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-500",
      border: "border-cyan-500/20"
    },
    {
      title: "Margem de Lucro",
      value: `${profitMargin.toFixed(1)}%`,
      icon: profitMargin >= 0 ? TrendingUp : TrendingDown,
      trend: profitMargin >= 20 ? "up" : "neutral",
      gradient: profitMargin >= 20 ? "from-primary/20 to-emerald-500/20" : "from-warning/20 to-orange-500/20",
      iconBg: profitMargin >= 20 ? "bg-primary/10" : "bg-warning/10",
      iconColor: profitMargin >= 20 ? "text-primary" : "text-warning",
      border: profitMargin >= 20 ? "border-primary/20" : "border-warning/20"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30, rotateX: -10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
          >
            <Card3D 
              intensity="medium" 
              glow={stat.trend === "up"}
            >
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-3">
                  <motion.div
                    className={`p-3 rounded-xl ${stat.iconBg}`}
                    whileHover={{ rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </motion.div>
                  {stat.trend !== "neutral" && (
                    <div
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${
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
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <motion.p
                    className={`text-2xl font-bold ${stat.iconColor}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
                  >
                    {stat.value}
                  </motion.p>
                </div>
              </div>
            </Card3D>
          </motion.div>
        );
      })}
    </div>
  );
};
