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
}

const COLORS = [
  { name: 'yellow', value: '#FEF08A' },
  { name: 'pink', value: '#FBC8D5' },
  { name: 'blue', value: '#BFDBFE' },
  { name: 'green', value: '#BBF7D0' },
  { name: 'gray', value: '#E5E7EB' },
];

export const PostItBlock = ({ block, onUpdate, onDelete, zoom }: PostItBlockProps) => {
  const [isDragging, setIsDragging] = useState(false);
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
    onUpdate(block.id, {
      position_x: block.position_x + info.offset.x / zoom,
      position_y: block.position_y + info.offset.y / zoom,
    });
  };

  return (
    <motion.div
      ref={dragRef}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => setIsDragging(true)}
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
      whileHover={{ scale: 1.02, zIndex: 1000 }}
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
          className="w-full h-full bg-transparent border-none resize-none focus-visible:ring-0 text-foreground placeholder:text-foreground/50"
          style={{ fontSize: `${14 / zoom}px` }}
        />
      </div>
    </motion.div>
  );
};
