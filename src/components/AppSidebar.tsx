import { Home, TrendingUp, Package, Settings, LogOut, Sparkles, ChevronRight, BarChart3, Target, MessageCircle, MoreHorizontal, Shield, FileSpreadsheet } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { LanguageToggle } from "./LanguageToggle";
import { CurrencySelector } from "./CurrencySelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useChat } from "@/contexts/ChatContext";
import { useFeatureGate } from "@/hooks/useFeatureGate";

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { isAdmin } = useIsAdmin();
  const { openChat } = useChat();
  const { checkFeature } = useFeatureGate();
  const isCollapsed = state === "collapsed";

  const allMenuItems = [
    { title: t('sidebar.dashboard'), url: "/dashboard", icon: Home, feature: 'dashboard' },
    { title: "Ads Manager", url: "/meta-dashboard", icon: Target, feature: 'meta-dashboard' },
    { title: t('sidebar.dailyRoas'), url: "/campaign-control", icon: BarChart3, feature: 'campaign-control' },
    { title: t('sidebar.profitSheet'), url: "/profit-sheet", icon: FileSpreadsheet, feature: 'profit-sheet' },
    { title: "Product Research", url: "/product-research", icon: TrendingUp, feature: 'product-research' },
    { title: t('sidebar.products'), url: "/products", icon: Package, feature: 'products' },
  ];

  // Filter menu items based on plan features
  const menuItems = allMenuItems.filter(item => checkFeature(item.feature));

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: t('sidebar.logout'),
      description: t('common.goodbye'),
    });
    navigate("/");
  };

  const handleUpgradeClick = () => {
    // If not on settings page, navigate there first
    if (location.pathname !== '/settings') {
      navigate('/settings');
      // Wait for navigation then scroll
      setTimeout(() => {
        const plansSection = document.getElementById('plans-section');
        if (plansSection) {
          plansSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // Already on settings, just scroll
      const plansSection = document.getElementById('plans-section');
      if (plansSection) {
        plansSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-primary/5 backdrop-blur-xl bg-background/50 transition-all duration-300"
    >
      {/* Header with Logo */}
      <SidebarHeader className="p-6 flex items-center justify-center border-b border-primary/5">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-primary blur-xl opacity-30 animate-pulse -z-10" />
          <img 
            src={logo} 
            alt="Sheet-Tools Logo" 
            className={`relative z-10 transition-all duration-500 ${isCollapsed ? 'w-10 h-10' : 'w-16 h-16'} hover:scale-110`}
            style={{ display: 'block', position: 'relative' }}
          />
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className="px-3 py-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <NavLink 
                      to={item.url} 
                      className={`
                        group relative flex items-center gap-4 px-4 py-3.5 rounded-xl
                        transition-all duration-300 overflow-hidden
                        ${isActive 
                          ? 'bg-primary text-primary-foreground shadow-glow' 
                          : 'hover:bg-primary/10 text-muted-foreground hover:text-foreground'
                        }
                      `}
                    >
                      {/* Background glow effect */}
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-primary opacity-90" />
                      )}
                      
                      {/* Icon */}
                      <div className={`
                        relative z-10 w-5 h-5 shrink-0
                        transition-transform duration-300
                        ${isActive ? 'scale-110' : 'group-hover:scale-110'}
                      `}>
                        <item.icon className="w-full h-full" />
                      </div>
                      
                      {/* Title */}
                      {!isCollapsed && (
                        <span className="relative z-10 font-medium text-sm flex-1">
                          {item.title}
                        </span>
                      )}
                      
                      {/* Arrow indicator */}
                      {!isCollapsed && isActive && (
                        <ChevronRight className="relative z-10 w-4 h-4 shrink-0 animate-pulse" />
                      )}
                    </NavLink>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with Support and More Options */}
      <SidebarFooter className="border-t border-primary/5 p-3 space-y-3">
        {/* Support and More Options - Side by Side */}
        <SidebarMenu>
          <div className="flex items-center gap-2">
            {/* More Options Dropdown */}
            <SidebarMenuItem className="flex-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    tooltip={isCollapsed ? t('sidebar.moreOptions') : undefined}
                    className={`
                      group relative flex items-center justify-center gap-2 px-3 py-3 rounded-xl
                      transition-all duration-300
                      hover:bg-primary/10 hover:text-primary
                      text-muted-foreground w-full
                    `}
                  >
                    <MoreHorizontal className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform duration-300" />
                    {!isCollapsed && <span className="font-medium text-sm">{t('sidebar.moreOptions')}</span>}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  side="top" 
                  align="end"
                  className="w-56 z-[100] bg-popover border-border shadow-lg"
                >
                  <DropdownMenuItem asChild>
                    <NavLink to="/integrations" className="cursor-pointer flex items-center">
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('sidebar.integrations')}
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/settings" className="cursor-pointer flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      {t('sidebar.settings')}
                    </NavLink>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <NavLink to="/admin/support" className="cursor-pointer text-primary font-medium flex items-center">
                          <Shield className="w-4 h-4 mr-2" />
                          {t('sidebar.adminPanel')}
                        </NavLink>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink to="/terms" className="cursor-pointer flex items-center">
                      {t('sidebar.terms')}
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/privacy" className="cursor-pointer flex items-center">
                      {t('sidebar.privacy')}
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive flex items-center"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('sidebar.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>

            {/* Support Button */}
            <SidebarMenuItem className="flex-1">
              <SidebarMenuButton
                onClick={openChat}
                tooltip={t('sidebar.support')}
                className={`
                  group relative flex items-center justify-center px-3 py-3 rounded-xl
                  transition-all duration-300
                  hover:bg-primary/10 hover:text-primary
                  text-muted-foreground w-full
                `}
              >
                <div className="relative">
                  <MessageCircle className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform duration-300" />
                  {/* Green notification dot */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </div>
        </SidebarMenu>

        {/* Language and Currency - Below More Options */}
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-center gap-2 w-full">
              <LanguageToggle />
              <CurrencySelector />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
