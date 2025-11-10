import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Button3DProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  variant?: 'default' | 'glass' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export const Button3D = ({
  children,
  variant = 'gradient',
  size = 'md',
  glow = true,
  className,
  ...props
}: Button3DProps) => {
  const sizeMap = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantStyles = {
    default: 'bg-primary text-primary-foreground',
    glass: 'glass-card border border-primary/20',
    gradient: 'bg-gradient-primary text-primary-foreground',
  };

  return (
    <motion.button
      whileHover={{
        y: -2,
      }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        willChange: 'transform',
        boxShadow: glow ? '0 0 0 rgba(0, 217, 255, 0)' : undefined,
      }}
      className={cn(
        'rounded-xl font-semibold',
        'relative overflow-hidden',
        sizeMap[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <motion.span
        style={{ display: 'block', transform: 'translateZ(20px)' }}
        className="relative z-10"
      >
        {children}
      </motion.span>
      
      {/* Shine effect - apenas no hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: '-100%', opacity: 0 }}
        whileHover={{ x: '100%', opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ transform: 'translateZ(0px)' }}
      />
      
      {/* Glow shadow - controlado pelo Framer Motion */}
      {glow && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: '0 10px 30px rgba(0, 217, 255, 0)',
          }}
          whileHover={{
            boxShadow: '0 10px 30px rgba(0, 217, 255, 0.4)',
          }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.button>
  );
};

