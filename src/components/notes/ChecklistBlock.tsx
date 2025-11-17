import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { Block } from "@/pages/NotesBoard";

interface ChecklistBlockProps {
  block: Block;
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onDelete: (id: string) => void;
  zoom: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export const ChecklistBlock = ({ block, onUpdate, onDelete, zoom, onDragStart, onDragEnd }: ChecklistBlockProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const items: ChecklistItem[] = block.content?.items || [];
  const title: string = block.content?.title || 'Checklist';

  const updateTitle = (newTitle: string) => {
    onUpdate(block.id, {
      content: { ...block.content, title: newTitle },
    });
  };

  const addItem = () => {
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: '',
      checked: false,
    };
    onUpdate(block.id, {
      content: { ...block.content, items: [...items, newItem] },
    });
  };

  const updateItem = (itemId: string, updates: Partial<ChecklistItem>) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    onUpdate(block.id, {
      content: { ...block.content, items: updatedItems },
    });
  };

  const deleteItem = (itemId: string) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    onUpdate(block.id, {
      content: { ...block.content, items: updatedItems },
    });
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
      whileHover={{ scale: 1.02, zIndex: 1000 }}
    >
      <div className="glass-card rounded-lg shadow-lg p-4 space-y-3">
        {/* Controls */}
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
          onChange={(e) => updateTitle(e.target.value)}
          className="font-semibold border-none bg-transparent px-0 focus-visible:ring-0"
          placeholder="Checklist title..."
        />

        {/* Items */}
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 group/item">
              <Checkbox
                checked={item.checked}
                onCheckedChange={(checked) => 
                  updateItem(item.id, { checked: checked as boolean })
                }
              />
              <Input
                value={item.text}
                onChange={(e) => updateItem(item.id, { text: e.target.value })}
                className="flex-1 border-none bg-transparent px-0 focus-visible:ring-0"
                placeholder="Item..."
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover/item:opacity-100"
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={addItem}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>
    </motion.div>
  );
};
