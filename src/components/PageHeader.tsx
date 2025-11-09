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
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/20",
        className
      )}
    >
      <div className="flex items-center gap-4 px-8 py-4">
        <SidebarTrigger className="h-10 w-10 rounded-xl border-0 bg-background/50 hover:bg-primary/10 hover:text-primary transition-all duration-200" />
        
        <div className="flex items-center justify-between flex-1 min-w-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-2xl font-bold flex items-center gap-2.5 truncate">
                <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {title}
                </span>
                {badge && (
                  <span className="flex-shrink-0">
                    {badge}
                  </span>
                )}
              </h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground/80 truncate font-normal">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          {actions && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2 flex-shrink-0"
            >
              {actions}
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  );
};

