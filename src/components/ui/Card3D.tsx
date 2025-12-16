import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Card3DProps {
  children: ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
  glow?: boolean;
}

export const Card3D = ({ 
  children, 
  className,
  intensity = 'medium',
  glow = true 
}: Card3DProps) => {
  // Performance: Removed framer-motion, using CSS transitions only
  return (
    <div
      className={cn(
        "glass-card rounded-xl p-6 cursor-pointer transition-all duration-200",
        glow && "hover:shadow-lg hover:shadow-primary/10",
        className
      )}
    >
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Glow effect overlay - CSS only, no animation */}
      {glow && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-200"
          style={{
            background: 'radial-gradient(circle at center, rgba(74, 233, 189, 0.1) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
      )}
    </div>
  );
};

