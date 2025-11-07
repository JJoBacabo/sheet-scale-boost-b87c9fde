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
      // First try to get from profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .not('user_id', 'is', null)
        .order('full_name', { ascending: true });
      
      let usersList: Array<{ user_id: string; email: string; full_name: string }> = [];
      
      if (profiles) {
        usersList = profiles.map(p => ({
          user_id: p.user_id,
          email: p.email || '',
          full_name: p.full_name || ''
        }));
      }
      
      // Try to enrich with emails from edge function if we have session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: usersData } = await supabase.functions.invoke('get-users', {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });
          
          if (usersData?.users) {
            // Merge edge function data with profiles
            const usersMap = new Map(usersList.map(u => [u.user_id, u]));
            usersData.users.forEach((user: any) => {
              const existing = usersMap.get(user.id);
              if (existing) {
                // Update email if missing
                if (!existing.email && user.email) {
                  existing.email = user.email;
                }
                if (!existing.full_name && user.full_name) {
                  existing.full_name = user.full_name;
                }
              } else {
                // Add user if not in profiles
                usersList.push({
                  user_id: user.id,
                  email: user.email || '',
                  full_name: user.full_name || ''
                });
              }
            });
          }
        }
      } catch (error) {
        console.error('Error fetching users from edge function:', error);
        // Continue with profiles only
      }
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // Fetch audit logs with explicit user_id check
      // Melhorar query: adicionar filtros se necessário e garantir ordenação correta
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000); // Aumentar limite para garantir que não perdemos logs
      
      // Debug: Log query before execution
      console.log('Fetching audit logs...');

      if (filterDateFrom) {
        query = query.gte('created_at', startOfDay(filterDateFrom).toISOString());
      }
      if (filterDateTo) {
        query = query.lte('created_at', endOfDay(filterDateTo).toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        throw error;
      }
      
      // Debug: Log fetched data - MUITO DETALHADO
      console.log(`📊 Total de logs buscados: ${data?.length || 0}`);
      const ticketLogs = (data || []).filter(log => log.event_type?.startsWith('ticket_'));
      console.log(`🎫 Logs de tickets encontrados: ${ticketLogs.length}`);
      
      // Debug específico para ticket_deleted
      const deletedLogs = (data || []).filter(log => log.event_type === 'ticket_deleted');
      console.log(`🗑️ Logs de ticket_deleted encontrados: ${deletedLogs.length}`);
      deletedLogs.forEach((log, index) => {
        console.log(`🗑️ Ticket Deleted Log #${index + 1}:`, {
          id: log.id,
          event_type: log.event_type,
          user_id: log.user_id,
          event_data: log.event_data,
          created_at: log.created_at
        });
      });
      
      ticketLogs.forEach((log, index) => {
        const userIdFromLog = log.user_id;
        const userIdFromEventData = (log.event_data as any)?.created_by || (log.event_data as any)?.user_id || (log.event_data as any)?.creator_id || null;
        const finalUserId = userIdFromLog || userIdFromEventData;
        
        console.log(`🎫 Ticket Log #${index + 1}:`, {
          id: log.id,
          event_type: log.event_type,
          'user_id (campo)': userIdFromLog || '❌ NULL/Vazio',
          'created_by (event_data)': userIdFromEventData || '❌ NULL/Vazio',
          'user_id FINAL': finalUserId || '❌ SEM USER_ID',
          'TEM user_id?': !!finalUserId,
          event_data: log.event_data,
          created_at: log.created_at
        });
        
        if (!finalUserId) {
          console.error(`❌❌❌ LOG SEM USER_ID:`, log);
        }
      });

      // Fetch user profiles for logs with user_id
      const userIds = [...new Set((data || []).map(log => {
        // Get user_id from log or from event_data.created_by as fallback
        return log.user_id || (log.event_data as any)?.created_by || null;
      }).filter((id): id is string => Boolean(id)))];
      
      // Fetch profiles from database
      let profiles: Array<{ user_id: string; email: string | null; full_name: string | null }> = [];
      
      if (userIds.length > 0) {
        // Get from profiles table
        const { data: profilesData } = await supabase
        .from('profiles')
          .select('user_id, email, full_name')
        .in('user_id', userIds);

        profiles = (profilesData || []).map(p => ({
          user_id: p.user_id,
          email: p.email || null,
          full_name: p.full_name || null
        }));
        
        // Try to get missing emails from edge function
        const usersWithoutEmail = userIds.filter(id => {
          const profile = profiles.find(p => p.user_id === id);
          return !profile || !profile.email;
        });
        
        if (usersWithoutEmail.length > 0) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const { data: usersData } = await supabase.functions.invoke('get-users', {
                headers: {
                  Authorization: `Bearer ${session.access_token}`
                }
              });
              
              if (usersData?.users && Array.isArray(usersData.users)) {
                // Create a map for quick lookup
                const usersMap = new Map(
                  (usersData.users as Array<{ id: string; email?: string; full_name?: string }>)
                    .map((user) => [user.id, user])
                );
                
                // Update existing profiles or add new ones
                usersWithoutEmail.forEach((userId: string) => {
                  const authUser = usersMap.get(userId);
                  if (authUser) {
                    const existingProfile = profiles.find(p => p.user_id === userId);
                    if (existingProfile) {
                      // Update email if missing
                      if (!existingProfile.email && authUser.email) {
                        existingProfile.email = authUser.email;
                      }
                      if (!existingProfile.full_name && authUser.full_name) {
                        existingProfile.full_name = authUser.full_name;
                      }
                    } else {
                      // Add new profile entry
                      profiles.push({
                        user_id: userId,
                        email: authUser.email || null,
                        full_name: authUser.full_name || null
                      });
                    }
                  } else {
                    // User not found in auth, but we still create entry with user_id
                    if (!profiles.find(p => p.user_id === userId)) {
                      profiles.push({
                        user_id: userId,
                        email: null,
                        full_name: null
                      });
                    }
                  }
                });
              }
            }
          } catch (error) {
            console.error('Error fetching users from edge function:', error);
            // Add missing users without email
            userIds.forEach((userId: string) => {
              if (!profiles.find(p => p.user_id === userId)) {
                profiles.push({
                  user_id: userId,
                  email: null,
                  full_name: null
                });
              }
            });
          }
        }
        
        // Ensure all userIds have an entry (even without email/name)
        userIds.forEach((userId: string) => {
          if (!profiles.find(p => p.user_id === userId)) {
            profiles.push({
              user_id: userId,
              email: null,
              full_name: null
            });
          }
        });
      }

      const { favorites, comments } = loadLocalData();
      
      const logsWithUsers = (data || []).map(log => {
        // BUSCAR USER_ID EM TODAS AS FONTES POSSÍVEIS
        const userIdFromLog = log.user_id;
        const userIdFromEventDataCreatedBy = (log.event_data as any)?.created_by;
        const userIdFromEventDataUserId = (log.event_data as any)?.user_id;
        const userIdFromEventDataCreatorId = (log.event_data as any)?.creator_id;
        
        // Prioridade: log.user_id > event_data.created_by > event_data.user_id > event_data.creator_id
        const userId = userIdFromLog || userIdFromEventDataCreatedBy || userIdFromEventDataUserId || userIdFromEventDataCreatorId || null;
        
        const profile = userId ? profiles.find(p => p.user_id === userId) : null;
        
        // Debug DETALHADO para tickets
        if (log.event_type?.startsWith('ticket_')) {
          console.log('🔄 Processando ticket log:', {
            id: log.id,
            event_type: log.event_type,
            'user_id (campo)': userIdFromLog || '❌ NULL',
            'created_by': userIdFromEventDataCreatedBy || '❌ NULL',
            'user_id (event_data)': userIdFromEventDataUserId || '❌ NULL',
            'creator_id': userIdFromEventDataCreatorId || '❌ NULL',
            'USER_ID FINAL ESCOLHIDO': userId || '❌ SEM USER_ID',
            profile_encontrado: !!profile,
            profile_email: profile?.email || 'N/A',
            profile_name: profile?.full_name || 'N/A'
          });
          
          if (!userId) {
            console.error('❌❌❌ TICKET LOG SEM USER_ID EM NENHUMA FONTE!', log);
          }
        }
        
        return {
          ...log,
          // GARANTIR que user_id seja sempre definido (mesmo que venha do event_data)
          user_id: userId || log.user_id || null,
          user: userId ? {
            user_id: userId,
            email: profile?.email || null,
            full_name: profile?.full_name || null
          } : undefined,
          isFavorite: favorites.includes(log.id),
          comment: comments[log.id] || ''
        };
      });

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
    // Critical states
    if (CRITICAL_STATES.includes(log.new_state || '') || 
        CRITICAL_STATES.includes(log.old_state || '')) {
      return true;
    }
    
    // Critical event types
    if (log.event_type === 'ticket_deleted' || 
        log.event_type === 'admin_force_status' ||
        (log.event_type === 'subscription_state_change' && 
         CRITICAL_STATES.includes(log.new_state || ''))) {
      return true;
    }
    
    return false;
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
      case 'admin_force_status':
        return <Shield className="h-4 w-4" />;
      case 'ticket_created':
      case 'ticket_updated':
      case 'ticket_resolved':
      case 'ticket_reopened':
      case 'ticket_assigned':
      case 'ticket_reassigned':
      case 'ticket_message_added':
      case 'ticket_deleted':
      case 'ticket_priority_changed':
      case 'ticket_notes_updated':
        return <MessageSquare className="h-4 w-4" />;
      case 'subscription_created':
      case 'subscription_plan_changed':
        return <CreditCard className="h-4 w-4" />;
      case 'user_plan_updated':
      case 'user_status_updated':
        return <User className="h-4 w-4" />;
      case 'admin_role_added':
      case 'admin_role_removed':
        return <Shield className="h-4 w-4" />;
      case 'campaign_created':
      case 'campaign_updated':
      case 'campaign_deleted':
        return <FileText className="h-4 w-4" />;
      case 'product_created':
      case 'product_updated':
      case 'product_deleted':
        return <FileText className="h-4 w-4" />;
      case 'shopify_connected':
      case 'shopify_disconnected':
      case 'facebook_connected':
      case 'facebook_disconnected':
      case 'integration_created':
      case 'integration_updated':
      case 'integration_deleted':
        return <FileText className="h-4 w-4" />;
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
      case 'admin_force_status':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'ticket_created':
        return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      case 'ticket_updated':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'ticket_resolved':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'ticket_reopened':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'ticket_assigned':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'ticket_reassigned':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'ticket_message_added':
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      case 'ticket_deleted':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'ticket_priority_changed':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'ticket_notes_updated':
        return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
      case 'subscription_created':
      case 'subscription_plan_changed':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'user_plan_updated':
      case 'user_status_updated':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'admin_role_added':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'admin_role_removed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'campaign_created':
      case 'campaign_updated':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'campaign_deleted':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'product_created':
      case 'product_updated':
        return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      case 'product_deleted':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'shopify_connected':
      case 'facebook_connected':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'shopify_disconnected':
      case 'facebook_disconnected':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'integration_created':
      case 'integration_updated':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'integration_deleted':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, { pt: string; en: string }> = {
      // Subscriptions
      subscription_state_change: { pt: 'Mudança de Estado de Assinatura', en: 'Subscription State Change' },
      subscription_created: { pt: 'Assinatura Criada', en: 'Subscription Created' },
      subscription_plan_changed: { pt: 'Plano Alterado', en: 'Plan Changed' },
      // Users
      user_created: { pt: 'Usuário Criado', en: 'User Created' },
      user_updated: { pt: 'Usuário Atualizado', en: 'User Updated' },
      user_plan_updated: { pt: 'Plano do Usuário Atualizado', en: 'User Plan Updated' },
      user_status_updated: { pt: 'Status do Usuário Atualizado', en: 'User Status Updated' },
      // Admin Actions
      admin_action: { pt: 'Ação de Admin', en: 'Admin Action' },
      admin_force_status: { pt: 'Admin Forçou Status', en: 'Admin Force Status' },
      admin_role_added: { pt: 'Role de Admin Adicionado', en: 'Admin Role Added' },
      admin_role_removed: { pt: 'Role de Admin Removido', en: 'Admin Role Removed' },
      // Tickets
      ticket_created: { pt: 'Ticket Criado', en: 'Ticket Created' },
      ticket_updated: { pt: 'Ticket Atualizado', en: 'Ticket Updated' },
      ticket_resolved: { pt: 'Ticket Resolvido', en: 'Ticket Resolved' },
      ticket_reopened: { pt: 'Ticket Reaberto', en: 'Ticket Reopened' },
      ticket_assigned: { pt: 'Ticket Atribuído', en: 'Ticket Assigned' },
      ticket_reassigned: { pt: 'Ticket Reatribuído', en: 'Ticket Reassigned' },
      ticket_message_added: { pt: 'Mensagem Adicionada', en: 'Message Added' },
      ticket_deleted: { pt: 'Ticket Eliminado', en: 'Ticket Deleted' },
      ticket_priority_changed: { pt: 'Prioridade Alterada', en: 'Priority Changed' },
      ticket_notes_updated: { pt: 'Notas Atualizadas', en: 'Notes Updated' },
      // Campaigns
      campaign_created: { pt: 'Campanha Criada', en: 'Campaign Created' },
      campaign_updated: { pt: 'Campanha Atualizada', en: 'Campaign Updated' },
      campaign_deleted: { pt: 'Campanha Eliminada', en: 'Campaign Deleted' },
      // Products
      product_created: { pt: 'Produto Criado', en: 'Product Created' },
      product_updated: { pt: 'Produto Atualizado', en: 'Product Updated' },
      product_deleted: { pt: 'Produto Eliminado', en: 'Product Deleted' },
      // Integrations
      integration_created: { pt: 'Integração Criada', en: 'Integration Created' },
      integration_updated: { pt: 'Integração Atualizada', en: 'Integration Updated' },
      integration_deleted: { pt: 'Integração Eliminada', en: 'Integration Deleted' },
      shopify_connected: { pt: 'Shopify Conectado', en: 'Shopify Connected' },
      shopify_disconnected: { pt: 'Shopify Desconectado', en: 'Shopify Disconnected' },
      facebook_connected: { pt: 'Facebook Conectado', en: 'Facebook Connected' },
      facebook_disconnected: { pt: 'Facebook Desconectado', en: 'Facebook Disconnected' }
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
              <SelectItem value="subscription_created">{isPortuguese ? 'Assinatura Criada' : 'Subscription Created'}</SelectItem>
              <SelectItem value="subscription_plan_changed">{isPortuguese ? 'Plano Alterado' : 'Plan Changed'}</SelectItem>
              <SelectItem value="user_created">{isPortuguese ? 'Usuário Criado' : 'User Created'}</SelectItem>
              <SelectItem value="user_updated">{isPortuguese ? 'Usuário Atualizado' : 'User Updated'}</SelectItem>
              <SelectItem value="user_plan_updated">{isPortuguese ? 'Plano do Usuário Atualizado' : 'User Plan Updated'}</SelectItem>
              <SelectItem value="user_status_updated">{isPortuguese ? 'Status do Usuário Atualizado' : 'User Status Updated'}</SelectItem>
              <SelectItem value="admin_action">{isPortuguese ? 'Ação de Admin' : 'Admin Action'}</SelectItem>
              <SelectItem value="admin_force_status">{isPortuguese ? 'Admin Forçou Status' : 'Admin Force Status'}</SelectItem>
              <SelectItem value="admin_role_added">{isPortuguese ? 'Role de Admin Adicionado' : 'Admin Role Added'}</SelectItem>
              <SelectItem value="admin_role_removed">{isPortuguese ? 'Role de Admin Removido' : 'Admin Role Removed'}</SelectItem>
              <SelectItem value="ticket_created">{isPortuguese ? 'Ticket Criado' : 'Ticket Created'}</SelectItem>
              <SelectItem value="ticket_updated">{isPortuguese ? 'Ticket Atualizado' : 'Ticket Updated'}</SelectItem>
              <SelectItem value="ticket_resolved">{isPortuguese ? 'Ticket Resolvido' : 'Ticket Resolved'}</SelectItem>
              <SelectItem value="ticket_reopened">{isPortuguese ? 'Ticket Reaberto' : 'Ticket Reopened'}</SelectItem>
              <SelectItem value="ticket_assigned">{isPortuguese ? 'Ticket Atribuído' : 'Ticket Assigned'}</SelectItem>
              <SelectItem value="ticket_reassigned">{isPortuguese ? 'Ticket Reatribuído' : 'Ticket Reassigned'}</SelectItem>
              <SelectItem value="ticket_message_added">{isPortuguese ? 'Mensagem Adicionada' : 'Message Added'}</SelectItem>
              <SelectItem value="ticket_priority_changed">{isPortuguese ? 'Prioridade Alterada' : 'Priority Changed'}</SelectItem>
              <SelectItem value="ticket_notes_updated">{isPortuguese ? 'Notas Atualizadas' : 'Notes Updated'}</SelectItem>
              <SelectItem value="ticket_deleted">{isPortuguese ? 'Ticket Eliminado' : 'Ticket Deleted'}</SelectItem>
              <SelectItem value="campaign_created">{isPortuguese ? 'Campanha Criada' : 'Campaign Created'}</SelectItem>
              <SelectItem value="campaign_updated">{isPortuguese ? 'Campanha Atualizada' : 'Campaign Updated'}</SelectItem>
              <SelectItem value="campaign_deleted">{isPortuguese ? 'Campanha Eliminada' : 'Campaign Deleted'}</SelectItem>
              <SelectItem value="product_created">{isPortuguese ? 'Produto Criado' : 'Product Created'}</SelectItem>
              <SelectItem value="product_updated">{isPortuguese ? 'Produto Atualizado' : 'Product Updated'}</SelectItem>
              <SelectItem value="product_deleted">{isPortuguese ? 'Produto Eliminado' : 'Product Deleted'}</SelectItem>
              <SelectItem value="shopify_connected">{isPortuguese ? 'Shopify Conectado' : 'Shopify Connected'}</SelectItem>
              <SelectItem value="shopify_disconnected">{isPortuguese ? 'Shopify Desconectado' : 'Shopify Disconnected'}</SelectItem>
              <SelectItem value="facebook_connected">{isPortuguese ? 'Facebook Conectado' : 'Facebook Connected'}</SelectItem>
              <SelectItem value="facebook_disconnected">{isPortuguese ? 'Facebook Desconectado' : 'Facebook Disconnected'}</SelectItem>
              <SelectItem value="integration_created">{isPortuguese ? 'Integração Criada' : 'Integration Created'}</SelectItem>
              <SelectItem value="integration_updated">{isPortuguese ? 'Integração Atualizada' : 'Integration Updated'}</SelectItem>
              <SelectItem value="integration_deleted">{isPortuguese ? 'Integração Eliminada' : 'Integration Deleted'}</SelectItem>
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
                      {/* Informação simplificada - apenas quem criou */}
                      {(() => {
                        const userId = log.user_id || (log.event_data as any)?.created_by || null;
                        if (userId) {
                          const displayName = log.user?.full_name || log.user?.email || `ID: ${userId.substring(0, 8)}...`;
                          return (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{isPortuguese ? 'Por:' : 'By:'}</span>
                              <button
                                onClick={() => navigate(`/admin/users?userId=${userId}`)}
                                className="text-xs text-primary hover:underline"
                                title={userId}
                              >
                                {displayName}
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })()}
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                      locale: isPortuguese ? pt : enUS
                    })}
                  </span>
                </div>
                
                  {/* Indicador de comentário (pequeno) */}
                  {log.comment && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span>{isPortuguese ? 'Tem comentário' : 'Has comment'}</span>
                    </div>
                  )}
                
                  {/* Detalhes completos em um único lugar */}
                  {log.event_data && Object.keys(log.event_data).length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-primary hover:underline font-medium">
                        {isPortuguese ? 'Ver detalhes' : 'View details'}
                      </summary>
                      <div className="mt-2 space-y-2 p-3 bg-muted/50 rounded border">
                        {/* Mudança de estado */}
                {log.old_state && log.new_state && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs">{isPortuguese ? 'Mudança:' : 'Change:'}</span>
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 text-xs">
                      {log.old_state}
                    </Badge>
                    <span>→</span>
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 text-xs">
                      {log.new_state}
                    </Badge>
                  </div>
                )}

                        {/* Informações de admin action */}
                        {(log.event_type === 'admin_force_status' && log.event_data) && (
                          <div className="space-y-1.5">
                            <p className="font-semibold text-sm mb-2 text-purple-600 dark:text-purple-400">
                              {isPortuguese ? 'Ação Administrativa' : 'Admin Action'}
                            </p>
                            {log.event_data.admin_email && (
                              <div className="text-xs">
                                <span className="font-medium">{isPortuguese ? 'Admin:' : 'Admin:'}</span>{' '}
                                {log.event_data.admin_email}
                              </div>
                            )}
                            {log.event_data.old_state && log.event_data.new_state && (
                              <div className="text-xs">
                                <span className="font-medium">{isPortuguese ? 'Mudança forçada:' : 'Forced change:'}</span>{' '}
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 text-xs">
                                  {String(log.event_data.old_state)}
                                </Badge>
                                <span> → </span>
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 text-xs">
                                  {String(log.event_data.new_state)}
                                </Badge>
                              </div>
                            )}
                            {log.event_data.reason && (
                              <div className="text-xs">
                                <span className="font-medium">{isPortuguese ? 'Motivo:' : 'Reason:'}</span>{' '}
                                {String(log.event_data.reason)}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Informações do ticket */}
                        {(log.event_type.startsWith('ticket_') && log.event_data?.ticket_id) && (
                          <div className="space-y-1.5">
                            <p className="font-semibold text-sm mb-2">
                              {isPortuguese ? 'Informações do Ticket' : 'Ticket Information'}
                              {log.event_type === 'ticket_deleted' && (
                                <span className="ml-2 text-red-600 dark:text-red-400">({isPortuguese ? 'ELIMINADO' : 'DELETED'})</span>
                              )}
                            </p>
                            
                            {(() => {
                              const userId = log.user_id || (log.event_data as any)?.created_by || null;
                              if (userId) {
                                const displayName = log.user?.full_name || log.user?.email || `ID: ${userId.substring(0, 12)}...`;
                                return (
                                  <div className="text-xs">
                                    <span className="font-medium">{isPortuguese ? 'Criado por:' : 'Created by:'}</span>{' '}
                                    <button
                                      onClick={() => navigate(`/admin/users?userId=${userId}`)}
                                      className="text-primary hover:underline"
                                      title={userId}
                                    >
                                      {displayName}
                                    </button>
                                    {!log.user?.email && !log.user?.full_name && (
                                      <span className="text-muted-foreground ml-1">({isPortuguese ? 'ID:' : 'ID:'} {userId.substring(0, 8)}...)</span>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <div className="text-xs text-red-600 dark:text-red-400">
                                  {isPortuguese ? '⚠️ Sem user_id' : '⚠️ No user_id'}
                                </div>
                              );
                            })()}
                            
                            {log.event_data.deleted_by && (
                              <div className="text-xs">
                                <span className="font-medium text-red-600 dark:text-red-400">{isPortuguese ? 'Eliminado por:' : 'Deleted by:'}</span>{' '}
                                <code className="text-xs bg-red-500/20 px-1 py-0.5 rounded">Admin: {String(log.event_data.deleted_by).substring(0, 8)}...</code>
                              </div>
                            )}
                            
                            {log.event_data.ticket_id && (
                              <div className="text-xs">
                                <span className="font-medium">{isPortuguese ? 'Ticket ID:' : 'Ticket ID:'}</span>{' '}
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">{log.event_data.ticket_id.substring(0, 8)}...</code>
                              </div>
                            )}
                            {log.event_data.category && (
                              <div className="text-xs">
                                <span className="font-medium">{isPortuguese ? 'Categoria:' : 'Category:'}</span>{' '}
                                {String(log.event_data.category)}
                              </div>
                            )}
                            {log.event_data.language && (
                              <div className="text-xs">
                                <span className="font-medium">{isPortuguese ? 'Idioma:' : 'Language:'}</span>{' '}
                                {String(log.event_data.language).toUpperCase()}
                              </div>
                            )}
                            {log.event_data.status && (
                              <div className="text-xs">
                                <span className="font-medium">{isPortuguese ? 'Status:' : 'Status:'}</span>{' '}
                                {String(log.event_data.status)}
                              </div>
                            )}
                            {log.event_data.message_count !== undefined && (
                              <div className="text-xs">
                                <span className="font-medium">{isPortuguese ? 'Mensagens:' : 'Messages:'}</span>{' '}
                                {log.event_data.message_count}
                              </div>
                            )}
                            {log.event_data.admin_id && (
                              <div className="text-xs">
                                <span className="font-medium">{isPortuguese ? 'Atribuído a:' : 'Assigned to:'}</span>{' '}
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">Admin: {log.event_data.admin_id.substring(0, 8)}...</code>
                              </div>
                            )}
                            {log.event_data.deleted_at && (
                              <div className="text-xs">
                                <span className="font-medium text-red-600 dark:text-red-400">{isPortuguese ? 'Eliminado em:' : 'Deleted at:'}</span>{' '}
                                {new Date(log.event_data.deleted_at).toLocaleString()}
                              </div>
                            )}
                            {log.event_data.previous_status && log.event_data.new_status && (
                              <div className="text-xs">
                                <span className="font-medium">{isPortuguese ? 'Mudança de status:' : 'Status change:'}</span>{' '}
                                {String(log.event_data.previous_status)} → {String(log.event_data.new_status)}
                              </div>
                            )}
                            {log.event_data.previous_priority && log.event_data.new_priority && (
                              <div className="text-xs">
                                <span className="font-medium">{isPortuguese ? 'Mudança de prioridade:' : 'Priority change:'}</span>{' '}
                                {String(log.event_data.previous_priority)} → {String(log.event_data.new_priority)}
                              </div>
                            )}
                            {log.event_data.previous_admin_id && log.event_data.new_admin_id && (
                              <div className="text-xs">
                                <span className="font-medium">{isPortuguese ? 'Reatribuição:' : 'Reassignment:'}</span>{' '}
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">Admin: {String(log.event_data.previous_admin_id).substring(0, 8)}...</code>
                                <span> → </span>
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">Admin: {String(log.event_data.new_admin_id).substring(0, 8)}...</code>
                              </div>
                            )}
                            {log.event_data.notes_changed && (
                              <div className="text-xs">
                                <span className="font-medium">{isPortuguese ? 'Notas:' : 'Notes:'}</span>{' '}
                                {log.event_data.has_notes ? (isPortuguese ? 'Atualizadas' : 'Updated') : (isPortuguese ? 'Removidas' : 'Removed')}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Comentário */}
                        {log.comment && (
                          <div className="text-xs">
                            <span className="font-medium">{isPortuguese ? 'Comentário:' : 'Comment:'}</span>
                            <p className="mt-1 text-muted-foreground">{log.comment}</p>
                          </div>
                        )}
                        
                        {/* Dados brutos do evento */}
                        <div className="mt-2 pt-2 border-t">
                          <p className="font-medium text-xs mb-1">{isPortuguese ? 'Dados do evento:' : 'Event data:'}</p>
                          <pre className="text-xs p-2 bg-muted rounded overflow-x-auto max-h-40 overflow-y-auto">
                            {JSON.stringify(log.event_data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </details>
                  )}
                  
                  {/* Se não tiver event_data mas tiver outras informações */}
                  {(!log.event_data || Object.keys(log.event_data).length === 0) && (log.old_state || log.new_state || log.comment) && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-primary hover:underline font-medium">
                        {isPortuguese ? 'Ver detalhes' : 'View details'}
                      </summary>
                      <div className="mt-2 space-y-2 p-3 bg-muted/50 rounded border">
                        {log.old_state && log.new_state && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs">{isPortuguese ? 'Mudança:' : 'Change:'}</span>
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 text-xs">
                              {log.old_state}
                            </Badge>
                            <span>→</span>
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 text-xs">
                              {log.new_state}
                            </Badge>
                          </div>
                        )}
                        {log.comment && (
                          <div className="text-xs">
                            <span className="font-medium">{isPortuguese ? 'Comentário:' : 'Comment:'}</span>
                            <p className="mt-1 text-muted-foreground">{log.comment}</p>
                          </div>
                        )}
                      </div>
                    </details>
                )}

                  <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {log.ip_address && (
                        <span title={log.ip_address}>IP: {log.ip_address.substring(0, 15)}...</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openCommentDialog(log)}
                      className="text-xs"
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
