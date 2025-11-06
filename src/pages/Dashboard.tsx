import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { SetupProgress } from "@/components/dashboard/SetupProgress";
import { LoadingOverlay } from "@/components/ui/loading-spinner";
import { useSubscriptionState } from "@/hooks/useSubscriptionState";
import { SubscriptionStateBanner } from "@/components/SubscriptionStateBanner";
import { ReadOnlyOverlay } from "@/components/ReadOnlyOverlay";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { stateInfo, loading: stateLoading } = useSubscriptionState();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading || stateLoading) {
    return <LoadingOverlay message={t('dashboard.loading')} />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex bg-background relative">
        <div className="fixed inset-0 bg-gradient-hero opacity-40 pointer-events-none" />

        <AppSidebar />

        <SidebarInset className="flex-1 transition-all duration-300">
          <header className="sticky top-0 z-40 glass-card border-0 border-b border-border/50">
            <div className="flex items-center gap-4 px-6 py-4">
              <SidebarTrigger className="h-10 w-10 rounded-xl glass-card border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300" />
              <div className="flex items-center justify-between flex-1">
                <div>
                  <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
                  <p className="text-sm text-muted-foreground">{t('dashboard.welcome')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <LanguageToggle />
                  <span className="text-sm text-muted-foreground hidden md:block">{user?.email}</span>
                </div>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-6 py-8 relative space-y-8">
            {stateInfo.showBanner && (
              <SubscriptionStateBanner
                state={stateInfo.state as 'expired' | 'suspended' | 'archived'}
                daysUntilSuspension={stateInfo.daysUntilSuspension}
                daysUntilArchive={stateInfo.daysUntilArchive}
                planName={stateInfo.planName}
              />
            )}
            {user && <SetupProgress userId={user.id} />}
          </main>
        </SidebarInset>

        {stateInfo.readonly && stateInfo.state === 'expired' && (
          <ReadOnlyOverlay
            planName={stateInfo.planName}
            daysUntilSuspension={stateInfo.daysUntilSuspension}
          />
        )}
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;