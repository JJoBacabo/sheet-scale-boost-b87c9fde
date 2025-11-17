import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Block } from "@/pages/NotesBoard";

interface IdeaCardBlockProps {
  block: Block;
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onDelete: (id: string) => void;
  zoom: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export const IdeaCardBlock = ({ block, onUpdate, onDelete, zoom, onDragStart, onDragEnd }: IdeaCardBlockProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  const title: string = block.content?.title || '';
  const description: string = block.content?.description || '';
  const tags: string[] = block.content?.tags || [];

  const updateField = (field: string, value: any) => {
    onUpdate(block.id, {
      content: { ...block.content, [field]: value },
    });
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      updateField('tags', [...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateField('tags', tags.filter(tag => tag !== tagToRemove));
  };

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false);
    onDragEnd?.();
    onUpdate(block.id, {
      position_x: block.position_x + info.offset.x / zoom,
      position_y: block.position_y + info.offset.y / zoom,
    });
  };

  const handleResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = block.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = (moveEvent.clientY - startY) / zoom;
      const newHeight = Math.max(200, startHeight + deltaY);
      onUpdate(block.id, { height: newHeight });
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
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      className="group"
      whileHover={{ scale: 1.01, zIndex: 1000 }}
      transition={{ duration: 0.15 }}
    >
      <div className="glass-card rounded-lg shadow-lg p-4 space-y-3" style={{ height: block.height }}>
        {/* Controls */}
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

        {/* Title */}
        <Input
          value={title}
          onChange={(e) => updateField('title', e.target.value)}
          className="font-semibold text-lg border-none bg-transparent px-0 focus-visible:ring-0"
          placeholder="Idea title..."
        />

        {/* Description */}
        <Textarea
          value={description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Describe your idea..."
          className="min-h-[100px] bg-transparent border-none resize-none focus-visible:ring-0"
        />

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
              placeholder="Add tag..."
              className="flex-1"
            />
            <Button size="sm" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={handleResize}
          style={{ 
            background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.3) 50%)',
            borderBottomRightRadius: '12px'
          }}
        />
      </div>
    </motion.div>
  );
};
