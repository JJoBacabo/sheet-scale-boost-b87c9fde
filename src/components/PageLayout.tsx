import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Background3D } from "@/components/ui/Background3D";
import { ReactNode } from "react";
import { PageHeader } from "./PageHeader";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  defaultSidebarOpen?: boolean;
}

export const PageLayout = ({
  title,
  subtitle,
  badge,
  actions,
  children,
  defaultSidebarOpen = true,
}: PageLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <div className="min-h-screen w-full flex bg-background relative overflow-hidden">
        {/* Background 3D - igual à home page */}
        <Background3D />
        
        <AppSidebar />

        <SidebarInset className="flex-1 transition-all duration-300 relative z-10">
          <PageHeader
            title={title}
            subtitle={subtitle}
            badge={badge}
            actions={actions}
          />

          <main className="container mx-auto px-6 py-8 relative space-y-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

