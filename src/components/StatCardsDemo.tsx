import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Activity, Target, Zap } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  positive?: boolean;
  trend?: "up" | "down" | "neutral";
}

const EnhancedStatCard = ({ title, value, change, icon: Icon, positive, trend = "neutral" }: StatCardProps) => {
  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="w-4 h-4" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  return (
    <Card className="relative p-6 glass-card border-2 border-border/50 overflow-hidden group transition-all duration-300 hover:-translate-y-2 hover:shadow-glow hover:border-primary/40">
      {/* Top Border Gradient - 3px */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-primary" />
      
      <div className="flex items-start justify-between mb-6">
        <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg group-hover:shadow-glow group-hover:scale-110 transition-all duration-300">
          <Icon className="w-7 h-7 text-primary-foreground" />
        </div>
        <span className={`text-sm font-semibold px-3 py-1.5 rounded-full transition-all duration-300 flex items-center gap-1.5 ${
          positive 
            ? 'bg-success/20 text-success border border-success/30' 
            : trend === "down"
            ? 'bg-destructive/20 text-destructive border border-destructive/30'
            : 'bg-muted/50 text-muted-foreground border border-muted'
        }`}>
          {getTrendIcon()}
          {change}
        </span>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-4xl font-bold tracking-tight transition-colors duration-300 group-hover:text-primary">
          {value}
        </h3>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
      </div>
    </Card>
  );
};

export function StatCardsDemo() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Cards de Estatísticas</h2>
        <p className="text-muted-foreground mb-6">
          Cards com top border gradiente verde de 3px e hover com transform + glow effect
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedStatCard
          title="ROAS Médio"
          value="4.8x"
          change="+18%"
          icon={TrendingUp}
          positive
          trend="up"
        />
        <EnhancedStatCard
          title="Total de Vendas"
          value="€45,230"
          change="+23%"
          icon={ShoppingCart}
          positive
          trend="up"
        />
        <EnhancedStatCard
          title="CPA Médio"
          value="€18.40"
          change="-12%"
          icon={Target}
          positive
          trend="down"
        />
        <EnhancedStatCard
          title="Conversões"
          value="2,456"
          change="+32%"
          icon={Zap}
          positive
          trend="up"
        />
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <EnhancedStatCard
          title="Utilizadores Ativos"
          value="12,340"
          change="+5%"
          icon={Users}
          positive
          trend="up"
        />
        <EnhancedStatCard
          title="Receita Mensal"
          value="€89,450"
          change="+15%"
          icon={DollarSign}
          positive
          trend="up"
        />
        <EnhancedStatCard
          title="Taxa de Conversão"
          value="3.2%"
          change="-2%"
          icon={Activity}
          trend="down"
        />
      </div>

      {/* Large Card Example */}
      <Card className="relative p-8 glass-card border-2 border-border/50 overflow-hidden group transition-all duration-300 hover:-translate-y-2 hover:shadow-glow hover:border-primary/40 mt-12">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-primary" />
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold mb-2">Performance Geral</h3>
            <p className="text-muted-foreground">Últimos 30 dias comparado ao mês anterior</p>
          </div>
          <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg group-hover:shadow-glow group-hover:scale-110 transition-all duration-300">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Impressões</p>
            <p className="text-3xl font-bold">1.2M</p>
            <div className="flex items-center gap-1 text-success text-sm font-semibold">
              <TrendingUp className="w-4 h-4" />
              +24%
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Cliques</p>
            <p className="text-3xl font-bold">48.5K</p>
            <div className="flex items-center gap-1 text-success text-sm font-semibold">
              <TrendingUp className="w-4 h-4" />
              +18%
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">CTR</p>
            <p className="text-3xl font-bold">4.04%</p>
            <div className="flex items-center gap-1 text-success text-sm font-semibold">
              <TrendingUp className="w-4 h-4" />
              +8%
            </div>
          </div>
        </div>

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        </div>
      </Card>
    </div>
  );
}
