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

const AdminSupport = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isPortuguese = language === 'pt';
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'tickets' | 'users' | 'admins' | 'logs'>('dashboard');

  const {
    tickets,
    ticketCounts,
    loading,
    filter,
    setFilter,
    sendMessage,
    assignTicket,
    markAsResolved,
    updateNotes,
    deleteTicket
  } = useAdminSupport(currentUser?.id);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Update selected ticket when tickets change
  useEffect(() => {
    if (selectedTicket && tickets.length > 0) {
      const updatedTicket = tickets.find(t => t.id === selectedTicket.id);
      if (updatedTicket) {
        console.log('🔄 Updating selected ticket with fresh data');
        setSelectedTicket(updatedTicket);
      }
    }
  }, [tickets]);

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
    if (selectedTicket && currentUser) {
      console.log('📤 Admin sending message:', message);
      await sendMessage(selectedTicket.id, message, currentUser.id);
      // Assign ticket if not already assigned
      if (!selectedTicket.admin_id) {
        await handleClaimTicket();
      }
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
      await markAsResolved(selectedTicket.id);
      setSelectedTicket(null);
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
    
    try {
      const { error } = await supabase
        .from('support_chats')
        .update({ 
          priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      // Update local state
      setSelectedTicket({ ...selectedTicket, priority });
    } catch (error) {
      console.error('Error updating priority:', error);
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
