import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Facebook, ShoppingBag, Plus, BarChart3, Zap, TrendingUp } from "lucide-react";
import { Card3D } from "@/components/ui/Card3D";
import { motion } from "framer-motion";

interface QuickActionsProps {
  onConnectFacebook: () => void;
  onConnectShopify: () => void;
  isConnectedFacebook: boolean;
  isConnectedShopify: boolean;
}

export const QuickActions = ({ 
  onConnectFacebook, 
  onConnectShopify, 
  isConnectedFacebook, 
  isConnectedShopify 
}: QuickActionsProps) => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Nova Campanha",
      description: "Criar campanha publicitária",
      icon: Plus,
      onClick: () => navigate('/campaign-control'),
      gradient: "from-primary/20 to-primary-glow/20",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      border: "border-primary/20",
    },
    {
      title: "Facebook Ads",
      description: isConnectedFacebook ? "✓ Conectado" : "Conectar agora",
      icon: Facebook,
      onClick: onConnectFacebook,
      gradient: "from-blue-500/20 to-indigo-500/20",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      border: isConnectedFacebook ? "border-primary/20" : "border-blue-500/20",
      connected: isConnectedFacebook,
    },
    {
      title: "Shopify",
      description: isConnectedShopify ? "✓ Conectado" : "Conectar loja",
      icon: ShoppingBag,
      onClick: onConnectShopify,
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      border: "border-primary/20",
      connected: isConnectedShopify,
    },
    {
      title: "Ver Campanhas",
      description: "Gerir campanhas ativas",
      icon: BarChart3,
      onClick: () => navigate('/campaign-control'),
      gradient: "from-purple-500/20 to-pink-500/20",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
      border: "border-purple-500/20",
    },
  ];

  return (
    <Card className="p-6 glass-card rounded-2xl border border-border/50">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-xl bg-primary/10">
          <Zap className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Ações Rápidas</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={action.onClick}
              className="cursor-pointer"
            >
              <Card3D 
                intensity="low" 
                glow={action.connected}
                className="p-6 text-left w-full"
              >
                <div className="relative flex flex-col items-center text-center gap-4">
                  <motion.div
                    className={`p-4 rounded-xl ${action.iconBg}`}
                    whileHover={{ rotateZ: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon className={`h-6 w-6 ${action.iconColor}`} />
                  </motion.div>
                  <div>
                    <h3 className="font-semibold mb-1 text-foreground">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  {action.connected && (
                    <motion.div
                      className="flex items-center gap-2"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </motion.div>
                  )}
                </div>
              </Card3D>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
};
