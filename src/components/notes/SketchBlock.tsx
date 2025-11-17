import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Block } from "@/pages/NotesBoard";

interface SketchBlockProps {
  block: Block;
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onDelete: (id: string) => void;
  zoom: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const COLORS = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

export const SketchBlock = ({ block, onUpdate, onDelete, zoom, onDragStart, onDragEnd }: SketchBlockProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [color, setColor] = useState('#000000');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = block.width * 2;
    canvas.height = block.height * 2;
    canvas.style.width = `${block.width}px`;
    canvas.style.height = `${block.height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(2, 2);
    context.lineCap = 'round';
    context.strokeStyle = color;
    context.lineWidth = 2;
    contextRef.current = context;

    // Load existing drawing
    if (block.content?.imageData) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0);
      };
      img.src = block.content.imageData;
    }
  }, [block.width, block.height]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width) / 2;
    const y = (e.clientY - rect.top) * (canvas.height / rect.height) / 2;

    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width) / 2;
    const y = (e.clientY - rect.top) * (canvas.height / rect.height) / 2;

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL('image/png');
    onUpdate(block.id, {
      content: { ...block.content, imageData },
    });
    
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    onUpdate(block.id, {
      content: { ...block.content, imageData: null },
    });
  };

  const changeColor = (newColor: string) => {
    setColor(newColor);
    if (contextRef.current) {
      contextRef.current.strokeStyle = newColor;
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false);
    onDragEnd?.();
    onUpdate(block.id, {
      position_x: block.position_x + info.offset.x / zoom,
      position_y: block.position_y + info.offset.y / zoom,
    });
  };

  const handleResize = (e: React.MouseEvent, direction: 'se' | 'sw' | 'ne' | 'nw') => {
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = block.width;
    const startHeight = block.height;
    const startPosX = block.position_x;
    const startPosY = block.position_y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoom;
      const deltaY = (moveEvent.clientY - startY) / zoom;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newPosX = startPosX;
      let newPosY = startPosY;

      if (direction.includes('e')) {
        newWidth = Math.max(200, startWidth + deltaX);
      }
      if (direction.includes('w')) {
        newWidth = Math.max(200, startWidth - deltaX);
        newPosX = startPosX + (startWidth - newWidth);
      }
      if (direction.includes('s')) {
        newHeight = Math.max(200, startHeight + deltaY);
      }
      if (direction.includes('n')) {
        newHeight = Math.max(200, startHeight - deltaY);
        newPosY = startPosY + (startHeight - newHeight);
      }

      onUpdate(block.id, {
        width: newWidth,
        height: newHeight,
        position_x: newPosX,
        position_y: newPosY,
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
      drag={!isDrawing && !isResizing}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => {
        setIsDragging(true);
        onDragStart?.();
      }}
      onDragEnd={handleDragEnd}
      style={{
        position: 'absolute',
        left: block.position_x,
        top: block.position_y,
        width: block.width,
        height: block.height,
        cursor: isDragging ? 'grabbing' : isDrawing ? 'crosshair' : 'grab',
      }}
      className="group"
      whileHover={{ scale: 1.01, zIndex: 1000 }}
      transition={{ duration: 0.15 }}
    >
      <div className="relative w-full h-full glass-card rounded-lg shadow-lg p-4">
        {/* Control Panel */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-foreground' : 'border-background'} shadow-sm hover:scale-110 transition-transform`}
              style={{ backgroundColor: c }}
              onClick={() => changeColor(c)}
            />
          ))}
          <Button
            size="icon"
            variant="secondary"
            className="h-6 w-6 rounded-full"
            onClick={clearCanvas}
          >
            <Eraser className="h-3 w-3" />
          </Button>
        </div>

        {/* Delete Button */}
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            size="icon"
            variant="destructive"
            className="h-6 w-6 rounded-full"
            onClick={() => onDelete(block.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-full bg-white rounded-lg cursor-crosshair"
        />

        {/* Resize Handles */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleResize(e, 'se')}
          style={{ 
            background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.3) 50%)',
            borderBottomRightRadius: '8px'
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleResize(e, 'sw')}
          style={{ 
            background: 'linear-gradient(225deg, transparent 50%, rgba(0,0,0,0.3) 50%)',
            borderBottomLeftRadius: '8px'
          }}
        />
        <div
          className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleResize(e, 'ne')}
          style={{ 
            background: 'linear-gradient(45deg, transparent 50%, rgba(0,0,0,0.3) 50%)',
            borderTopRightRadius: '8px'
          }}
        />
        <div
          className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleResize(e, 'nw')}
          style={{ 
            background: 'linear-gradient(315deg, transparent 50%, rgba(0,0,0,0.3) 50%)',
            borderTopLeftRadius: '8px'
          }}
        />
      </div>
    </motion.div>
  );
};
