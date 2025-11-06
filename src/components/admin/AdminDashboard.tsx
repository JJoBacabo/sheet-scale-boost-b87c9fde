import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, MessageSquare, CheckCircle, Clock, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  pendingTickets: number;
  ticketsToday: number;
  ticketsThisWeek: number;
  ticketsThisMonth: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const AdminDashboard = () => {
  const { language } = useLanguage();
  const isPortuguese = language === 'pt';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketsByStatus, setTicketsByStatus] = useState<any[]>([]);
  const [ticketsByCategory, setTicketsByCategory] = useState<any[]>([]);
  const [ticketsOverTime, setTicketsOverTime] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, subscription_status, created_at, trial_ends_at');

      // Fetch tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_chats')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('*');

      if (usersError || ticketsError || subsError) {
        console.error('Error fetching data:', { usersError, ticketsError, subsError });
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const ticketsList = tickets || [];
      const usersList = users || [];
      const subsList = subscriptions || [];

      // Calculate stats
      const totalUsers = usersList.length;
      const activeUsers = usersList.filter(u => u.subscription_status === 'active').length;
      const totalTickets = ticketsList.length;
      const openTickets = ticketsList.filter(t => t.status === 'active' || t.status === 'waiting').length;
      const resolvedTickets = ticketsList.filter(t => t.status === 'resolved').length;
      const pendingTickets = ticketsList.filter(t => t.status === 'waiting').length;

      const ticketsToday = ticketsList.filter(t => new Date(t.created_at) >= today).length;
      const ticketsThisWeek = ticketsList.filter(t => new Date(t.created_at) >= weekAgo).length;
      const ticketsThisMonth = ticketsList.filter(t => new Date(t.created_at) >= monthAgo).length;

      // Calculate average response time (simplified)
      const activeTickets = ticketsList.filter(t => t.status === 'active' && t.admin_id);
      const avgResponseTime = activeTickets.length > 0 
        ? activeTickets.reduce((acc, t) => {
            const created = new Date(t.created_at);
            const updated = new Date(t.updated_at);
            return acc + (updated.getTime() - created.getTime()) / (1000 * 60); // minutes
          }, 0) / activeTickets.length
        : 0;

      // Calculate average resolution time
      const resolvedTicketsList = ticketsList.filter(t => t.status === 'resolved' && t.resolved_at);
      const avgResolutionTime = resolvedTicketsList.length > 0
        ? resolvedTicketsList.reduce((acc, t) => {
            const created = new Date(t.created_at);
            const resolved = new Date(t.resolved_at);
            return acc + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
          }, 0) / resolvedTicketsList.length
        : 0;

      // Calculate active subscriptions - check both subscriptions table and profiles
      const activeSubsFromSubs = subsList.filter(s => s.status === 'active' || s.status === 'trialing');
      const activeSubsFromProfiles = usersList.filter(u => 
        u.subscription_status === 'active' || 
        u.subscription_status === 'trialing' ||
        (u.subscription_status === 'trial' && u.trial_ends_at && new Date(u.trial_ends_at) > new Date())
      );
      
      // Combine unique active subscriptions
      const activeUserIds = new Set([
        ...activeSubsFromSubs.map(s => s.user_id),
        ...activeSubsFromProfiles.map(u => u.user_id)
      ]);
      
      const activeSubscriptions = activeUserIds.size;
      const expiredSubscriptions = usersList.length - activeSubscriptions;

      // Calculate revenue (simplified - would need actual payment data)
      const totalRevenue = activeSubsFromSubs.reduce((acc, s) => {
        // Try to extract price from plan_name or use default
        const priceMatch = s.plan_name?.match(/[\d.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0]) : 0;
        return acc + price;
      }, 0);
      const monthlyRevenue = totalRevenue;

      setStats({
        totalUsers,
        activeUsers,
        totalTickets,
        openTickets,
        resolvedTickets,
        pendingTickets,
        ticketsToday,
        ticketsThisWeek,
        ticketsThisMonth,
        avgResponseTime: Math.round(avgResponseTime),
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        totalRevenue,
        monthlyRevenue,
        activeSubscriptions,
        expiredSubscriptions
      });

      // Tickets by status
      const statusCounts = {
        active: ticketsList.filter(t => t.status === 'active').length,
        waiting: ticketsList.filter(t => t.status === 'waiting').length,
        resolved: ticketsList.filter(t => t.status === 'resolved').length
      };

      setTicketsByStatus([
        { name: isPortuguese ? 'Ativos' : 'Active', value: statusCounts.active },
        { name: isPortuguese ? 'Pendentes' : 'Waiting', value: statusCounts.waiting },
        { name: isPortuguese ? 'Resolvidos' : 'Resolved', value: statusCounts.resolved }
      ]);

      // Tickets by category
      const categoryCounts: Record<string, number> = {};
      ticketsList.forEach(t => {
        const cat = t.category || (isPortuguese ? 'Sem categoria' : 'No category');
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      setTicketsByCategory(
        Object.entries(categoryCounts).map(([name, value]) => ({ name, value }))
      );

      // Tickets over time (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      setTicketsOverTime(
        last7Days.map(date => {
          const count = ticketsList.filter(t => t.created_at.startsWith(date)).length;
          return {
            date: new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
            tickets: count
          };
        })
      );

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">{isPortuguese ? 'A carregar...' : 'Loading...'}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">{isPortuguese ? 'Erro ao carregar dados' : 'Error loading data'}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{isPortuguese ? 'Dashboard Admin' : 'Admin Dashboard'}</h1>
        <p className="text-muted-foreground">{isPortuguese ? 'Visão geral do sistema' : 'System overview'}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{isPortuguese ? 'Total de Usuários' : 'Total Users'}</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.activeUsers} {isPortuguese ? 'ativos' : 'active'}
              </p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{isPortuguese ? 'Total de Tickets' : 'Total Tickets'}</p>
              <p className="text-2xl font-bold">{stats.totalTickets}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.openTickets} {isPortuguese ? 'abertos' : 'open'}
              </p>
            </div>
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{isPortuguese ? 'Tickets Resolvidos' : 'Resolved Tickets'}</p>
              <p className="text-2xl font-bold">{stats.resolvedTickets}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pendingTickets} {isPortuguese ? 'pendentes' : 'pending'}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{isPortuguese ? 'Assinaturas Ativas' : 'Active Subscriptions'}</p>
              <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
              <p className="text-xs text-muted-foreground mt-1">
                €{stats.monthlyRevenue.toFixed(2)} {isPortuguese ? 'mensais' : 'monthly'}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">{isPortuguese ? 'Tempo Médio de Resposta' : 'Avg Response Time'}</p>
              <p className="text-xl font-bold">{stats.avgResponseTime} {isPortuguese ? 'min' : 'min'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">{isPortuguese ? 'Tempo Médio de Resolução' : 'Avg Resolution Time'}</p>
              <p className="text-xl font-bold">{stats.avgResolutionTime} {isPortuguese ? 'h' : 'h'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">{isPortuguese ? 'Tickets Hoje' : 'Tickets Today'}</p>
              <p className="text-xl font-bold">{stats.ticketsToday}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{isPortuguese ? 'Tickets por Status' : 'Tickets by Status'}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ticketsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {ticketsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{isPortuguese ? 'Tickets nos Últimos 7 Dias' : 'Tickets Last 7 Days'}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ticketsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="tickets" stroke="#8884d8" strokeWidth={2} dot={{ fill: '#8884d8', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {ticketsByCategory.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{isPortuguese ? 'Tickets por Categoria' : 'Tickets by Category'}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ticketsByCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
};

