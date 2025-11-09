import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card3D } from '@/components/ui/Card3D';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CryptoChartProps {
  data: { date: string; value: number }[];
  title: string;
  color?: string;
  showTrend?: boolean;
}

export const CryptoChart = ({ data, title, color = '#4AE9BD', showTrend = true }: CryptoChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const progressRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = window.innerWidth < 640 ? 150 : 200; // Mobile: 150px, Desktop: 200px
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const drawChart = (progress: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (data.length === 0) return;

      const padding = 40;
      const width = canvas.width - padding * 2;
      const height = canvas.height - padding * 2;
      const maxValue = Math.max(...data.map(d => d.value));
      const minValue = Math.min(...data.map(d => d.value));
      const range = maxValue - minValue || 1;

      const points = data.map((point, index) => {
        const x = padding + (index / (data.length - 1 || 1)) * width;
        const y = padding + height - ((point.value - minValue) / range) * height;
        return { x, y, value: point.value };
      });

      // Draw gradient area
      const visiblePoints = Math.floor(points.length * progress);
      if (visiblePoints > 1) {
        const gradient = ctx.createLinearGradient(0, padding, 0, canvas.height - padding);
        gradient.addColorStop(0, `${color}40`);
        gradient.addColorStop(1, `${color}00`);

        ctx.beginPath();
        ctx.moveTo(points[0].x, canvas.height - padding);
        for (let i = 0; i < visiblePoints; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineTo(points[visiblePoints - 1].x, canvas.height - padding);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw line
      if (visiblePoints > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < visiblePoints; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw points
      for (let i = 0; i < visiblePoints; i++) {
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw current value indicator
      if (visiblePoints > 0) {
        const lastPoint = points[visiblePoints - 1];
        ctx.beginPath();
        ctx.arc(lastPoint.x, lastPoint.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    };

    const animate = () => {
      if (progressRef.current < 1) {
        progressRef.current = Math.min(progressRef.current + 0.02, 1);
        drawChart(progressRef.current);
        animationRef.current = requestAnimationFrame(animate);
      } else {
        drawChart(1);
      }
    };

    progressRef.current = 0;
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [data, color]);

  if (!data.length) {
    return (
      <Card3D intensity="low" className="p-6">
        <p className="text-muted-foreground text-center">Sem dados disponíveis</p>
      </Card3D>
    );
  }

  const currentValue = data[data.length - 1]?.value || 0;
  const previousValue = data[data.length - 2]?.value || currentValue;
  const change = currentValue - previousValue;
  const changePercent = previousValue !== 0 ? ((change / previousValue) * 100) : 0;
  const isPositive = change >= 0;

  return (
    <Card3D intensity="low" className="p-3 sm:p-4 md:p-6 hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <h3 className="text-sm sm:text-base md:text-lg font-semibold truncate flex-1">{title}</h3>
        {showTrend && (
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
            )}
            <span className={`text-xs sm:text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
      <div className="relative">
        <canvas ref={canvasRef} className="w-full" style={{ height: '150px', maxHeight: '200px' }} />
        <div className="absolute bottom-1 sm:bottom-2 left-0 right-0 flex justify-between text-[10px] sm:text-xs text-muted-foreground px-1 sm:px-2">
          <span>{data[0]?.date || ''}</span>
          <span>{data[data.length - 1]?.date || ''}</span>
        </div>
      </div>
      <div className="mt-3 sm:mt-4 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Valor Atual</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold truncate" style={{ color }}>
            €{currentValue.toFixed(2)}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Variação</p>
          <p className={`text-sm sm:text-base md:text-lg font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}€{change.toFixed(2)}
          </p>
        </div>
      </div>
    </Card3D>
  );
};

