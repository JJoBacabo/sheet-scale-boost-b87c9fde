import { Card } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface PerformanceChartProps {
  data: any[];
  loading?: boolean;
}

export const PerformanceChart = ({ data, loading }: PerformanceChartProps) => {
  const { selectedCurrency } = useCurrency();
  if (loading) {
    return (
      <Card className="p-6 glass-card rounded-2xl border border-border/50">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-[350px] bg-muted rounded" />
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6 glass-card rounded-2xl border border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Desempenho (30 dias)</h3>
        </div>
        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <TrendingUp className="w-16 h-16 text-muted-foreground/30 mb-4 mx-auto" />
            <p>Sem dados disponíveis</p>
            <p className="text-sm mt-2">Conecte suas integrações para ver os dados</p>
          </div>
        </div>
      </Card>
    );
  }

  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    receita: Number(item.total_revenue) || 0,
    investimento: Number(item.total_spent) || 0,
    roas: Number(item.roas) || 0,
    conversoes: item.purchases || 0,
  }));

  return (
    <Card className="p-6 glass-card rounded-2xl border border-border/50">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-xl bg-primary/10">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Desempenho (30 dias)</h3>
      </div>

      <div className="space-y-6">
        {/* Revenue vs Spend Chart */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Receita vs Investimento ({selectedCurrency.code})</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(166 82% 60%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(166 82% 60%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorInvestimento" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  padding: '12px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="receita" 
                stroke="hsl(166 82% 60%)" 
                fill="url(#colorReceita)"
                strokeWidth={2}
                name="Receita"
              />
              <Area 
                type="monotone" 
                dataKey="investimento" 
                stroke="hsl(0 84% 60%)" 
                fill="url(#colorInvestimento)"
                strokeWidth={2}
                name="Investimento"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ROAS Chart */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">ROAS ao longo do tempo</h4>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  padding: '12px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="roas" 
                stroke="hsl(166 82% 60%)" 
                strokeWidth={3}
                dot={{ fill: 'hsl(166 82% 60%)', r: 4 }}
                name="ROAS"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};
