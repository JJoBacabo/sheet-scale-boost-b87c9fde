import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SupportChat {
  id: string;
  user_id: string;
  admin_id?: string;
  category?: string;
  language: string;
  messages: any[];
  status: 'active' | 'waiting' | 'resolved';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  profiles?: {
    full_name?: string;
  };
}

export const useAdminSupport = (currentAdminId?: string) => {
  const [tickets, setTickets] = useState<SupportChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'waiting' | 'resolved' | 'mine'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
    setupRealtimeSubscription();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_chats')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set((data || []).map(chat => chat.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Merge profiles with chats and ensure messages is always an array
      const ticketsWithProfiles = (data || []).map(chat => ({
        ...chat,
        messages: Array.isArray(chat.messages) ? chat.messages : [],
        profiles: profiles?.find(p => p.user_id === chat.user_id)
      }));

      setTickets(ticketsWithProfiles as SupportChat[]);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tickets',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('support-chats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_chats'
        },
        (payload) => {
          console.log('🔔 Admin Realtime update:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Fetch fresh data
            fetchTickets();
            
            if (payload.eventType === 'INSERT') {
              toast({
                title: '🔔 Novo ticket',
                description: 'Um novo ticket de suporte foi criado'
              });
            } else if (payload.eventType === 'UPDATE') {
              // Update the specific ticket in state immediately
              const updatedTicket = payload.new as SupportChat;
              setTickets(prev => {
                const index = prev.findIndex(t => t.id === updatedTicket.id);
                if (index !== -1) {
                  const newTickets = [...prev];
                  newTickets[index] = updatedTicket;
                  return newTickets;
                }
                return prev;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setTickets(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (ticketId: string, message: string, adminId: string) => {
    try {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) return;

      const newMessage = {
        id: crypto.randomUUID(),
        type: 'admin',
        content: message,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...(Array.isArray(ticket.messages) ? ticket.messages : []), newMessage];

      const { error } = await supabase
        .from('support_chats')
        .update({
          messages: updatedMessages,
          admin_id: adminId,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Mensagem enviada',
        description: 'A sua mensagem foi enviada com sucesso'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao enviar mensagem',
        variant: 'destructive'
      });
    }
  };

  const assignTicket = async (ticketId: string, adminId: string, adminName?: string) => {
    try {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) return;

      // Get admin profile name
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', adminId)
        .single();

      const adminDisplayName = adminProfile?.full_name || adminName || 'Admin';

      // Add notification message to user
      const notificationMessage = {
        id: crypto.randomUUID(),
        type: 'bot',
        content: `🎯 ${adminDisplayName} está agora a tentar ajudar com o seu pedido.`,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...(Array.isArray(ticket.messages) ? ticket.messages : []), notificationMessage];

      const { error } = await supabase
        .from('support_chats')
        .update({
          admin_id: adminId,
          status: 'active',
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Ticket atribuído',
        description: `Ticket atribuído a ${adminDisplayName}`
      });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atribuir ticket',
        variant: 'destructive'
      });
    }
  };

  const markAsResolved = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_chats')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Ticket resolved',
        description: 'Ticket marked as resolved'
      });
    } catch (error) {
      console.error('Error resolving ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve ticket',
        variant: 'destructive'
      });
    }
  };

  const updateNotes = async (ticketId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('support_chats')
        .update({
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const deleteTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_chats')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Ticket deleted',
        description: 'Ticket has been deleted'
      });
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete ticket',
        variant: 'destructive'
      });
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    if (filter === 'waiting') return ticket.status === 'waiting';
    if (filter === 'active') return ticket.status === 'active';
    if (filter === 'resolved') return ticket.status === 'resolved';
    if (filter === 'mine') return ticket.admin_id === currentAdminId;
    return true;
  });

  // Calculate counts from ALL tickets, not filtered
  const ticketCounts = {
    all: tickets.length,
    active: tickets.filter(t => t.status === 'active').length,
    waiting: tickets.filter(t => t.status === 'waiting').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    mine: currentAdminId ? tickets.filter(t => t.admin_id === currentAdminId).length : 0
  };

  return {
    tickets: filteredTickets,
    allTickets: tickets,
    ticketCounts,
    loading,
    filter,
    setFilter,
    sendMessage,
    assignTicket,
    markAsResolved,
    updateNotes,
    deleteTicket
  };
};
