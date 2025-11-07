import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import logo from "@/assets/sheet-tools-logo.png";
import { useLanguage } from "@/contexts/LanguageContext";

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
      <Loader2 
        className={cn(
          "animate-spin text-primary",
          sizeClasses[size],
          className
        )} 
      />
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

      <div className="relative z-10">
        <div className="glass-card p-16 rounded-3xl border-2 border-primary/40 shadow-2xl 
                        bg-gradient-to-br from-background/90 via-background/70 to-background/90
                        backdrop-blur-3xl relative overflow-hidden
                        ring-2 ring-primary/20">
          {/* Enhanced shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r 
                          from-transparent via-primary/20 via-primary/10 to-transparent" />
          
          {/* Floating particles */}
          <div className="absolute top-4 left-4 w-1 h-1 bg-primary/40 rounded-full animate-ping" style={{ animationDelay: '0s', animationDuration: '2s' }} />
          <div className="absolute top-8 right-8 w-1.5 h-1.5 bg-primary/40 rounded-full animate-ping" style={{ animationDelay: '0.7s', animationDuration: '2.5s' }} />
          <div className="absolute bottom-6 left-12 w-1 h-1 bg-primary/40 rounded-full animate-ping" style={{ animationDelay: '1.4s', animationDuration: '3s' }} />
          <div className="absolute bottom-8 right-12 w-1.5 h-1.5 bg-primary/40 rounded-full animate-ping" style={{ animationDelay: '2.1s', animationDuration: '2.8s' }} />
          
          <div className="flex flex-col items-center gap-8 relative z-10">
            {/* Enhanced logo container with multiple rotating rings */}
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
              
              {/* Logo container - enhanced with 3D effect */}
              <div className="relative w-40 h-40 rounded-3xl 
                              bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5 
                              flex items-center justify-center 
                              shadow-2xl shadow-primary/40
                              backdrop-blur-md
                              border-2 border-primary/30
                              transform transition-all duration-700
                              hover:scale-110
                              animate-[logoFloat_3s_ease-in-out_infinite]">
                {/* Inner glow layers */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br 
                                from-primary/40 via-primary/20 to-transparent 
                                opacity-60 blur-xl" />
                <div className="absolute inset-2 rounded-2xl bg-gradient-to-br 
                                from-white/5 via-transparent to-transparent" />
                
                {/* Logo image - larger and with enhanced effects */}
                <img 
                  src={logo} 
                  alt="Sheet Tools" 
                  className="relative w-32 h-32 object-contain z-10
                             drop-shadow-[0_0_30px_rgba(var(--primary),0.5)]
                             animate-[logoFloat_3s_ease-in-out_infinite] 
                             transform transition-transform duration-700" 
                />
                
                {/* Rotating shine effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r 
                                from-transparent via-white/20 via-white/10 to-transparent
                                animate-[shine_4s_infinite] 
                                [background-size:200%_100%]" />
                
                {/* Sparkle effects */}
                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-white/80 rounded-full 
                                animate-ping" style={{ animationDelay: '0s', animationDuration: '2s' }} />
                <div className="absolute bottom-3 left-3 w-1 h-1 bg-primary/80 rounded-full 
                                animate-ping" style={{ animationDelay: '1s', animationDuration: '2.5s' }} />
              </div>
              
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
              
              {/* Enhanced loading dots with glow */}
              <div className="flex gap-2 mt-1">
                {[0, 0.2, 0.4].map((delay, idx) => (
                  <div 
                    key={idx}
                    className="w-2.5 h-2.5 rounded-full 
                             bg-gradient-to-br from-primary to-primary/60
                             shadow-md shadow-primary/50
                             animate-bounce" 
                    style={{ 
                      animationDelay: `${delay}s`, 
                      animationDuration: '1.4s' 
                    }} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-10px) scale(1.02); }
        }
        @keyframes shine {
          0% { transform: translateX(-100%) rotate(45deg); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%) rotate(45deg); opacity: 0; }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
