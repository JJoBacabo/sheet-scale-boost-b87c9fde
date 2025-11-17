import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Trash2, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Block } from "@/pages/NotesBoard";

interface FileBlockProps {
  block: Block;
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onDelete: (id: string) => void;
  zoom: number;
}

export const FileBlock = ({ block, onUpdate, onDelete, zoom }: FileBlockProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const fileUrl: string = block.content?.fileUrl || '';
  const fileName: string = block.content?.fileName || '';
  const fileType: string = block.content?.fileType || '';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onUpdate(block.id, {
        content: {
          ...block.content,
          fileUrl: event.target?.result as string,
          fileName: file.name,
          fileType: file.type,
        },
      });
    };
    reader.readAsDataURL(file);
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
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      className="group"
      whileHover={{ scale: 1.02, zIndex: 1000 }}
    >
      <div className="glass-card rounded-lg shadow-lg p-4">
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

        {/* File Display */}
        {fileUrl ? (
          <div className="space-y-2">
            {fileType.startsWith('image/') ? (
              <img
                src={fileUrl}
                alt={fileName}
                className="w-full h-auto rounded-lg"
              />
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <FileUp className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">{fileName}</p>
                </div>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              Change File
            </Button>
          </div>
        ) : (
          <div
            className="aspect-video bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-center">
              <FileUp className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Click to upload</p>
              <p className="text-xs text-muted-foreground">Image or PDF (1 page)</p>
            </div>
          </div>
        )}

        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </motion.div>
  );
};
