import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center">
      <motion.div
        animate={{ 
          rotateY: [0, 360],
          rotateX: [0, 180, 360]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: "linear"
        }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <Loader2 
          className={cn(
            "text-primary",
            sizeClasses[size],
            className
          )} 
        />
      </motion.div>
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export function LoadingOverlay({ message, className }: LoadingOverlayProps) {
  const { t } = useLanguage();
  const loadingMessage = message || t('common.loading');
  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex items-center justify-center",
      "bg-gradient-to-br from-background/98 via-background/95 to-background/98",
      "backdrop-blur-2xl",
      className
    )}>
      {/* Enhanced animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/8 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '6s', animationDelay: '2s' }} />
        <div className="absolute top-3/4 left-1/3 w-64 h-64 bg-primary/6 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '7s', animationDelay: '0.5s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo with rotating rings - no container box */}
        <div className="relative">
          {/* Outer rotating ring - larger and more visible */}
          <div className="absolute -inset-6 rounded-full border-4 border-transparent 
                          border-t-primary/50 border-r-primary/30 
                          animate-spin"
               style={{ animationDuration: '2s' }} />
          
          {/* Second rotating ring (counter-clockwise) */}
          <div className="absolute -inset-8 rounded-full border-3 border-transparent 
                          border-b-primary/40 border-l-primary/25 
                          animate-spin"
               style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
          
          {/* Third rotating ring (slow) */}
          <div className="absolute -inset-10 rounded-full border-2 border-transparent 
                          border-t-primary/20 border-r-primary/15 
                          animate-spin"
               style={{ animationDuration: '5s' }} />
          
          {/* Pulsing glow rings */}
          <div className="absolute -inset-3 rounded-full bg-primary/25 blur-2xl 
                          animate-pulse" style={{ animationDuration: '2s' }} />
          <div className="absolute -inset-5 rounded-full bg-primary/15 blur-3xl 
                          animate-pulse" style={{ animationDuration: '3s', animationDelay: '1s' }} />
          
          {/* Logo image */}
          <motion.img 
            src={logo} 
            alt="Sheet Tools" 
            className="relative w-32 h-32 object-contain z-10
                       drop-shadow-[0_0_30px_hsl(var(--primary)/0.5)]"
            animate={{ 
              y: [0, -10, 0],
              scale: [1, 1.02, 1],
              rotateY: [0, 180, 360]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{ transformStyle: 'preserve-3d' }}
          />
          
          {/* Enhanced orbiting dots with trail effect */}
          {[0, 0.33, 0.66].map((delay, idx) => (
            <div 
              key={idx}
              className="absolute inset-0 animate-spin"
              style={{ 
                animationDuration: '3s',
                animationDelay: `${delay * 3}s`
              }}
            >
              <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 
                           w-3 h-3 rounded-full 
                           bg-gradient-to-br from-primary/80 to-primary/60 
                           shadow-lg shadow-primary/50
                           blur-[1px]"
              />
            </div>
          ))}
        </div>
        
        {/* Enhanced loading text */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-2xl font-bold bg-gradient-to-r 
                       from-foreground via-primary to-foreground 
                       bg-clip-text text-transparent
                       bg-[length:200%_auto]
                       animate-[gradient_3s_ease_infinite]
                       tracking-tight">
            {loadingMessage}
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-10px) scale(1.02); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
