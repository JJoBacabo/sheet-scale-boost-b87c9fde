import { useState, useEffect, useRef } from 'react';
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
    email?: string;
  };
}

export const useAdminSupport = (currentAdminId?: string) => {
  const [tickets, setTickets] = useState<SupportChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'waiting' | 'resolved' | 'mine'>('all');
  const { toast } = useToast();
  
  // Cache for profiles to avoid repeated fetches - use useRef for mutable cache
  const profileCacheRef = useRef<Map<string, { user_id: string; full_name?: string | null; email?: string | null }>>(new Map());

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

  // Helper function to fetch profile with email (with caching)
  const fetchProfileWithEmail = async (userId: string) => {
      // Check cache first
      const cached = profileCacheRef.current.get(userId);
      if (cached) {
        return cached;
      }

    try {
      // Fetch profile (may not exist, that's ok)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('user_id', userId)
        .maybeSingle();
      
      // If profile doesn't exist, that's ok - we'll try to get email
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      // Always try to get email from get-users edge function
      let email: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: usersData, error: usersError } = await supabase.functions.invoke('get-users', {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });

          if (!usersError && usersData?.users) {
            const user = usersData.users.find((u: any) => u.id === userId);
            email = user?.email || null;
          }
        }
      } catch (error) {
        console.error('Error fetching email:', error);
      }

      // Return profile with email, or just email if no profile exists
      let result = null;
      if (profile) {
        result = { ...profile, email };
      } else if (email) {
        // If no profile but we have email, return a minimal profile object
        result = { user_id: userId, full_name: null, email };
      }
      
      // Cache the result
      if (result) {
        profileCacheRef.current.set(userId, result);
      }
      
      return result;
    } catch (error) {
      // Profile might not exist, try to get at least the email
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: usersData, error: usersError } = await supabase.functions.invoke('get-users', {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });

          if (!usersError && usersData?.users) {
            const user = usersData.users.find((u: any) => u.id === userId);
            if (user?.email) {
              const result = { user_id: userId, full_name: null, email: user.email };
              profileCacheRef.current.set(userId, result);
              return result;
            }
          }
        }
      } catch (emailError) {
        console.error('Error fetching email as fallback:', emailError);
      }
      return null;
    }
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
          .in('user_id', userIds)
          .limit(1000); // Add limit to avoid timeout
        
        if (!profilesError && profilesData) {
          profiles = profilesData;
        } else if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Fetch user emails from auth (only if we have session)
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Use edge function to get user emails
            const { data: usersData, error: usersError } = await supabase.functions.invoke('get-users', {
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            });

            if (!usersError && usersData?.users) {
              // Map emails to existing profiles
              profiles = profiles.map(profile => {
                const user = usersData.users.find((u: any) => u.id === profile.user_id);
                return {
                  ...profile,
                  email: user?.email || null
                };
              });

              // Add profiles for users that don't have a profile entry but exist in auth
              const existingProfileIds = new Set(profiles.map(p => p.user_id));
              const missingProfiles = userIds
                .filter(id => !existingProfileIds.has(id))
                .map(userId => {
                  const user = usersData.users.find((u: any) => u.id === userId);
                  return user ? {
                    user_id: userId,
                    full_name: null,
                    email: user.email || null
                  } : null;
                })
                .filter(Boolean);
              
              profiles = [...profiles, ...missingProfiles];
            }
          }
        } catch (error) {
          console.error('Error fetching user emails:', error);
          // Continue without emails if this fails
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
          messages = chat.messages.filter((msg: any) => 
            msg && typeof msg === 'object' && msg.id && (msg.content || msg.message)
          );
        }

        const profile = profiles.find(p => p.user_id === chat.user_id);
        
        // Cache the profile for future use
        if (profile) {
          profileCacheRef.current.set(chat.user_id, profile);
        }

        return {
          ...chat,
          status: validStatus as 'active' | 'waiting' | 'resolved',
          messages,
          notes: chat.notes || undefined,
          profiles: profile
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
              // Fetch profile with email for updated ticket
              const updatedTicket = payload.new as any;
              if (updatedTicket.user_id) {
                const profile = await fetchProfileWithEmail(updatedTicket.user_id);
                
                // Normalize status
                const normalizedStatus = normalizeStatus(updatedTicket.status);
                const validStatus = isValidStatus(normalizedStatus) ? normalizedStatus : 'waiting';
                
                // Validate messages
                let messages = [];
                if (Array.isArray(updatedTicket.messages)) {
                  messages = updatedTicket.messages.filter((msg: any) => 
                    msg && typeof msg === 'object' && msg.id && (msg.content || msg.message)
                  );
                }
                
                const ticketWithProfile: SupportChat = {
                  ...updatedTicket,
                  status: validStatus as 'active' | 'waiting' | 'resolved',
                  messages,
                  priority: updatedTicket.priority || undefined,
                  notes: updatedTicket.notes || undefined,
                  profiles: profile || undefined
                };
                
                // Update the specific ticket in state
                setTickets(prev => {
                  const index = prev.findIndex(t => t.id === ticketWithProfile.id);
                  if (index !== -1) {
                    const newTickets = [...prev];
                    newTickets[index] = ticketWithProfile;
                    return newTickets;
                  } else {
                    // Ticket might have been deleted and recreated, add it
                    return [ticketWithProfile, ...prev];
                  }
                });
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setTickets(prev => prev.filter(t => t.id !== deletedId));
              toast({
                title: 'Ticket eliminado',
                description: 'O ticket foi eliminado'
              });
            }
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

      // Get fresh ticket data from database to avoid stale state
      const { data: ticketData, error: fetchError } = await supabase
        .from('support_chats')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (fetchError || !ticketData) {
        throw new Error('Ticket not found');
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

      // Use messages from database, not local state
      const existingMessages = Array.isArray(ticketData.messages) 
        ? ticketData.messages.filter((msg: any) => msg && typeof msg === 'object' && msg.id && msg.content)
        : [];

      // Check if message already exists (avoid duplicates) - improved check
      const trimmedMessage = message.trim();
      const now = Date.now();
      const messageExists = existingMessages.some((msg: any) => {
        if (msg.type !== 'admin') return false;
        if (msg.content !== trimmedMessage) return false;
        
        try {
          const msgTime = new Date(msg.timestamp).getTime();
          // Check if message was sent in the last 10 seconds
          return !isNaN(msgTime) && (now - msgTime) < 10000;
        } catch {
          return false;
        }
      });

      if (messageExists) {
        console.warn('Message already exists, skipping duplicate');
        toast({
          title: 'Mensagem duplicada',
          description: 'Esta mensagem já foi enviada recentemente',
          variant: 'default'
        });
        return null;
      }

      const updatedMessages = [...existingMessages, newMessage];

      // Determine status: if resolved, keep resolved; otherwise set to active
      const currentStatus = normalizeStatus(ticketData.status);
      const newStatus = currentStatus === 'resolved' ? 'resolved' : 'active';

      // Only update admin_id if not already set
      const updateData: any = {
        messages: updatedMessages,
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Only set admin_id if not already assigned
      if (!ticketData.admin_id) {
        updateData.admin_id = adminId;
      }

      const { data: updatedChat, error } = await supabase
        .from('support_chats')
        .update(updateData)
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;

      // Update local state immediately
      if (updatedChat) {
        // Fetch profile with email for updated ticket
        const profile = await fetchProfileWithEmail(updatedChat.user_id);

        const normalizedStatus = normalizeStatus(updatedChat.status);
        const validStatus = isValidStatus(normalizedStatus) ? normalizedStatus : 'waiting';
        
        const validatedMessages = Array.isArray(updatedChat.messages) 
          ? updatedChat.messages.filter((msg: any) => 
              msg && typeof msg === 'object' && msg.id && msg.content
            )
          : [];

        const ticketWithProfile: SupportChat = {
          ...updatedChat,
          status: validStatus as 'active' | 'waiting' | 'resolved',
          messages: validatedMessages,
          profiles: profile || undefined
        };

        // Update ticket in local state immediately
        setTickets(prev => {
          const index = prev.findIndex(t => t.id === ticketId);
          if (index !== -1) {
            const newTickets = [...prev];
            newTickets[index] = ticketWithProfile;
            return newTickets;
          }
          return prev;
        });
      }

      toast({
        title: 'Mensagem enviada',
        description: 'A sua mensagem foi enviada com sucesso'
      });
      
      // Find and return the updated ticket from state
      const updatedTicket = tickets.find(t => t.id === ticketId);
      return updatedTicket || null;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao enviar mensagem',
        variant: 'destructive'
      });
      return null;
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

      // Get fresh ticket data from database
      const { data: ticketData, error: fetchError } = await supabase
        .from('support_chats')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (fetchError || !ticketData) {
        throw new Error('Ticket not found');
      }

      // Check if already assigned to this admin
      if (ticketData.admin_id === adminId) {
        console.log('Ticket already assigned to this admin');
        return;
      }

      // Get admin profile name
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', adminId)
        .single();

      const adminDisplayName = adminProfile?.full_name || adminName || 'Admin';

      // Use messages from database, not local state
      const existingMessages = Array.isArray(ticketData.messages) 
        ? ticketData.messages.filter((msg: any) => 
            msg && typeof msg === 'object' && msg.id && msg.content
          )
        : [];

      // Check if notification message already exists - improved check
      const notificationExists = existingMessages.some((msg: any) => {
        if (msg.type !== 'bot') return false;
        const content = msg.content || '';
        // Check for various forms of the notification
        return content.includes('ajudar') || 
               content.includes('tentando ajudar') ||
               content.includes(adminDisplayName);
      });

      let updatedMessages = existingMessages;
      if (!notificationExists) {
        // Add notification message to user
        const notificationMessage = {
          id: crypto.randomUUID(),
          type: 'bot',
          content: `🎯 ${adminDisplayName} está agora a tentar ajudar com o seu pedido.`,
          timestamp: new Date().toISOString()
        };
        updatedMessages = [...existingMessages, notificationMessage];
      }

      const { data: updatedTicket, error } = await supabase
        .from('support_chats')
        .update({
          admin_id: adminId,
          status: 'active',
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;

      // Update local state immediately
      if (updatedTicket) {
        // Fetch profile with email for updated ticket
        const profile = await fetchProfileWithEmail(updatedTicket.user_id);

        const normalizedStatus = normalizeStatus(updatedTicket.status);
        const validStatus = isValidStatus(normalizedStatus) ? normalizedStatus : 'waiting';
        
        const validatedMessages = Array.isArray(updatedTicket.messages) 
          ? updatedTicket.messages.filter((msg: any) => 
              msg && typeof msg === 'object' && msg.id && msg.content
            )
          : [];

        const ticketWithProfile: SupportChat = {
          ...updatedTicket,
          status: validStatus as 'active' | 'waiting' | 'resolved',
          messages: validatedMessages,
          profiles: profile || undefined
        };

        // Update ticket in local state immediately
        setTickets(prev => {
          const index = prev.findIndex(t => t.id === ticketId);
          if (index !== -1) {
            const newTickets = [...prev];
            newTickets[index] = ticketWithProfile;
            return newTickets;
          } else {
            // Ticket not in list, add it
            return [ticketWithProfile, ...prev];
          }
        });
      }

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
      // Get fresh ticket data from database
      const { data: ticketData, error: fetchError } = await supabase
        .from('support_chats')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (fetchError || !ticketData) {
        throw new Error('Ticket not found');
      }

      const { data: updatedTicket, error } = await supabase
        .from('support_chats')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;

      // Update local state immediately
      if (updatedTicket) {
        // Fetch profile with email for updated ticket
        const profile = await fetchProfileWithEmail(updatedTicket.user_id);

        const normalizedStatus = normalizeStatus(updatedTicket.status);
        const validStatus = isValidStatus(normalizedStatus) ? normalizedStatus : 'waiting';
        
        const validatedMessages = Array.isArray(updatedTicket.messages) 
          ? updatedTicket.messages.filter((msg: any) => 
              msg && typeof msg === 'object' && msg.id && msg.content
            )
          : [];

        const ticketWithProfile: SupportChat = {
          ...updatedTicket,
          status: validStatus as 'active' | 'waiting' | 'resolved',
          messages: validatedMessages,
          profiles: profile || undefined
        };

        // Update ticket in local state immediately
        setTickets(prev => {
          const index = prev.findIndex(t => t.id === ticketId);
          if (index !== -1) {
            const newTickets = [...prev];
            newTickets[index] = ticketWithProfile;
            return newTickets;
          }
          return prev;
        });

        // Return the updated ticket so it can be used to update selectedTicket
        return ticketWithProfile;
      }

      toast({
        title: 'Ticket resolved',
        description: 'Ticket marked as resolved'
      });
      return null;
    } catch (error: any) {
      console.error('Error resolving ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to resolve ticket',
        variant: 'destructive'
      });
      return null;
    }
  };

  const reopenTicket = async (ticketId: string) => {
    try {
      // Get fresh ticket data from database
      const { data: ticketData, error: fetchError } = await supabase
        .from('support_chats')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (fetchError || !ticketData) {
        throw new Error('Ticket not found');
      }

      const { data: updatedTicket, error } = await supabase
        .from('support_chats')
        .update({
          status: 'active',
          resolved_at: null, // Clear resolved_at when reopening
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;

      // Update local state immediately
      if (updatedTicket) {
        // Fetch profile with email for updated ticket
        const profile = await fetchProfileWithEmail(updatedTicket.user_id);

        const normalizedStatus = normalizeStatus(updatedTicket.status);
        const validStatus = isValidStatus(normalizedStatus) ? normalizedStatus : 'waiting';
        
        const validatedMessages = Array.isArray(updatedTicket.messages) 
          ? updatedTicket.messages.filter((msg: any) => 
              msg && typeof msg === 'object' && msg.id && msg.content
            )
          : [];

        const ticketWithProfile: SupportChat = {
          ...updatedTicket,
          status: validStatus as 'active' | 'waiting' | 'resolved',
          messages: validatedMessages,
          profiles: profile || undefined
        };

        // Update ticket in local state immediately
        setTickets(prev => {
          const index = prev.findIndex(t => t.id === ticketId);
          if (index !== -1) {
            const newTickets = [...prev];
            newTickets[index] = ticketWithProfile;
            return newTickets;
          }
          return prev;
        });

        // Return the updated ticket so it can be used to update selectedTicket
        return ticketWithProfile;
      }

      toast({
        title: 'Ticket reopened',
        description: 'Ticket has been reopened'
      });
      return null;
    } catch (error: any) {
      console.error('Error reopening ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reopen ticket',
        variant: 'destructive'
      });
      return null;
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

      const { data: updatedTicket, error } = await supabase
        .from('support_chats')
        .update({
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;

      // Update local state immediately
      if (updatedTicket) {
        setTickets(prev => {
          const index = prev.findIndex(t => t.id === ticketId);
          if (index !== -1) {
            const newTickets = [...prev];
            newTickets[index] = {
              ...newTickets[index],
              notes: updatedTicket.notes || undefined
            };
            return newTickets;
          }
          return prev;
        });
      }

      toast({
        title: 'Notas atualizadas',
        description: 'As notas foram atualizadas com sucesso'
      });
    } catch (error: any) {
      console.error('Error updating notes:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update notes',
        variant: 'destructive'
      });
    }
  };

  const updatePriority = async (ticketId: string, priority: 'low' | 'medium' | 'high' | 'urgent') => {
    try {
      // Validate priority
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        throw new Error('Invalid priority value');
      }

      // Verify ticket exists - use maybeSingle to avoid 400 errors
      const { data: ticketData, error: fetchError } = await supabase
        .from('support_chats')
        .select('id, priority')
        .eq('id', ticketId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching ticket for priority update:', fetchError);
        throw new Error(`Failed to fetch ticket: ${fetchError.message}`);
      }

      if (!ticketData) {
        throw new Error('Ticket not found');
      }

      const { data: updatedTicket, error } = await supabase
        .from('support_chats')
        .update({ 
          priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select('id, priority, updated_at')
        .single();

      if (error) {
        console.error('Error updating priority:', error);
        throw error;
      }

      // Update local state immediately and get the updated ticket
      let updatedTicketWithProfile: SupportChat | null = null;
      if (updatedTicket) {
        // Find the current ticket in state to preserve profile and other data
        const currentTicket = tickets.find(t => t.id === ticketId);
        
        if (currentTicket) {
          updatedTicketWithProfile = currentTicket;
        }
      }

      return updatedTicketWithProfile;
    } catch (error: any) {
      console.error('Error updating priority:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update priority',
        variant: 'destructive'
      });
      return null;
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

      // Update local state immediately
      setTickets(prev => prev.filter(t => t.id !== ticketId));

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
    updatePriority,
    deleteTicket
  };
};
