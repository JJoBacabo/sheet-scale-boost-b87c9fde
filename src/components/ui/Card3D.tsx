import { motion } from 'framer-motion';
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
  const intensityMap = {
    low: { rotateY: 3, rotateX: 3, scale: 1.02, z: 10 },
    medium: { rotateY: 5, rotateX: 5, scale: 1.05, z: 20 },
    high: { rotateY: 8, rotateX: 8, scale: 1.08, z: 30 },
  };

  const hoverProps = intensityMap[intensity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hoverProps}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 25
      }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        willChange: 'transform',
      }}
      className={cn(
        "glass-card rounded-xl p-6 cursor-pointer",
        className
      )}
    >
      <motion.div
        style={{ transform: 'translateZ(0px)' }}
        className="relative z-10"
      >
        {children}
      </motion.div>
      
      {/* Glow effect overlay - controlado pelo Framer Motion */}
      {glow && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(74, 233, 189, 0.1) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.div>
  );
};

