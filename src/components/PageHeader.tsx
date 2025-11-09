import { SidebarTrigger } from "@/components/ui/sidebar";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
        "sticky top-0 z-40",
        className
      )}
    >
      <div className="flex items-center gap-4 px-6 py-5">
        <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-muted/50 transition-colors" />
        
        <div className="flex items-center justify-between flex-1 min-w-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold flex items-center gap-2 truncate">
                {title}
                {badge && (
                  <span className="flex-shrink-0">
                    {badge}
                  </span>
                )}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">
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

