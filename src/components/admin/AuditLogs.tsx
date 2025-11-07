import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  Search, Clock, User, FileText, Shield, CreditCard, AlertCircle, 
  Download, Star, StarOff, MessageSquare, ChevronLeft, ChevronRight,
  Calendar as CalendarIcon, Filter, X, AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow, format, startOfDay, endOfDay } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

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
    user_id?: string;
    email?: string;
    full_name?: string;
  };
  isFavorite?: boolean;
  comment?: string;
}

const LOGS_PER_PAGE = 50;
const CRITICAL_STATES = ['expired', 'suspended', 'cancelled'];
const SUSPICIOUS_PATTERNS = {
  multipleStateChanges: (logs: AuditLog[]) => {
    const stateChangesByUser = new Map<string, number>();
    logs.forEach(log => {
      if (log.event_type === 'subscription_state_change' && log.user_id) {
        const count = stateChangesByUser.get(log.user_id) || 0;
        stateChangesByUser.set(log.user_id, count + 1);
      }
    });
    return Array.from(stateChangesByUser.entries())
      .filter(([_, count]) => count >= 3)
      .map(([userId]) => userId);
  },
  multipleIPs: (logs: AuditLog[]) => {
    const ipsByUser = new Map<string, Set<string>>();
    logs.forEach(log => {
      if (log.user_id && log.ip_address) {
        if (!ipsByUser.has(log.user_id)) {
          ipsByUser.set(log.user_id, new Set());
        }
        ipsByUser.get(log.user_id)!.add(log.ip_address);
      }
    });
    return Array.from(ipsByUser.entries())
      .filter(([_, ips]) => ips.size >= 3)
      .map(([userId]) => userId);
  },
  rapidEvents: (logs: AuditLog[]) => {
    const recentLogs = logs.filter(log => {
      const logDate = new Date(log.created_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return logDate > fiveMinutesAgo;
    });
    const eventsByUser = new Map<string, number>();
    recentLogs.forEach(log => {
      if (log.user_id) {
        const count = eventsByUser.get(log.user_id) || 0;
        eventsByUser.set(log.user_id, count + 1);
      }
    });
    return Array.from(eventsByUser.entries())
      .filter(([_, count]) => count >= 5)
      .map(([userId]) => userId);
  }
};

export const AuditLogs = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isPortuguese = language === 'pt';
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(undefined);
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<Array<{ user_id: string; email: string; full_name: string }>>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [suspiciousUsers, setSuspiciousUsers] = useState<Set<string>>(new Set());

  // Load favorites and comments from localStorage
  const loadLocalData = () => {
    try {
      const favorites = JSON.parse(localStorage.getItem('audit_logs_favorites') || '[]');
      const comments = JSON.parse(localStorage.getItem('audit_logs_comments') || '{}');
      return { favorites, comments };
    } catch {
      return { favorites: [], comments: {} };
    }
  };

  const saveLocalData = (favorites: string[], comments: Record<string, string>) => {
    localStorage.setItem('audit_logs_favorites', JSON.stringify(favorites));
    localStorage.setItem('audit_logs_comments', JSON.stringify(comments));
  };

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (filterDateFrom || filterDateTo) {
      fetchLogs();
    }
  }, [filterDateFrom, filterDateTo]);

  useEffect(() => {
    analyzeSuspiciousPatterns();
  }, [allLogs]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [debouncedSearch, filterType, filterUser, showFavoritesOnly, filterDateFrom, filterDateTo]);

  const fetchUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .not('user_id', 'is', null)
        .order('full_name', { ascending: true });
      
      if (profiles) {
        setUsers(profiles as Array<{ user_id: string; email: string; full_name: string }>);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); // Increased limit for better filtering

      if (filterDateFrom) {
        query = query.gte('created_at', startOfDay(filterDateFrom).toISOString());
      }
      if (filterDateTo) {
        query = query.lte('created_at', endOfDay(filterDateTo).toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user profiles for logs with user_id
      const userIds = [...new Set((data || []).map(log => log.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      const { favorites, comments } = loadLocalData();
      
      const logsWithUsers = (data || []).map(log => ({
        ...log,
        user: profiles?.find(p => p.user_id === log.user_id),
        isFavorite: favorites.includes(log.id),
        comment: comments[log.id] || ''
      }));

      setAllLogs(logsWithUsers);
      setLogs(logsWithUsers);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: isPortuguese ? 'Erro' : 'Error',
        description: isPortuguese ? 'Erro ao carregar logs' : 'Error loading logs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeSuspiciousPatterns = () => {
    const suspicious = new Set<string>();
    
    Object.values(SUSPICIOUS_PATTERNS).forEach(patternFn => {
      const userIds = patternFn(allLogs);
      userIds.forEach(userId => suspicious.add(userId));
    });

    setSuspiciousUsers(suspicious);
    
    if (suspicious.size > 0) {
      toast({
        title: isPortuguese ? 'Padrões Suspeitos Detectados' : 'Suspicious Patterns Detected',
        description: isPortuguese 
          ? `${suspicious.size} usuário(s) com atividade suspeita detectada`
          : `${suspicious.size} user(s) with suspicious activity detected`,
        variant: 'destructive'
      });
    }
  };

  const toggleFavorite = (logId: string) => {
    const { favorites } = loadLocalData();
    const newFavorites = favorites.includes(logId)
      ? favorites.filter(id => id !== logId)
      : [...favorites, logId];
    
    const { comments } = loadLocalData();
    saveLocalData(newFavorites, comments);
    
    setLogs(logs.map(log => 
      log.id === logId ? { ...log, isFavorite: !log.isFavorite } : log
    ));
    setAllLogs(allLogs.map(log => 
      log.id === logId ? { ...log, isFavorite: !log.isFavorite } : log
    ));
  };

  const saveComment = () => {
    if (!selectedLog) return;
    
    const { favorites, comments } = loadLocalData();
    const newComments = { ...comments, [selectedLog.id]: commentText };
    saveLocalData(favorites, newComments);
    
    setLogs(logs.map(log => 
      log.id === selectedLog.id ? { ...log, comment: commentText } : log
    ));
    setAllLogs(allLogs.map(log => 
      log.id === selectedLog.id ? { ...log, comment: commentText } : log
    ));
    
    setCommentDialogOpen(false);
    setSelectedLog(null);
    setCommentText('');
    
    toast({
      title: isPortuguese ? 'Comentário Salvo' : 'Comment Saved',
      description: isPortuguese ? 'Comentário adicionado com sucesso' : 'Comment added successfully'
    });
  };

  const openCommentDialog = (log: AuditLog) => {
    setSelectedLog(log);
    setCommentText(log.comment || '');
    setCommentDialogOpen(true);
  };

  const isCriticalEvent = (log: AuditLog) => {
    return CRITICAL_STATES.includes(log.new_state || '') || 
           CRITICAL_STATES.includes(log.old_state || '');
  };

  const isSuspiciousUser = (log: AuditLog) => {
    return log.user_id && suspiciousUsers.has(log.user_id);
  };

  const filteredLogs = useMemo(() => {
    let filtered = allLogs.filter(log => {
      // Search filter
      const matchesSearch = 
        log.event_type.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        log.user?.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        log.user?.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        JSON.stringify(log.event_data).toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        log.ip_address?.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      // Type filter
      const matchesType = filterType === 'all' || log.event_type === filterType;
      
      // User filter
      const matchesUser = filterUser === 'all' || log.user_id === filterUser;
      
      // Favorites filter
      const matchesFavorites = !showFavoritesOnly || log.isFavorite;
      
      return matchesSearch && matchesType && matchesUser && matchesFavorites;
    });

    return filtered;
  }, [allLogs, debouncedSearch, filterType, filterUser, showFavoritesOnly]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * LOGS_PER_PAGE;
    return filteredLogs.slice(startIndex, startIndex + LOGS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);

  const exportToCSV = () => {
    const headers = [
      'ID', 'Data', 'Tipo', 'Usuário', 'Email', 'Estado Anterior', 
      'Novo Estado', 'IP', 'User Agent', 'Dados do Evento'
    ];
    
    const rows = filteredLogs.map(log => [
      log.id,
      new Date(log.created_at).toLocaleString(),
      log.event_type,
      log.user?.full_name || '',
      log.user?.email || '',
      log.old_state || '',
      log.new_state || '',
      log.ip_address || '',
      log.user_agent || '',
      JSON.stringify(log.event_data)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: isPortuguese ? 'Exportado' : 'Exported',
      description: isPortuguese 
        ? `${filteredLogs.length} logs exportados com sucesso`
        : `${filteredLogs.length} logs exported successfully`
    });
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
      case 'ticket_created':
      case 'ticket_updated':
      case 'ticket_resolved':
      case 'ticket_assigned':
      case 'ticket_message_added':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string, isCritical: boolean, isSuspicious: boolean) => {
    if (isCritical) {
      return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30';
    }
    if (isSuspicious) {
      return 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30';
    }
    switch (eventType) {
      case 'subscription_state_change':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'user_created':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'user_updated':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'admin_action':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'ticket_created':
        return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      case 'ticket_updated':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'ticket_resolved':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'ticket_assigned':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'ticket_message_added':
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
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
      ticket_resolved: { pt: 'Ticket Resolvido', en: 'Ticket Resolved' },
      ticket_assigned: { pt: 'Ticket Atribuído', en: 'Ticket Assigned' },
      ticket_message_added: { pt: 'Mensagem Adicionada', en: 'Message Added' }
    };
    return labels[eventType]?.[isPortuguese ? 'pt' : 'en'] || eventType;
  };

  const clearDateFilter = () => {
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">{isPortuguese ? 'A carregar...' : 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{isPortuguese ? 'Logs de Auditoria' : 'Audit Logs'}</h1>
          <p className="text-muted-foreground">{isPortuguese ? 'Histórico de todas as ações do sistema' : 'History of all system actions'}</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          {isPortuguese ? 'Exportar CSV' : 'Export CSV'}
        </Button>
      </div>

      {/* Suspicious Patterns Alert */}
      {suspiciousUsers.size > 0 && (
        <Card className="p-4 bg-orange-500/10 border-orange-500/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div className="flex-1">
              <p className="font-semibold text-orange-600 dark:text-orange-400">
                {isPortuguese ? 'Padrões Suspeitos Detectados' : 'Suspicious Patterns Detected'}
              </p>
              <p className="text-sm text-orange-600/80 dark:text-orange-400/80">
                {isPortuguese 
                  ? `${suspiciousUsers.size} usuário(s) com atividade suspeita. Verifique os logs marcados.`
                  : `${suspiciousUsers.size} user(s) with suspicious activity. Check marked logs.`}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
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
              <SelectTrigger className="w-full md:w-[200px]">
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
                <SelectItem value="ticket_resolved">{isPortuguese ? 'Ticket Resolvido' : 'Ticket Resolved'}</SelectItem>
                <SelectItem value="ticket_assigned">{isPortuguese ? 'Ticket Atribuído' : 'Ticket Assigned'}</SelectItem>
                <SelectItem value="ticket_message_added">{isPortuguese ? 'Mensagem Adicionada' : 'Message Added'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder={isPortuguese ? 'Todos os usuários' : 'All users'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isPortuguese ? 'Todos os usuários' : 'All users'}</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex gap-2 flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full md:w-[240px] justify-start text-left font-normal", !filterDateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterDateFrom ? (
                      format(filterDateFrom, "PPP", { locale: isPortuguese ? pt : enUS })
                    ) : (
                      <span>{isPortuguese ? 'Data inicial' : 'Start date'}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterDateFrom}
                    onSelect={setFilterDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full md:w-[240px] justify-start text-left font-normal", !filterDateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterDateTo ? (
                      format(filterDateTo, "PPP", { locale: isPortuguese ? pt : enUS })
                    ) : (
                      <span>{isPortuguese ? 'Data final' : 'End date'}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterDateTo}
                    onSelect={setFilterDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {(filterDateFrom || filterDateTo) && (
                <Button variant="ghost" size="icon" onClick={clearDateFilter}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              size="sm"
            >
              <Star className={cn("h-4 w-4 mr-2", showFavoritesOnly && "fill-yellow-400")} />
              {isPortuguese ? 'Favoritos' : 'Favorites'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{isPortuguese ? 'Total de Logs' : 'Total Logs'}</p>
          <p className="text-2xl font-bold">{filteredLogs.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{isPortuguese ? 'Eventos Críticos' : 'Critical Events'}</p>
          <p className="text-2xl font-bold text-red-500">
            {filteredLogs.filter(log => isCriticalEvent(log)).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{isPortuguese ? 'Usuários Suspeitos' : 'Suspicious Users'}</p>
          <p className="text-2xl font-bold text-orange-500">
            {new Set(filteredLogs.filter(log => isSuspiciousUser(log)).map(log => log.user_id)).size}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{isPortuguese ? 'Favoritos' : 'Favorites'}</p>
          <p className="text-2xl font-bold text-yellow-500">
            {filteredLogs.filter(log => log.isFavorite).length}
          </p>
        </Card>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {paginatedLogs.map((log) => {
          const critical = isCriticalEvent(log);
          const suspicious = isSuspiciousUser(log);
          
          return (
            <Card 
              key={log.id} 
              className={cn(
                "p-4 hover:shadow-md transition-shadow",
                critical && "border-red-500/30 bg-red-500/5",
                suspicious && !critical && "border-orange-500/30 bg-orange-500/5"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 flex flex-col gap-2">
                  {getEventIcon(log.event_type)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleFavorite(log.id)}
                  >
                    {log.isFavorite ? (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={getEventColor(log.event_type, critical, suspicious)}>
                          {getEventLabel(log.event_type)}
                        </Badge>
                        {critical && <AlertCircle className="h-3 w-3 text-red-500" />}
                        {suspicious && !critical && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                      </div>
                      {log.user && (
                        <button
                          onClick={() => navigate(`/admin/users?userId=${log.user_id}`)}
                          className="text-sm text-primary hover:underline"
                        >
                          {log.user.full_name || log.user.email || 'Unknown User'}
                        </button>
                      )}
                      {log.comment && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 text-blue-500" />
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                            {isPortuguese ? 'Comentário' : 'Comment'}
                          </Badge>
                        </div>
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

                  {log.comment && (
                    <div className="text-sm p-2 bg-blue-500/10 rounded border border-blue-500/20">
                      <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                        {isPortuguese ? 'Comentário:' : 'Comment:'}
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">{log.comment}</p>
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

                  <div className="flex items-center justify-between">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openCommentDialog(log)}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {isPortuguese ? 'Comentário' : 'Comment'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isPortuguese 
              ? `Mostrando ${(currentPage - 1) * LOGS_PER_PAGE + 1} a ${Math.min(currentPage * LOGS_PER_PAGE, filteredLogs.length)} de ${filteredLogs.length} logs`
              : `Showing ${(currentPage - 1) * LOGS_PER_PAGE + 1} to ${Math.min(currentPage * LOGS_PER_PAGE, filteredLogs.length)} of ${filteredLogs.length} logs`}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {isPortuguese ? 'Página' : 'Page'} {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {paginatedLogs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {isPortuguese ? 'Nenhum log encontrado' : 'No logs found'}
        </div>
      )}

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isPortuguese ? 'Adicionar Comentário' : 'Add Comment'}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={isPortuguese ? 'Digite seu comentário...' : 'Type your comment...'}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentDialogOpen(false)}>
              {isPortuguese ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button onClick={saveComment}>
              {isPortuguese ? 'Salvar' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
