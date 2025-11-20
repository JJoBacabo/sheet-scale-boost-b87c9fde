import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  hue: number;
  pulse: number;
}

export const Background3D = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Track mouse position
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Create particles with more variety
    const particleCount = 80;
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 0.5,
      speedX: (Math.random() - 0.5) * 0.8,
      speedY: (Math.random() - 0.5) * 0.8,
      opacity: Math.random() * 0.6 + 0.3,
      hue: Math.random() * 60 + 180, // Blue to purple range (180-240)
      pulse: Math.random() * Math.PI * 2,
    }));

    // Animation loop
    const animate = () => {
      timeRef.current += 0.01;
      
      // Create subtle gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width * 0.3,
        canvas.height * 0.5,
        0,
        canvas.width * 0.5,
        canvas.height * 0.5,
        canvas.width * 0.8
      );
      gradient.addColorStop(0, 'rgba(123, 188, 254, 0.03)');
      gradient.addColorStop(0.5, 'rgba(184, 168, 254, 0.02)');
      gradient.addColorStop(1, 'rgba(10, 14, 39, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const mousePos = mousePosRef.current;

      particlesRef.current.forEach((particle, i) => {
        // Update position with slight wave motion
        particle.x += particle.speedX + Math.sin(timeRef.current + i) * 0.1;
        particle.y += particle.speedY + Math.cos(timeRef.current + i) * 0.1;

        // Wrap around edges
        if (particle.x < -10) particle.x = canvas.width + 10;
        if (particle.x > canvas.width + 10) particle.x = -10;
        if (particle.y < -10) particle.y = canvas.height + 10;
        if (particle.y > canvas.height + 10) particle.y = -10;

        // Pulsing effect
        const pulseSize = particle.size + Math.sin(timeRef.current * 2 + particle.pulse) * 0.5;
        const pulseOpacity = particle.opacity + Math.sin(timeRef.current + particle.pulse) * 0.1;

        // Draw particle with glow
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = `hsla(${particle.hue}, 100%, 70%, ${pulseOpacity * 0.8})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 100%, 70%, ${pulseOpacity})`;
        ctx.fill();
        ctx.restore();

        // Draw connections between nearby particles
        particlesRef.current.forEach((other, j) => {
          if (i >= j) return; // Avoid duplicate lines
          
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 180) {
            const opacity = 0.15 * (1 - distance / 180);
            const avgHue = (particle.hue + other.hue) / 2;
            
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            
            const lineGradient = ctx.createLinearGradient(
              particle.x, particle.y,
              other.x, other.y
            );
            lineGradient.addColorStop(0, `hsla(${particle.hue}, 100%, 70%, ${opacity})`);
            lineGradient.addColorStop(1, `hsla(${other.hue}, 100%, 70%, ${opacity})`);
            
            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });

        // Enhanced mouse interaction
        const dxToMouse = mousePos.x - particle.x;
        const dyToMouse = mousePos.y - particle.y;
        const distanceToMouse = Math.sqrt(dxToMouse * dxToMouse + dyToMouse * dyToMouse);

        if (distanceToMouse < 250) {
          const opacity = 0.4 * (1 - distanceToMouse / 250);
          
          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = `hsla(${particle.hue}, 100%, 70%, ${opacity})`;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(mousePos.x, mousePos.y);
          ctx.strokeStyle = `hsla(${particle.hue}, 100%, 70%, ${opacity})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();

          // Subtle particle attraction to mouse
          const attraction = 0.02;
          particle.x += (dxToMouse / distanceToMouse) * attraction;
          particle.y += (dyToMouse / distanceToMouse) * attraction;
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      style={{
        background: 'radial-gradient(circle at 30% 40%, rgba(123, 188, 254, 0.06) 0%, rgba(184, 168, 254, 0.04) 40%, transparent 70%)',
      }}
    />
  );
};

