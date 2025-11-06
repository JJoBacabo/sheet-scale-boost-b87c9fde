import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Search, User, Mail, Calendar, CreditCard, MessageSquare, Eye, Edit, Ban, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  trial_ends_at: string | null;
  subscription?: {
    id: string;
    plan_name: string;
    status: string;
    current_period_end: string;
  };
  ticketCount?: number;
}

export const UserManagement = () => {
  const { language } = useLanguage();
  const isPortuguese = language === 'pt';
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
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

      // Use edge function to get users with emails
      const { data, error } = await supabase.functions.invoke('get-users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to fetch users');
      }

      if (data?.users) {
        console.log(`Loaded ${data.users.length} users from edge function`);
        setUsers(data.users);
      } else {
        // Fallback to direct query if edge function fails
        console.log('Edge function failed, using fallback query');
        
        // Fetch all profiles with pagination
        let allProfiles: any[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1);

          if (profilesError) throw profilesError;

          if (profiles && profiles.length > 0) {
            allProfiles = [...allProfiles, ...profiles];
            hasMore = profiles.length === pageSize;
            from += pageSize;
          } else {
            hasMore = false;
          }
        }

        console.log(`Loaded ${allProfiles.length} profiles from fallback`);

        const usersWithData = allProfiles.map(profile => ({
          id: profile.user_id,
          email: profile.user_id.slice(0, 8) + '...',
          full_name: profile.full_name,
          company_name: profile.company_name,
          subscription_plan: profile.subscription_plan,
          subscription_status: profile.subscription_status,
          created_at: profile.created_at,
          trial_ends_at: profile.trial_ends_at,
          ticketCount: 0
        }));

        setUsers(usersWithData);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: isPortuguese ? 'Erro' : 'Error',
        description: error.message || (isPortuguese ? 'Falha ao carregar usuários' : 'Failed to load users'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async (userId: string, newPlan: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_plan: newPlan })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: isPortuguese ? 'Sucesso' : 'Success',
        description: isPortuguese ? 'Plano atualizado com sucesso' : 'Plan updated successfully'
      });

      fetchUsers();
      setShowUserDetails(false);
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: isPortuguese ? 'Erro' : 'Error',
        description: isPortuguese ? 'Falha ao atualizar plano' : 'Failed to update plan',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_status: newStatus })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: isPortuguese ? 'Sucesso' : 'Success',
        description: isPortuguese ? 'Status atualizado com sucesso' : 'Status updated successfully'
      });

      fetchUsers();
      setShowUserDetails(false);
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: isPortuguese ? 'Erro' : 'Error',
        description: isPortuguese ? 'Falha ao atualizar status' : 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlan = filterPlan === 'all' || user.subscription_plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || user.subscription_status === filterStatus;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'expired':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'suspended':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'expert':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'standard':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'basic':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'trial':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
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
      <div>
        <h1 className="text-3xl font-bold mb-2">{isPortuguese ? 'Gestão de Usuários' : 'User Management'}</h1>
        <p className="text-muted-foreground">{isPortuguese ? 'Gerencie todos os usuários do sistema' : 'Manage all system users'}</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isPortuguese ? 'Pesquisar usuários...' : 'Search users...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={isPortuguese ? 'Todos os planos' : 'All plans'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isPortuguese ? 'Todos os planos' : 'All plans'}</SelectItem>
              <SelectItem value="free">FREE</SelectItem>
              <SelectItem value="trial">TRIAL</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={isPortuguese ? 'Todos os status' : 'All statuses'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isPortuguese ? 'Todos os status' : 'All statuses'}</SelectItem>
              <SelectItem value="active">{isPortuguese ? 'Ativo' : 'Active'}</SelectItem>
              <SelectItem value="expired">{isPortuguese ? 'Expirado' : 'Expired'}</SelectItem>
              <SelectItem value="suspended">{isPortuguese ? 'Suspenso' : 'Suspended'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Users List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{user.full_name || user.email || 'Sem nome'}</h3>
                    <Badge variant="outline" className={getPlanColor(user.subscription_plan)}>
                      {user.subscription_plan.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(user.subscription_status)}>
                      {user.subscription_status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {user.company_name && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.company_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {user.ticketCount} {isPortuguese ? 'tickets' : 'tickets'}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedUser(user);
                  setShowUserDetails(true);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                {isPortuguese ? 'Ver Detalhes' : 'View Details'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {isPortuguese ? 'Nenhum usuário encontrado' : 'No users found'}
        </div>
      )}

      {/* User Details Dialog */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isPortuguese ? 'Detalhes do Usuário' : 'User Details'}</DialogTitle>
            <DialogDescription>
              {isPortuguese ? 'Visualize e gerencie as informações do usuário' : 'View and manage user information'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{isPortuguese ? 'Nome' : 'Name'}</label>
                <p className="text-sm text-muted-foreground">{selectedUser.full_name || 'N/A'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">{isPortuguese ? 'Empresa' : 'Company'}</label>
                <p className="text-sm text-muted-foreground">{selectedUser.company_name || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium">{isPortuguese ? 'Plano' : 'Plan'}</label>
                <Select
                  value={selectedUser.subscription_plan}
                  onValueChange={(value) => handleUpdatePlan(selectedUser.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">FREE</SelectItem>
                    <SelectItem value="trial">TRIAL</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">{isPortuguese ? 'Status' : 'Status'}</label>
                <Select
                  value={selectedUser.subscription_status}
                  onValueChange={(value) => handleUpdateStatus(selectedUser.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{isPortuguese ? 'Ativo' : 'Active'}</SelectItem>
                    <SelectItem value="expired">{isPortuguese ? 'Expirado' : 'Expired'}</SelectItem>
                    <SelectItem value="suspended">{isPortuguese ? 'Suspenso' : 'Suspended'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedUser.subscription && (
                <div>
                  <label className="text-sm font-medium">{isPortuguese ? 'Assinatura' : 'Subscription'}</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.subscription.plan_name} - {selectedUser.subscription.status}
                  </p>
                  {selectedUser.subscription.current_period_end && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {isPortuguese ? 'Expira em' : 'Expires on'}: {new Date(selectedUser.subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium">{isPortuguese ? 'Data de Criação' : 'Created At'}</label>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedUser.created_at).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">{isPortuguese ? 'Tickets de Suporte' : 'Support Tickets'}</label>
                <p className="text-sm text-muted-foreground">{selectedUser.ticketCount || 0}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

