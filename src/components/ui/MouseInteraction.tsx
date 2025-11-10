import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface MousePosition {
  x: number;
  y: number;
}

export const MouseInteraction = () => {
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, { stiffness: 500, damping: 50 });
  const springY = useSpring(cursorY, { stiffness: 500, damping: 50 });
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }>>([]);
  const animationFrameRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasIntervalRef = useRef<number>();

  useEffect(() => {
    // Initialize particles
    particlesRef.current = Array.from({ length: 30 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 4 + 2,
      opacity: Math.random() * 0.5 + 0.3,
    }));

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Animate particles
    const animateParticles = () => {
      particlesRef.current = particlesRef.current.map((particle) => {
        // Attract particles to mouse
        const dx = mousePos.x - particle.x;
        const dy = mousePos.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 250 && isHovering) {
          const force = (250 - distance) / 250;
          particle.vx += (dx / distance) * force * 0.15;
          particle.vy += (dy / distance) * force * 0.15;
        }
        
        // Apply velocity
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Damping
        particle.vx *= 0.92;
        particle.vy *= 0.92;
        
        // Wrap around edges
        if (particle.x < 0) particle.x = window.innerWidth;
        if (particle.x > window.innerWidth) particle.x = 0;
        if (particle.y < 0) particle.y = window.innerHeight;
        if (particle.y > window.innerHeight) particle.y = 0;
        
        return particle;
      });
      
      animationFrameRef.current = requestAnimationFrame(animateParticles);
    };
    
    animateParticles();

    // Canvas drawing
    const canvas = canvasRef.current;
    let resizeHandler: (() => void) | null = null;
    
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        resizeHandler = () => {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        };
        resizeHandler();
        window.addEventListener('resize', resizeHandler);

        const draw = () => {
          if (!ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          particlesRef.current.forEach((particle) => {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(184, 160, 255, ${particle.opacity})`;
            ctx.fill();
            
            // Draw connection to mouse if close
            const dx = mousePos.x - particle.x;
            const dy = mousePos.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 200) {
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(mousePos.x, mousePos.y);
              ctx.strokeStyle = `rgba(184, 160, 255, ${0.2 * (1 - distance / 200)})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          });
        };
        
        canvasIntervalRef.current = window.setInterval(draw, 16);
      }
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (canvasIntervalRef.current) {
        clearInterval(canvasIntervalRef.current);
      }
    };
  }, [mousePos, isHovering, cursorX, cursorY]);

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Main Cursor Glow - follows mouse smoothly */}
      <motion.div
        className="absolute w-64 h-64 rounded-full bg-gradient-primary opacity-30 blur-3xl"
        style={{
          x: springX,
          y: springY,
          left: -128,
          top: -128,
        }}
        animate={{
          scale: isHovering ? [1, 1.3, 1] : 1,
          opacity: isHovering ? [0.3, 0.4, 0.3] : 0.2,
        }}
        transition={{
          duration: 2,
          repeat: isHovering ? Infinity : 0,
        }}
      />

      {/* Secondary Glow Ring */}
      <motion.div
        className="absolute w-96 h-96 rounded-full border-2 border-primary/20 blur-xl"
        style={{
          x: springX,
          y: springY,
          left: -192,
          top: -192,
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
        }}
      />

      {/* Particles Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Interactive Orbs - concentric circles */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full bg-gradient-primary"
          style={{
            width: 120 + i * 40,
            height: 120 + i * 40,
            x: springX,
            y: springY,
            left: -(120 + i * 40) / 2,
            top: -(120 + i * 40) / 2,
            opacity: 0.15 - i * 0.03,
          }}
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 4 + i * 2,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Magnetic Elements - orbiting particles */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 120;
        
        return (
          <motion.div
            key={`magnetic-${i}`}
            className="absolute w-3 h-3 rounded-full bg-primary shadow-glow"
            style={{
              x: springX,
              y: springY,
            }}
            animate={{
              x: [0, Math.cos(angle) * radius, 0],
              y: [0, Math.sin(angle) * radius, 0],
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        );
      })}

    </div>
  );
};

