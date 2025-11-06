import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Activity, LogIn, Plus, Edit, Trash, ShoppingBag, TrendingUp } from "lucide-react";

interface RecentActivityProps {
  activities: any[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'login': return LogIn;
    case 'campaign_created': return Plus;
    case 'campaign_updated': return Edit;
    case 'campaign_deleted': return Trash;
    case 'product_added': return ShoppingBag;
    case 'product_synced': return TrendingUp;
    default: return Activity;
  }
};

const getActivityLabel = (type: string) => {
  switch (type) {
    case 'login': return 'Login';
    case 'campaign_created': return 'Campanha Criada';
    case 'campaign_updated': return 'Campanha Atualizada';
    case 'campaign_deleted': return 'Campanha Eliminada';
    case 'product_added': return 'Produto Adicionado';
    case 'product_synced': return 'Produtos Sincronizados';
    default: return type;
  }
};

export const RecentActivity = ({ activities }: RecentActivityProps) => {
  return (
    <Card className="p-6 glass-card rounded-2xl border border-border/50">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-xl bg-primary/10">
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Atividade Recente</h3>
      </div>
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma atividade registada</p>
              <p className="text-xs text-muted-foreground/70 mt-1">As suas ações aparecerão aqui</p>
            </div>
          ) : (
            activities.map((activity) => {
              const Icon = getActivityIcon(activity.activity_type);
              return (
                <div 
                  key={activity.id} 
                  className="group flex items-start gap-3 p-4 rounded-xl glass-card border border-border/30 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-primary/10 text-primary border-primary/20"
                      >
                        {getActivityLabel(activity.activity_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { 
                          addSuffix: true,
                          locale: pt 
                        })}
                      </span>
                    </div>
                    {activity.activity_data?.campaign_name && (
                      <p className="text-sm text-foreground/90 truncate">
                        {activity.activity_data.campaign_name}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
