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
      <div className="min-h-screen w-full flex relative overflow-hidden">
        {/* Background 3D - igual à home page */}
        <Background3D />
        
        <div className="flex flex-1 relative z-10">
          <AppSidebar />

          <SidebarInset className="flex-1 transition-all duration-300 relative bg-background/20 backdrop-blur-[2px]">
            <PageHeader
              title={title}
              subtitle={subtitle}
              badge={badge}
              actions={actions}
            />

            <main className="container mx-auto px-6 py-6 relative space-y-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};

