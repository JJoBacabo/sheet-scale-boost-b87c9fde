import { SidebarTrigger } from "@/components/ui/sidebar";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export const PageHeader = ({ 
  title, 
  subtitle, 
  badge,
  actions,
  className 
}: PageHeaderProps) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-background/80 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center gap-3 px-6 py-3">
        <SidebarTrigger className="h-9 w-9 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-colors" />
        
        <div className="flex items-center justify-between flex-1 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2 truncate">
                {title}
                {badge && <span>{badge}</span>}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

