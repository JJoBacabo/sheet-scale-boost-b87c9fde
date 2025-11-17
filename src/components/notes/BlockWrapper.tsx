import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BlockWrapperProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
  onUpdate: (id: string, updates: { position_x?: number; position_y?: number; width?: number; height?: number }) => void;
  onDelete: (id: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  children: React.ReactNode;
  resizable?: boolean;
}

export const BlockWrapper = ({
  id,
  x,
  y,
  width,
  height,
  zoom,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  children,
  resizable = true,
}: BlockWrapperProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (event: any, info: any) => {
    const newX = x + info.offset.x / zoom;
    const newY = y + info.offset.y / zoom;
    
    onUpdate(id, {
      position_x: newX,
      position_y: newY,
    });
    
    setIsDragging(false);
    onDragEnd?.();
  };

  const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    if (!resizable) return;
    
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = width;
    const startHeight = height;
    const startPosX = x;
    const startPosY = y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoom;
      const deltaY = (moveEvent.clientY - startY) / zoom;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startPosX;
      let newY = startPosY;

      if (direction.includes('e')) {
        newWidth = Math.max(150, startWidth + deltaX);
      }
      if (direction.includes('w')) {
        newWidth = Math.max(150, startWidth - deltaX);
        newX = startPosX + deltaX;
      }
      if (direction.includes('s')) {
        newHeight = Math.max(100, startHeight + deltaY);
      }
      if (direction.includes('n')) {
        newHeight = Math.max(100, startHeight - deltaY);
        newY = startPosY + deltaY;
      }

      onUpdate(id, {
        width: newWidth,
        height: newHeight,
        position_x: newX,
        position_y: newY,
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <motion.div
      ref={blockRef}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => {
        setIsDragging(true);
        onDragStart?.();
      }}
      onDragEnd={handleDragEnd}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: width,
        height: height,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Drag Handle */}
      <div className="absolute -top-8 left-0 right-0 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-md px-2 py-1 shadow-lg">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <Button
          size="icon"
          variant="destructive"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Content */}
      <div className="w-full h-full">
        {children}
      </div>

      {/* Resize Handles */}
      {resizable && (
        <>
          {/* Corner Handles */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(135deg, transparent 50%, hsl(var(--primary)) 50%)' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          />
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(45deg, transparent 50%, hsl(var(--primary)) 50%)' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
          />
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(225deg, transparent 50%, hsl(var(--primary)) 50%)' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
          />
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(315deg, transparent 50%, hsl(var(--primary)) 50%)' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
          />

          {/* Edge Handles */}
          <div
            className="absolute top-0 left-4 right-4 h-2 cursor-n-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
          />
          <div
            className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleResizeMouseDown(e, 's')}
          />
          <div
            className="absolute left-0 top-4 bottom-4 w-2 cursor-w-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
          />
          <div
            className="absolute right-0 top-4 bottom-4 w-2 cursor-e-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
          />
        </>
      )}
    </motion.div>
  );
};
