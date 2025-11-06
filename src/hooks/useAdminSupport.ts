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
    const cleanup = setupRealtimeSubscription();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Helper function to normalize status
  const normalizeStatus = (status: string | null | undefined): string => {
    if (!status) return 'waiting'; // Default to waiting if null
    return status.toLowerCase().trim();
  };

  // Helper function to validate status
  const isValidStatus = (status: string): boolean => {
    const normalized = normalizeStatus(status);
    return ['active', 'waiting', 'resolved'].includes(normalized);
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_chats')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1000); // Add pagination limit

      if (error) throw error;

      // Fetch user profiles separately with error handling
      const userIds = [...new Set((data || []).map(chat => chat.user_id).filter(Boolean))];
      let profiles: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        if (!profilesError && profilesData) {
          profiles = profilesData;
        } else if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }
      }

      // Merge profiles with chats, validate messages, and normalize status
      const ticketsWithProfiles = (data || []).map(chat => {
        // Validate and normalize status
        const normalizedStatus = normalizeStatus(chat.status);
        const validStatus = isValidStatus(normalizedStatus) ? normalizedStatus : 'waiting';
        
        // Ensure messages is always an array and validate structure
        let messages = [];
        if (Array.isArray(chat.messages)) {
          messages = chat.messages.filter(msg => 
            msg && typeof msg === 'object' && msg.id && msg.content
          );
        }

        return {
          ...chat,
          status: validStatus as 'active' | 'waiting' | 'resolved',
          messages,
          profiles: profiles.find(p => p.user_id === chat.user_id)
        };
      });

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
        async (payload) => {
          console.log('🔔 Admin Realtime update:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (payload.eventType === 'INSERT') {
              toast({
                title: '🔔 Novo ticket',
                description: 'Um novo ticket de suporte foi criado'
              });
              // Fetch fresh data to get profiles
              await fetchTickets();
            } else if (payload.eventType === 'UPDATE') {
              // Fetch profile for updated ticket
              const updatedTicket = payload.new as any;
              if (updatedTicket.user_id) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('user_id, full_name')
                  .eq('user_id', updatedTicket.user_id)
                  .single();
                
                // Normalize status
                const normalizedStatus = normalizeStatus(updatedTicket.status);
                const validStatus = isValidStatus(normalizedStatus) ? normalizedStatus : 'waiting';
                
                // Validate messages
                let messages = [];
                if (Array.isArray(updatedTicket.messages)) {
                  messages = updatedTicket.messages.filter((msg: any) => 
                    msg && typeof msg === 'object' && msg.id && msg.content
                  );
                }
                
                const ticketWithProfile: SupportChat = {
                  ...updatedTicket,
                  status: validStatus as 'active' | 'waiting' | 'resolved',
                  messages,
                  profiles: profile || undefined
                };
                
                // Update the specific ticket in state
                setTickets(prev => {
                  const index = prev.findIndex(t => t.id === ticketWithProfile.id);
                  if (index !== -1) {
                    const newTickets = [...prev];
                    newTickets[index] = ticketWithProfile;
                    return newTickets;
                  }
                  return prev;
                });
              }
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
      // Validate inputs
      if (!ticketId || !message?.trim() || !adminId) {
        throw new Error('Invalid input parameters');
      }

      // Verify ticket exists in database
      const { data: ticketData, error: fetchError } = await supabase
        .from('support_chats')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (fetchError || !ticketData) {
        throw new Error('Ticket not found');
      }

      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) {
        // Ticket exists in DB but not in local state, fetch it
        await fetchTickets();
        return;
      }

      // Validate message structure
      if (!message.trim()) {
        throw new Error('Message cannot be empty');
      }

      const newMessage = {
        id: crypto.randomUUID(),
        type: 'admin',
        content: message.trim(),
        timestamp: new Date().toISOString()
      };

      // Validate existing messages
      const existingMessages = Array.isArray(ticket.messages) 
        ? ticket.messages.filter((msg: any) => msg && typeof msg === 'object' && msg.id)
        : [];

      const updatedMessages = [...existingMessages, newMessage];

      // Determine status: if resolved, keep resolved; otherwise set to active
      const currentStatus = normalizeStatus(ticket.status);
      const newStatus = currentStatus === 'resolved' ? 'resolved' : 'active';

      const { error } = await supabase
        .from('support_chats')
        .update({
          messages: updatedMessages,
          admin_id: adminId,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Mensagem enviada',
        description: 'A sua mensagem foi enviada com sucesso'
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao enviar mensagem',
        variant: 'destructive'
      });
    }
  };

  const assignTicket = async (ticketId: string, adminId: string, adminName?: string) => {
    try {
      // Validate inputs
      if (!ticketId || !adminId) {
        throw new Error('Invalid ticket or admin ID');
      }

      // Verify admin exists (optional check)
      const { data: adminCheck } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', adminId)
        .eq('role', 'admin')
        .single();

      if (!adminCheck) {
        console.warn('Warning: User may not be an admin');
      }

      // Verify ticket exists
      const { data: ticketData, error: fetchError } = await supabase
        .from('support_chats')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (fetchError || !ticketData) {
        throw new Error('Ticket not found');
      }

      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) {
        await fetchTickets();
        return;
      }

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

      // Validate existing messages
      const existingMessages = Array.isArray(ticket.messages) 
        ? ticket.messages.filter((msg: any) => msg && typeof msg === 'object' && msg.id)
        : [];

      const updatedMessages = [...existingMessages, notificationMessage];

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
    } catch (error: any) {
      console.error('Error assigning ticket:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao atribuir ticket',
        variant: 'destructive'
      });
    }
  };

  const markAsResolved = async (ticketId: string) => {
    try {
      // Verify ticket exists
      const { data: ticketData, error: fetchError } = await supabase
        .from('support_chats')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (fetchError || !ticketData) {
        throw new Error('Ticket not found');
      }

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
    } catch (error: any) {
      console.error('Error resolving ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to resolve ticket',
        variant: 'destructive'
      });
    }
  };

  const reopenTicket = async (ticketId: string) => {
    try {
      // Verify ticket exists
      const { data: ticketData, error: fetchError } = await supabase
        .from('support_chats')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (fetchError || !ticketData) {
        throw new Error('Ticket not found');
      }

      const { error } = await supabase
        .from('support_chats')
        .update({
          status: 'active',
          resolved_at: null, // Clear resolved_at when reopening
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Ticket reopened',
        description: 'Ticket has been reopened'
      });
    } catch (error: any) {
      console.error('Error reopening ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reopen ticket',
        variant: 'destructive'
      });
    }
  };

  const updateNotes = async (ticketId: string, notes: string) => {
    try {
      // Verify ticket exists
      const { data: ticketData, error: fetchError } = await supabase
        .from('support_chats')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (fetchError || !ticketData) {
        throw new Error('Ticket not found');
      }

      const { error } = await supabase
        .from('support_chats')
        .update({
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating notes:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update notes',
        variant: 'destructive'
      });
    }
  };

  const deleteTicket = async (ticketId: string) => {
    try {
      // Verify ticket exists before deleting
      const { data: ticketData, error: fetchError } = await supabase
        .from('support_chats')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (fetchError || !ticketData) {
        throw new Error('Ticket not found');
      }

      const { error } = await supabase
        .from('support_chats')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Ticket deleted',
        description: 'Ticket has been deleted'
      });
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete ticket',
        variant: 'destructive'
      });
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const normalizedStatus = normalizeStatus(ticket.status);
    if (filter === 'all') return true;
    if (filter === 'waiting') return normalizedStatus === 'waiting';
    if (filter === 'active') return normalizedStatus === 'active';
    if (filter === 'resolved') return normalizedStatus === 'resolved';
    if (filter === 'mine') {
      // Only show non-resolved tickets in "mine" filter
      return ticket.admin_id === currentAdminId && normalizedStatus !== 'resolved';
    }
    return true;
  });

  // Calculate counts from ALL tickets, not filtered - with normalized status
  const ticketCounts = {
    all: tickets.length,
    active: tickets.filter(t => normalizeStatus(t.status) === 'active').length,
    waiting: tickets.filter(t => normalizeStatus(t.status) === 'waiting').length,
    resolved: tickets.filter(t => normalizeStatus(t.status) === 'resolved').length,
    mine: currentAdminId 
      ? tickets.filter(t => t.admin_id === currentAdminId && normalizeStatus(t.status) !== 'resolved').length 
      : 0
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
    reopenTicket,
    updateNotes,
    deleteTicket
  };
};
