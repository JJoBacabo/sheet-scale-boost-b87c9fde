import { useNavigate } from 'react-router-dom';
import { MessageSquare, Clock, CheckCircle, Menu, ArrowLeft, UserCog, BarChart3, Users, Shield, FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  activeFilter: 'all' | 'active' | 'waiting' | 'resolved' | 'mine';
  onFilterChange: (filter: 'all' | 'active' | 'waiting' | 'resolved' | 'mine') => void;
  activeSection?: 'dashboard' | 'tickets' | 'users' | 'admins' | 'logs';
  onSectionChange?: (section: 'dashboard' | 'tickets' | 'users' | 'admins' | 'logs') => void;
  ticketCounts: {
    all: number;
    active: number;
    waiting: number;
    resolved: number;
    mine: number;
  };
  adminName?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export const AdminSidebar = ({ 
  activeFilter, 
  onFilterChange,
  activeSection = 'tickets',
  onSectionChange,
  ticketCounts,
  adminName = 'Admin',
  isCollapsed = false,
  onToggle
}: AdminSidebarProps) => {
  const { language } = useLanguage();
  const isPortuguese = language === 'pt';
  const navigate = useNavigate();

  const sections = [
    {
      id: 'dashboard' as const,
      label: isPortuguese ? 'Dashboard' : 'Dashboard',
      icon: BarChart3
    },
    {
      id: 'tickets' as const,
      label: isPortuguese ? 'Tickets' : 'Tickets',
      icon: MessageSquare
    },
    {
      id: 'users' as const,
      label: isPortuguese ? 'Usuários' : 'Users',
      icon: Users
    },
    {
      id: 'admins' as const,
      label: isPortuguese ? 'Administradores' : 'Administrators',
      icon: Shield
    },
    {
      id: 'logs' as const,
      label: isPortuguese ? 'Logs' : 'Logs',
      icon: FileText
    }
  ];

  const menuItems = [
    {
      id: 'all' as const,
      label: isPortuguese ? 'Todos os Tickets' : 'All Tickets',
      icon: MessageSquare,
      count: ticketCounts.all
    },
    {
      id: 'mine' as const,
      label: isPortuguese ? 'Meus Tickets' : 'My Tickets',
      icon: UserCog,
      count: ticketCounts.mine
    },
    {
      id: 'waiting' as const,
      label: isPortuguese ? 'Pendentes' : 'Pending',
      icon: Clock,
      count: ticketCounts.waiting
    },
    {
      id: 'active' as const,
      label: isPortuguese ? 'Ativos' : 'Active',
      icon: MessageSquare,
      count: ticketCounts.active
    },
    {
      id: 'resolved' as const,
      label: isPortuguese ? 'Resolvidos' : 'Resolved',
      icon: CheckCircle,
      count: ticketCounts.resolved
    }
  ];

  return (
    <div className={cn(
      "bg-card border-r border-border h-full flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h2 className="font-bold text-lg text-foreground">
              {isPortuguese ? 'Suporte Admin' : 'Admin Support'}
            </h2>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {adminName}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sections */}
      <nav className="flex-1 p-2 space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => onSectionChange?.(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
                "hover:bg-accent group",
                isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 shrink-0",
                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {!isCollapsed && (
                <span className="flex-1 text-left font-medium">{section.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Ticket Filters (only show when tickets section is active) */}
      {activeSection === 'tickets' && !isCollapsed && (
        <div className="p-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-2 px-3">
            {isPortuguese ? 'Filtros' : 'Filters'}
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeFilter === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onFilterChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm",
                    "hover:bg-accent group",
                    isActive && "bg-primary/20 text-primary"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count > 0 && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-bold",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-3 border-primary/20 hover:bg-primary/10"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{isPortuguese ? 'Voltar ao Site' : 'Back to Site'}</span>
          </Button>
        </div>
      )}
    </div>
  );
};
