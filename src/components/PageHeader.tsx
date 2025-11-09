import { SidebarTrigger } from "@/components/ui/sidebar";
import { motion } from "framer-motion";
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
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "sticky top-0 z-40 glass-card border-0 border-b border-border/50 backdrop-blur-xl",
        className
      )}
    >
      <div className="flex items-center gap-4 px-6 py-4">
        <SidebarTrigger className="h-10 w-10 rounded-xl glass-card border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300" />
        
        <div className="flex items-center justify-between flex-1">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
            >
              <h1 className="text-2xl font-bold gradient-text flex items-center gap-3">
                {title}
                {badge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    {badge}
                  </motion.span>
                )}
              </h1>
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="text-sm text-muted-foreground mt-1"
                >
                  {subtitle}
                </motion.p>
              )}
            </motion.div>
          </div>
          
          {actions && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3"
            >
              {actions}
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  );
};

