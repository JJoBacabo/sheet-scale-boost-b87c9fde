import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminSupport } from '@/hooks/useAdminSupport';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { TicketList } from '@/components/admin/TicketList';
import { ChatArea } from '@/components/admin/ChatArea';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { UserManagement } from '@/components/admin/UserManagement';
import { AdminManagement } from '@/components/admin/AdminManagement';
import { AuditLogs } from '@/components/admin/AuditLogs';
import { useLanguage } from '@/contexts/LanguageContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminSupport = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isPortuguese = language === 'pt';
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'tickets' | 'users' | 'admins' | 'logs'>('dashboard');
  const [sendingMessage, setSendingMessage] = useState(false);

  const {
    tickets,
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
  } = useAdminSupport(currentUser?.id);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Update selected ticket when tickets change - use a ref to avoid infinite loops
  useEffect(() => {
    if (selectedTicket && tickets.length > 0) {
      const updatedTicket = tickets.find(t => t.id === selectedTicket.id);
      if (updatedTicket) {
        // Always update to ensure profile data (name/email) is fresh
        // Check if anything meaningful changed to avoid unnecessary updates
        const statusChanged = updatedTicket.status !== selectedTicket.status;
        const adminIdChanged = updatedTicket.admin_id !== selectedTicket.admin_id;
        const priorityChanged = updatedTicket.priority !== selectedTicket.priority;
        const notesChanged = updatedTicket.notes !== selectedTicket.notes;
        const messagesChanged = updatedTicket.messages?.length !== selectedTicket.messages?.length ||
          JSON.stringify(updatedTicket.messages) !== JSON.stringify(selectedTicket.messages);
        const profileChanged = 
          updatedTicket.profiles?.full_name !== selectedTicket.profiles?.full_name ||
          updatedTicket.profiles?.email !== selectedTicket.profiles?.email;
        
        if (statusChanged || adminIdChanged || messagesChanged || profileChanged || priorityChanged || notesChanged) {
          console.log('🔄 Updating selected ticket with fresh data');
          setSelectedTicket(updatedTicket);
        }
      }
    }
  }, [tickets, selectedTicket?.id]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      setCurrentUser(user);

      // Check if user has admin role
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (error || !roles) {
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAdmin(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedTicket || !currentUser || sendingMessage) return;
    
    if (!message.trim()) {
      toast({
        title: isPortuguese ? 'Erro' : 'Error',
        description: isPortuguese ? 'A mensagem não pode estar vazia' : 'Message cannot be empty',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSendingMessage(true);
      console.log('📤 Admin sending message:', message);
      
      // Assign ticket first if not already assigned (before sending message)
      if (!selectedTicket.admin_id) {
        await handleClaimTicket();
        // Wait for the claim to complete and update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh selected ticket after claim
        const updatedTicket = tickets.find(t => t.id === selectedTicket.id);
        if (updatedTicket) {
          setSelectedTicket(updatedTicket);
        }
      }
      
      // Now send the message
      const updatedTicket = await sendMessage(selectedTicket.id, message, currentUser.id);
      
      // Update selected ticket if message was sent successfully
      if (updatedTicket) {
        setSelectedTicket(updatedTicket);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleClaimTicket = async (ticketId?: string) => {
    const targetTicket = ticketId ? tickets.find(t => t.id === ticketId) : selectedTicket;
    
    if (targetTicket && currentUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', currentUser.id)
        .single();
      
      const adminName = profile?.full_name || currentUser.email?.split('@')[0] || 'Admin';
      await assignTicket(targetTicket.id, currentUser.id, adminName);
      
      // Select the ticket after claiming if not already selected
      if (ticketId && (!selectedTicket || selectedTicket.id !== ticketId)) {
        setSelectedTicket(targetTicket);
      }
    }
  };

  const handleMarkAsResolved = async () => {
    if (selectedTicket) {
      const updatedTicket = await markAsResolved(selectedTicket.id);
      // Update selected ticket immediately with the returned updated ticket
      if (updatedTicket) {
        setSelectedTicket(updatedTicket);
      }
    }
  };

  const handleReopenTicket = async () => {
    if (selectedTicket) {
      const updatedTicket = await reopenTicket(selectedTicket.id);
      // Update selected ticket immediately with the returned updated ticket
      if (updatedTicket) {
        setSelectedTicket(updatedTicket);
      }
    }
  };

  const handleDelete = async () => {
    if (selectedTicket) {
      await deleteTicket(selectedTicket.id);
      setSelectedTicket(null);
    }
  };

  const handleUpdateNotes = async (notes: string) => {
    if (selectedTicket) {
      await updateNotes(selectedTicket.id, notes);
    }
  };

  const handleUpdatePriority = async (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    if (!selectedTicket) return;
    
    // Save original ticket for potential revert
    const originalTicket = selectedTicket;
    
    try {
      // Update optimistically in UI for immediate feedback
      setSelectedTicket({ ...selectedTicket, priority });

      // Update through the hook (which updates both DB and local state)
      const updatedTicket = await updatePriority(selectedTicket.id, priority);
      
      // Update selected ticket with the returned updated ticket
      if (updatedTicket) {
        setSelectedTicket(updatedTicket);
        toast({
          title: isPortuguese ? 'Prioridade atualizada' : 'Priority updated',
          description: isPortuguese 
            ? `Prioridade alterada para ${priority === 'low' ? 'Baixa' : priority === 'medium' ? 'Média' : priority === 'high' ? 'Alta' : 'Urgente'}`
            : `Priority changed to ${priority}`,
          variant: 'default'
        });
      } else {
        // Revert on error
        setSelectedTicket(originalTicket);
      }
    } catch (error: any) {
      console.error('Error updating priority:', error);
      // Revert on error
      setSelectedTicket(originalTicket);
    }
  };


  // Loading state
  if (isAdmin === null || loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Access denied
  if (isAdmin === false) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-center">
            <p className="font-semibold mb-2">
              {isPortuguese ? 'Acesso Restrito' : 'Access Restricted'}
            </p>
            <p className="text-muted-foreground">
              {isPortuguese 
                ? 'Acesso restrito a administradores.'
                : 'Restricted to administrators only.'}
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'users':
        return <UserManagement />;
      case 'admins':
        return <AdminManagement />;
      case 'logs':
        return <AuditLogs />;
      case 'tickets':
      default:
        return (
          <>
            {/* Ticket List */}
            <div className="w-80 flex-shrink-0">
              <TicketList
                tickets={tickets}
                selectedTicketId={selectedTicket?.id}
                onSelectTicket={setSelectedTicket}
                onClaimTicket={handleClaimTicket}
                currentAdminId={currentUser?.id}
              />
            </div>

            {/* Chat Area */}
            <div className="flex-1">
              <ChatArea
                ticket={selectedTicket}
                onSendMessage={handleSendMessage}
                onMarkAsResolved={handleMarkAsResolved}
                onReopenTicket={handleReopenTicket}
                onDelete={handleDelete}
                onUpdateNotes={handleUpdateNotes}
                onUpdatePriority={handleUpdatePriority}
                onClaimTicket={() => handleClaimTicket()}
                currentAdminId={currentUser?.id || ''}
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      {/* Sidebar */}
      <AdminSidebar
        activeFilter={filter}
        onFilterChange={(newFilter) => setFilter(newFilter)}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        ticketCounts={ticketCounts}
        adminName={currentUser?.email?.split('@')[0] || 'Admin'}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Content */}
      {activeSection === 'tickets' ? (
        renderContent()
      ) : (
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      )}
    </div>
  );
};

export default AdminSupport;
