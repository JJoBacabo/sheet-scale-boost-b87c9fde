import { useState, useRef } from "react";
import Draggable from "react-draggable";
import { Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Note {
  id: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  color: string;
  content: { text?: string };
}

interface DraggableNoteProps {
  note: Note;
  zoom: number;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
}

const COLORS = [
  '#FEF08A', // yellow
  '#FBC8D5', // pink
  '#BFDBFE', // blue
  '#BBF7D0', // green
  '#E5E7EB', // gray
];

export const DraggableNote = ({ note, zoom, onUpdate, onDelete }: DraggableNoteProps) => {
  const [text, setText] = useState(note.content?.text || '');
  const nodeRef = useRef(null);

  const handleDragStop = (_e: any, data: any) => {
    onUpdate(note.id, {
      position_x: data.x,
      position_y: data.y,
    });
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
    onUpdate(note.id, {
      content: { text: newText },
    });
  };

  const handleColorChange = (newColor: string) => {
    onUpdate(note.id, {
      color: newColor,
    });
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: note.position_x, y: note.position_y }}
      onStop={handleDragStop}
      scale={zoom}
      handle=".drag-handle"
    >
      <div
        ref={nodeRef}
        className="absolute group"
        style={{
          width: note.width,
          height: note.height,
        }}
      >
        {/* Drag handle and delete button */}
        <div className="absolute -top-8 left-0 right-0 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="drag-handle flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-md px-2 py-1 shadow-lg cursor-move">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Button
            size="icon"
            variant="destructive"
            className="h-7 w-7"
            onClick={() => onDelete(note.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Note content */}
        <div
          className="w-full h-full rounded-lg shadow-lg p-4 flex flex-col gap-3 transition-all hover:shadow-xl"
          style={{ backgroundColor: note.color }}
        >
          {/* Color picker */}
          <div className="flex gap-1">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Text area */}
          <Textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Escreva sua nota..."
            className="flex-1 resize-none bg-transparent border-none focus-visible:ring-0 text-base"
            style={{ color: '#000000' }}
          />
        </div>
      </div>
    </Draggable>
  );
};
