import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Note {
  id: string;
  color: string;
  content: { text?: string };
}

interface NoteCardProps {
  note: Note;
  onUpdate: (id: string, text: string, color: string) => void;
  onDelete: (id: string) => void;
}

const COLORS = [
  { name: 'Amarelo', value: '#FEF08A' },
  { name: 'Rosa', value: '#FBC8D5' },
  { name: 'Azul', value: '#BFDBFE' },
  { name: 'Verde', value: '#BBF7D0' },
  { name: 'Cinza', value: '#E5E7EB' },
];

export const NoteCard = ({ note, onUpdate, onDelete }: NoteCardProps) => {
  const [text, setText] = useState(note.content?.text || '');
  const [color, setColor] = useState(note.color);

  const handleTextChange = (newText: string) => {
    setText(newText);
    onUpdate(note.id, newText, color);
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    onUpdate(note.id, text, newColor);
  };

  return (
    <div
      className="rounded-xl shadow-lg p-6 h-80 flex flex-col gap-4 transition-all hover:shadow-xl hover:scale-[1.02] group"
      style={{ backgroundColor: color }}
    >
      {/* Header with color picker and delete */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => handleColorChange(c.value)}
              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                color === c.value ? 'border-foreground ring-2 ring-foreground/20' : 'border-white'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar nota?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A nota será permanentemente eliminada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(note.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Text area */}
      <Textarea
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="Escreva sua nota aqui..."
        className="flex-1 resize-none bg-transparent border-none focus-visible:ring-0 text-base leading-relaxed"
        style={{ color: '#000000' }}
      />
    </div>
  );
};
