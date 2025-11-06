import { useLanguage } from '@/contexts/LanguageContext';
import { SupportChat } from '@/hooks/useAdminSupport';
import { formatDistanceToNow } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search, UserCog } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface TicketListProps {
  tickets: SupportChat[];
  selectedTicketId?: string;
  onSelectTicket: (ticket: SupportChat) => void;
  onClaimTicket: (ticketId: string) => void;
  currentAdminId?: string;
}

export const TicketList = ({ tickets, selectedTicketId, onSelectTicket, onClaimTicket, currentAdminId }: TicketListProps) => {
  const { language } = useLanguage();
  const isPortuguese = language === 'pt';
  const [searchQuery, setSearchQuery] = useState('');

  // Sort tickets by priority (urgent first, then high, medium, low)
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  
  const sortedTickets = [...tickets].sort((a, b) => {
    const aPriority = priorityOrder[a.priority || 'medium'] ?? 2;
    const bPriority = priorityOrder[b.priority || 'medium'] ?? 2;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    // If same priority, sort by updated_at
    try {
      const aTime = new Date(a.updated_at).getTime();
      const bTime = new Date(b.updated_at).getTime();
      if (isNaN(aTime) || isNaN(bTime)) return 0;
      return bTime - aTime;
    } catch {
      return 0;
    }
  });

  const filteredTickets = sortedTickets.filter(ticket => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.profiles?.full_name?.toLowerCase().includes(query) ||
      ticket.category?.toLowerCase().includes(query) ||
      ticket.id.toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    const normalizedStatus = status.toLowerCase().trim();
    switch (normalizedStatus) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'waiting':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'resolved':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string | null | undefined) => {
    if (!status) return isPortuguese ? 'Pendente' : 'Waiting';
    const normalizedStatus = status.toLowerCase().trim();
    const labels: Record<string, { pt: string; en: string }> = {
      active: { pt: 'Ativo', en: 'Active' },
      waiting: { pt: 'Pendente', en: 'Waiting' },
      resolved: { pt: 'Resolvido', en: 'Resolved' }
    };
    return labels[normalizedStatus]?.[isPortuguese ? 'pt' : 'en'] || status;
  };

  const getCategoryLabel = (category?: string | null) => {
    if (!category || !category.trim()) return isPortuguese ? 'Sem categoria' : 'No category';
    const labels: Record<string, { pt: string; en: string }> = {
      meta_integration: { pt: 'Integração Meta', en: 'Meta Integration' },
      login: { pt: 'Login/Acesso', en: 'Login/Access' },
      dashboard: { pt: 'Dashboard', en: 'Dashboard' },
      payments: { pt: 'Pagamentos', en: 'Payments' },
      technical: { pt: 'Erros Técnicos', en: 'Technical Errors' }
    };
    const normalizedCategory = category.trim().toLowerCase();
    return labels[normalizedCategory]?.[isPortuguese ? 'pt' : 'en'] || category;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    const labels: Record<string, { pt: string; en: string }> = {
      urgent: { pt: 'Urgente', en: 'Urgent' },
      high: { pt: 'Alta', en: 'High' },
      medium: { pt: 'Média', en: 'Medium' },
      low: { pt: 'Baixa', en: 'Low' }
    };
    return labels[priority || 'medium']?.[isPortuguese ? 'pt' : 'en'] || priority || 'Medium';
  };

  return (
    <div className="h-full bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-bold text-lg mb-4 text-foreground">
          {isPortuguese ? 'Tickets de Suporte' : 'Support Tickets'}
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isPortuguese ? 'Pesquisar tickets...' : 'Search tickets...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Ticket List */}
      <div className="flex-1 overflow-y-auto">
        {filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>{isPortuguese ? 'Nenhum ticket encontrado' : 'No tickets found'}</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className={cn(
                "border-b border-border transition-colors hover:bg-accent",
                selectedTicketId === ticket.id && "bg-accent border-l-4 border-l-primary"
              )}
            >
              <button
                onClick={() => onSelectTicket(ticket)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">
                        {ticket.profiles?.full_name?.trim() || ticket.profiles?.email || 'User'}
                      </h3>
                      {ticket.admin_id === currentAdminId && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                          {isPortuguese ? 'Meu' : 'Mine'}
                        </Badge>
                      )}
                      {!ticket.admin_id && (
                        <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                          {isPortuguese ? 'Sem atribuir' : 'Unassigned'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {getCategoryLabel(ticket.category || null)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{ticket.language === 'pt' ? '🇵🇹' : '🇬🇧'}</span>
                    <Badge variant="outline" className={cn("text-xs", getPriorityColor(ticket.priority))}>
                      {getPriorityLabel(ticket.priority)}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", getStatusColor(ticket.status))}>
                      {getStatusLabel(ticket.status)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      try {
                        const date = new Date(ticket.updated_at);
                        if (isNaN(date.getTime())) return isPortuguese ? 'Data inválida' : 'Invalid date';
                        return formatDistanceToNow(date, {
                          addSuffix: true,
                          locale: isPortuguese ? pt : enUS
                        });
                      } catch {
                        return isPortuguese ? 'Data inválida' : 'Invalid date';
                      }
                    })()}
                  </p>
                  {!ticket.admin_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClaimTicket(ticket.id);
                      }}
                      className="h-7 gap-1.5 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <UserCog className="h-3 w-3" />
                      {isPortuguese ? 'Atribuir' : 'Claim'}
                    </Button>
                  )}
                </div>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
