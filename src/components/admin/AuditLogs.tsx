import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { Search, Clock, User, FileText, Shield, CreditCard, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditLog {
  id: string;
  user_id: string | null;
  subscription_id: string | null;
  event_type: string;
  event_data: any;
  old_state: string | null;
  new_state: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    email?: string;
    full_name?: string;
  };
}

export const AuditLogs = () => {
  const { language } = useLanguage();
  const isPortuguese = language === 'pt';
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Fetch user profiles for logs with user_id
      const userIds = [...new Set((data || []).map(log => log.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const logsWithUsers = (data || []).map(log => ({
        ...log,
        user: profiles?.find(p => p.user_id === log.user_id)
      }));

      setLogs(logsWithUsers);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'subscription_state_change':
        return <CreditCard className="h-4 w-4" />;
      case 'user_created':
      case 'user_updated':
        return <User className="h-4 w-4" />;
      case 'admin_action':
        return <Shield className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'subscription_state_change':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'user_created':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'user_updated':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'admin_action':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, { pt: string; en: string }> = {
      subscription_state_change: { pt: 'Mudança de Estado de Assinatura', en: 'Subscription State Change' },
      user_created: { pt: 'Usuário Criado', en: 'User Created' },
      user_updated: { pt: 'Usuário Atualizado', en: 'User Updated' },
      admin_action: { pt: 'Ação de Admin', en: 'Admin Action' },
      ticket_created: { pt: 'Ticket Criado', en: 'Ticket Created' },
      ticket_updated: { pt: 'Ticket Atualizado', en: 'Ticket Updated' },
      ticket_resolved: { pt: 'Ticket Resolvido', en: 'Ticket Resolved' }
    };
    return labels[eventType]?.[isPortuguese ? 'pt' : 'en'] || eventType;
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.event_data).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || log.event_type === filterType;

    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">{isPortuguese ? 'A carregar...' : 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{isPortuguese ? 'Logs de Auditoria' : 'Audit Logs'}</h1>
        <p className="text-muted-foreground">{isPortuguese ? 'Histórico de todas as ações do sistema' : 'History of all system actions'}</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isPortuguese ? 'Pesquisar logs...' : 'Search logs...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder={isPortuguese ? 'Todos os tipos' : 'All types'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isPortuguese ? 'Todos os tipos' : 'All types'}</SelectItem>
              <SelectItem value="subscription_state_change">{isPortuguese ? 'Mudança de Assinatura' : 'Subscription Change'}</SelectItem>
              <SelectItem value="user_created">{isPortuguese ? 'Usuário Criado' : 'User Created'}</SelectItem>
              <SelectItem value="user_updated">{isPortuguese ? 'Usuário Atualizado' : 'User Updated'}</SelectItem>
              <SelectItem value="admin_action">{isPortuguese ? 'Ação de Admin' : 'Admin Action'}</SelectItem>
              <SelectItem value="ticket_created">{isPortuguese ? 'Ticket Criado' : 'Ticket Created'}</SelectItem>
              <SelectItem value="ticket_updated">{isPortuguese ? 'Ticket Atualizado' : 'Ticket Updated'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <Card key={log.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {getEventIcon(log.event_type)}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getEventColor(log.event_type)}>
                      {getEventLabel(log.event_type)}
                    </Badge>
                    {log.user && (
                      <span className="text-sm text-muted-foreground">
                        {log.user.full_name || log.user.email || 'Unknown User'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                      locale: isPortuguese ? pt : enUS
                    })}
                  </span>
                </div>
                
                {log.old_state && log.new_state && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="bg-red-500/10 text-red-500">
                      {log.old_state}
                    </Badge>
                    <span>→</span>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                      {log.new_state}
                    </Badge>
                  </div>
                )}

                {log.event_data && Object.keys(log.event_data).length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <details className="cursor-pointer">
                      <summary className="hover:text-foreground">
                        {isPortuguese ? 'Ver detalhes' : 'View details'}
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.event_data, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {log.ip_address && (
                    <span>IP: {log.ip_address}</span>
                  )}
                  {log.user_agent && (
                    <span className="truncate max-w-xs" title={log.user_agent}>
                      {log.user_agent}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {isPortuguese ? 'Nenhum log encontrado' : 'No logs found'}
        </div>
      )}
    </div>
  );
};

