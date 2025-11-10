import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus, Shield, UserX, CheckCircle, XCircle, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminData {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  ticketCount?: number;
  lastActive?: string;
}

export const AdminManagement = () => {
  const { language } = useLanguage();
  const isPortuguese = language === 'pt';
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminToRemove, setAdminToRemove] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: isPortuguese ? 'Erro' : 'Error',
          description: isPortuguese ? 'Sessão expirada' : 'Session expired',
          variant: 'destructive'
        });
        return;
      }

      // Use edge function to get admins with emails
      const { data, error } = await supabase.functions.invoke('get-admins', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to fetch admins');
      }

      if (data?.admins) {
        setAdmins(data.admins);
      } else {
        // Fallback to direct query if edge function fails
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('role', 'admin')
          .order('created_at', { ascending: false });

        if (rolesError) throw rolesError;

        const adminsWithData = (roles || []).map(role => ({
          id: role.id,
          user_id: role.user_id,
          email: role.user_id.slice(0, 8) + '...',
          full_name: null,
          role: role.role,
          created_at: role.created_at,
          ticketCount: 0
        }));

        setAdmins(adminsWithData);
      }
    } catch (error: any) {
      console.error('Error fetching admins:', error);
      toast({
        title: isPortuguese ? 'Erro' : 'Error',
        description: error.message || (isPortuguese ? 'Falha ao carregar administradores' : 'Failed to load administrators'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast({
        title: isPortuguese ? 'Erro' : 'Error',
        description: isPortuguese ? 'Email é obrigatório' : 'Email is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: isPortuguese ? 'Erro' : 'Error',
          description: isPortuguese ? 'Sessão expirada' : 'Session expired',
          variant: 'destructive'
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('add-admin', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: { email: newAdminEmail }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Unknown error');
      }

      toast({
        title: isPortuguese ? 'Sucesso' : 'Success',
        description: isPortuguese ? 'Administrador adicionado com sucesso' : 'Administrator added successfully'
      });

      setNewAdminEmail('');
      setShowAddDialog(false);
      fetchAdmins();
    } catch (error: any) {
      console.error('Error adding admin:', error);
      toast({
        title: isPortuguese ? 'Erro' : 'Error',
        description: error.message || (isPortuguese ? 'Falha ao adicionar administrador' : 'Failed to add administrator'),
        variant: 'destructive'
      });
    }
  };

  const handleRemoveAdmin = async (adminId: string, userId: string) => {
    try {
      // Log before deletion (trigger will also log, but this ensures it)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      // Additional log (trigger should handle it, but ensure it's logged)
      try {
        await supabase.from('audit_logs').insert({
          user_id: userId,
          event_type: 'admin_role_removed',
          event_data: {
            role: 'admin',
            removed_by: currentUser?.id || 'system',
            removed_by_email: currentUser?.email || 'system'
          }
        });
      } catch (logError) {
        console.error('Failed to log admin role removal:', logError);
        // Don't fail if logging fails
      }

      toast({
        title: isPortuguese ? 'Sucesso' : 'Success',
        description: isPortuguese ? 'Administrador removido com sucesso' : 'Administrator removed successfully'
      });

      setAdminToRemove(null);
      fetchAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast({
        title: isPortuguese ? 'Erro' : 'Error',
        description: isPortuguese ? 'Falha ao remover administrador' : 'Failed to remove administrator',
        variant: 'destructive'
      });
    }
  };

  const filteredAdmins = admins.filter(admin =>
    admin.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold mb-2">{isPortuguese ? 'Gestão de Administradores' : 'Admin Management'}</h1>
          <p className="text-muted-foreground">{isPortuguese ? 'Gerencie os administradores do sistema' : 'Manage system administrators'}</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              {isPortuguese ? 'Adicionar Admin' : 'Add Admin'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isPortuguese ? 'Adicionar Administrador' : 'Add Administrator'}</DialogTitle>
              <DialogDescription>
                {isPortuguese ? 'Digite o email do usuário para torná-lo administrador' : 'Enter the user email to make them an administrator'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{isPortuguese ? 'Email' : 'Email'}</label>
                <Input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder={isPortuguese ? 'email@exemplo.com' : 'email@example.com'}
                />
              </div>
              <Button onClick={handleAddAdmin} className="w-full">
                {isPortuguese ? 'Adicionar' : 'Add'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isPortuguese ? 'Pesquisar administradores...' : 'Search administrators...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Admins List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredAdmins.map((admin) => (
          <Card key={admin.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{admin.full_name || 'Admin'}</h3>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {admin.role.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {admin.email || admin.user_id.slice(0, 8) + '...'}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {admin.ticketCount || 0} {isPortuguese ? 'tickets' : 'tickets'}
                    </span>
                    <span className="text-xs">
                      {isPortuguese ? 'Adicionado em' : 'Added on'} {new Date(admin.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setAdminToRemove(admin.user_id)}
              >
                <UserX className="h-4 w-4 mr-2" />
                {isPortuguese ? 'Remover' : 'Remove'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredAdmins.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {isPortuguese ? 'Nenhum administrador encontrado' : 'No administrators found'}
        </div>
      )}

      {/* Remove Admin Confirmation */}
      <AlertDialog open={!!adminToRemove} onOpenChange={(open) => !open && setAdminToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isPortuguese ? 'Remover Administrador?' : 'Remove Administrator?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isPortuguese 
                ? 'Tem certeza que deseja remover este administrador? Esta ação não pode ser desfeita.'
                : 'Are you sure you want to remove this administrator? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isPortuguese ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (adminToRemove) {
                  const admin = admins.find(a => a.user_id === adminToRemove);
                  if (admin) {
                    handleRemoveAdmin(admin.id, admin.user_id);
                  }
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPortuguese ? 'Remover' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

