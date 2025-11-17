import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Trash2, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Block } from "@/pages/NotesBoard";

interface PostItBlockProps {
  block: Block;
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onDelete: (id: string) => void;
  zoom: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const COLORS = [
  { name: 'yellow', value: '#FEF08A' },
  { name: 'pink', value: '#FBC8D5' },
  { name: 'blue', value: '#BFDBFE' },
  { name: 'green', value: '#BBF7D0' },
  { name: 'gray', value: '#E5E7EB' },
];

export const PostItBlock = ({ block, onUpdate, onDelete, zoom, onDragStart, onDragEnd }: PostItBlockProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  const handleTextChange = (text: string) => {
    onUpdate(block.id, {
      content: { ...block.content, text },
    });
  };

  const handleColorChange = (color: string) => {
    onUpdate(block.id, { color });
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
        newWidth = Math.max(150, startWidth + deltaX);
      }
      if (direction.includes('w')) {
        newWidth = Math.max(150, startWidth - deltaX);
        newPosX = startPosX + (startWidth - newWidth);
      }
      if (direction.includes('s')) {
        newHeight = Math.max(150, startHeight + deltaY);
      }
      if (direction.includes('n')) {
        newHeight = Math.max(150, startHeight - deltaY);
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
      ref={dragRef}
      drag={!isResizing}
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
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      className="group"
      whileHover={{ scale: 1.01, zIndex: 1000 }}
      transition={{ duration: 0.15 }}
    >
      <div
        className="relative w-full h-full rounded-lg shadow-lg p-4 transition-shadow hover:shadow-xl"
        style={{ backgroundColor: block.color || '#FEF08A' }}
      >
        {/* Color Picker */}
        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {COLORS.map((color) => (
            <button
              key={color.name}
              className="w-6 h-6 rounded-full border-2 border-background shadow-sm hover:scale-110 transition-transform"
              style={{ backgroundColor: color.value }}
              onClick={() => handleColorChange(color.value)}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="absolute -top-2 -left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="destructive"
            className="h-6 w-6 rounded-full"
            onClick={() => onDelete(block.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant={block.content?.pinned ? "default" : "secondary"}
            className="h-6 w-6 rounded-full"
            onClick={() => onUpdate(block.id, {
              content: { ...block.content, pinned: !block.content?.pinned }
            })}
          >
            <Pin className="h-3 w-3" />
          </Button>
        </div>

        {/* Content */}
        <Textarea
          value={block.content?.text || ''}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Type your note..."
          className="w-full h-full bg-transparent border-none resize-none focus-visible:ring-0 placeholder:text-gray-600 text-foreground"
          style={{ fontSize: `${Math.max(12, 14 / zoom)}px`, color: '#000000' }}
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
