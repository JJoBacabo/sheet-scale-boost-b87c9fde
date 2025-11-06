import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import logo from "@/assets/sheet-tools-logo.png";

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

export function LoadingOverlay({ message = "Carregando...", className }: LoadingOverlayProps) {
  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex items-center justify-center",
      "bg-background/80 backdrop-blur-md",
      className
    )}>
      <div className="glass-card p-8 rounded-2xl border-2 border-primary/20 shadow-glow">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow logo-glow animate-pulse">
            <img src={logo} alt="Sheet Tools" className="w-20 h-20 object-contain" />
          </div>
          <p className="text-lg font-semibold">{message}</p>
        </div>
      </div>
    </div>
  );
}
