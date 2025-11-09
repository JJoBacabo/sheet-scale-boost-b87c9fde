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
        scale: 1.05,
        y: -2,
        boxShadow: glow ? '0 10px 30px rgba(74, 233, 189, 0.4)' : undefined,
      }}
      whileTap={{ scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 17
      }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
      className={cn(
        'rounded-xl font-semibold transition-all duration-300',
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
      
      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6 }}
        style={{ transform: 'translateZ(0px)' }}
      />
    </motion.button>
  );
};

