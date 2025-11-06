import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, CreditCard, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SubscriptionHistoryEntry {
  id: string;
  event_type: string;
  plan_name: string;
  billing_period: string;
  status: string;
  period_start: string;
  period_end: string;
  created_at: string;
  metadata: any;
}

interface SubscriptionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: SubscriptionHistoryEntry[];
}

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'created':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'renewed':
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    case 'canceled':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'expired':
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    default:
      return <CreditCard className="h-4 w-4 text-gray-500" />;
  }
};

const getEventLabel = (eventType: string) => {
  const labels: Record<string, string> = {
    created: 'Criada',
    renewed: 'Renovada',
    canceled: 'Cancelada',
    expired: 'Expirada',
    updated: 'Atualizada'
  };
  return labels[eventType] || eventType;
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    canceled: "destructive",
    inactive: "secondary",
  };
  
  const labels: Record<string, string> = {
    active: 'Ativo',
    canceled: 'Cancelado',
    inactive: 'Inativo',
  };
  
  return (
    <Badge variant={variants[status] || "outline"}>
      {labels[status] || status}
    </Badge>
  );
};

const getPlanLabel = (planName: string) => {
  const labels: Record<string, string> = {
    trial: 'FREE',
    basic: 'Básico',
    pro: 'Pro',
    enterprise: 'Enterprise'
  };
  return labels[planName] || planName;
};

export const SubscriptionHistoryModal = ({ 
  open, 
  onOpenChange, 
  history 
}: SubscriptionHistoryModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Assinaturas
          </DialogTitle>
        </DialogHeader>

        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum histórico de assinatura encontrado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div 
                key={entry.id} 
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getEventIcon(entry.event_type)}
                    <div>
                      <h3 className="font-semibold">
                        {getEventLabel(entry.event_type)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(entry.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(entry.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Plano</p>
                    <p className="font-medium">
                      {getPlanLabel(entry.plan_name)} ({entry.billing_period === 'monthly' ? 'Mensal' : 'Anual'})
                    </p>
                  </div>
                  
                  {entry.period_start && (
                    <div>
                      <p className="text-muted-foreground">Início do Período</p>
                      <p className="font-medium">
                        {format(new Date(entry.period_start), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                  
                  {entry.period_end && (
                    <div>
                      <p className="text-muted-foreground">Fim do Período</p>
                      <p className="font-medium">
                        {format(new Date(entry.period_end), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}

                  {entry.metadata?.store_limit !== undefined && (
                    <div>
                      <p className="text-muted-foreground">Limite de Lojas</p>
                      <p className="font-medium">
                        {entry.metadata.store_limit === 0 ? 'Ilimitado' : entry.metadata.store_limit}
                      </p>
                    </div>
                  )}

                  {entry.metadata?.campaign_limit !== undefined && (
                    <div>
                      <p className="text-muted-foreground">Limite de Campanhas</p>
                      <p className="font-medium">
                        {entry.metadata.campaign_limit === 0 ? 'Ilimitado' : entry.metadata.campaign_limit}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
