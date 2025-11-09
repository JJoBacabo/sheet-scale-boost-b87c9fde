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
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
        <SidebarTrigger className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-muted/50 transition-colors flex-shrink-0" />
        
        <div className="flex items-center justify-between flex-1 min-w-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
            <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0 flex-1">
              <h1 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-1 sm:gap-2 truncate">
                <span className="truncate">{title}</span>
                {badge && (
                  <span className="flex-shrink-0 hidden sm:inline-block">
                    {badge}
                  </span>
                )}
              </h1>
              {subtitle && (
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          {actions && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

