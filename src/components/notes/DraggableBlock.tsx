import { useState, useRef } from "react";
import Draggable from "react-draggable";
import { Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { SketchCanvas } from "./SketchCanvas";
import type { Block } from "@/pages/Notes";

interface DraggableBlockProps {
  block: Block;
  zoom: number;
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onDelete: (id: string) => void;
}

export const DraggableBlock = ({ block, zoom, onUpdate, onDelete }: DraggableBlockProps) => {
  const nodeRef = useRef(null);

  const handleDragStop = (_e: any, data: any) => {
    onUpdate(block.id, {
      position_x: data.x,
      position_y: data.y,
    });
  };

  const renderContent = () => {
    switch (block.type) {
      case 'postit':
        return (
          <div className="w-full h-full flex flex-col gap-3">
            <Textarea
              value={block.content?.text || ''}
              onChange={(e) => onUpdate(block.id, { 
                content: { ...block.content, text: e.target.value } 
              })}
              placeholder="Escreva sua nota..."
              className="flex-1 resize-none bg-transparent border-none focus-visible:ring-0 text-base"
              style={{ color: '#000000' }}
            />
          </div>
        );

      case 'checklist':
        const items = block.content?.items || [];
        return (
          <div className="w-full h-full flex flex-col gap-3 overflow-auto">
            <Input
              value={block.content?.title || ''}
              onChange={(e) => onUpdate(block.id, {
                content: { ...block.content, title: e.target.value }
              })}
              placeholder="Título da lista"
              className="font-semibold"
            />
            <div className="flex-1 space-y-2 overflow-y-auto">
              {items.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={(checked) => {
                      const newItems = [...items];
                      newItems[index] = { ...item, checked };
                      onUpdate(block.id, {
                        content: { ...block.content, items: newItems }
                      });
                    }}
                  />
                  <Input
                    value={item.text}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index] = { ...item, text: e.target.value };
                      onUpdate(block.id, {
                        content: { ...block.content, items: newItems }
                      });
                    }}
                    className="flex-1"
                  />
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onUpdate(block.id, {
                    content: {
                      ...block.content,
                      items: [...items, { text: '', checked: false }]
                    }
                  });
                }}
                className="w-full"
              >
                + Adicionar item
              </Button>
            </div>
          </div>
        );

      case 'idea':
        return (
          <div className="w-full h-full flex flex-col gap-3">
            <Input
              value={block.content?.title || ''}
              onChange={(e) => onUpdate(block.id, {
                content: { ...block.content, title: e.target.value }
              })}
              placeholder="Título da ideia"
              className="font-bold text-lg"
            />
            <Textarea
              value={block.content?.description || ''}
              onChange={(e) => onUpdate(block.id, {
                content: { ...block.content, description: e.target.value }
              })}
              placeholder="Descreva sua ideia..."
              className="flex-1 resize-none"
            />
          </div>
        );

      case 'file':
        const fileUrl = block.content?.fileUrl;
        const fileName = block.content?.fileName;
        const fileType = block.content?.fileType;
        
        return (
          <div className="w-full h-full flex flex-col gap-3">
            {fileUrl ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                {fileType?.startsWith('image/') ? (
                  <img 
                    src={fileUrl} 
                    alt={fileName} 
                    className="max-w-full max-h-full object-contain rounded"
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-semibold">{fileName}</p>
                    <a 
                      href={fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Abrir ficheiro
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <label className="cursor-pointer flex flex-col items-center gap-2 hover:text-primary transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;
                      
                      const fileExt = file.name.split('.').pop();
                      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
                      
                      const { data, error } = await supabase.storage
                        .from('notes-files')
                        .upload(fileName, file);
                      
                      if (error) {
                        console.error('Error uploading file:', error);
                        return;
                      }
                      
                      const { data: publicData } = supabase.storage
                        .from('notes-files')
                        .getPublicUrl(fileName);
                      
                      onUpdate(block.id, {
                        content: {
                          fileUrl: publicData.publicUrl,
                          fileName: file.name,
                          fileType: file.type,
                        }
                      });
                    }}
                  />
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm">Clique para fazer upload</span>
                  <span className="text-xs text-muted-foreground">Imagens ou PDF</span>
                </label>
              </div>
            )}
          </div>
        );

      case 'sketch':
        return (
          <SketchCanvas 
            block={block}
            onUpdate={onUpdate}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: block.position_x, y: block.position_y }}
      onStop={handleDragStop}
      scale={zoom}
      handle=".drag-handle"
    >
      <div
        ref={nodeRef}
        className="absolute group"
        style={{
          width: block.width,
          height: block.height,
        }}
      >
        {/* Drag handle and delete button */}
        <div className="absolute -top-8 left-0 right-0 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="drag-handle flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-md px-2 py-1 shadow-lg cursor-move">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Button
            size="icon"
            variant="destructive"
            className="h-7 w-7"
            onClick={() => onDelete(block.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Block content */}
        <div
          className="w-full h-full rounded-lg shadow-lg p-4 transition-all hover:shadow-xl border bg-white"
        >
          {renderContent()}
        </div>
      </div>
    </Draggable>
  );
};
