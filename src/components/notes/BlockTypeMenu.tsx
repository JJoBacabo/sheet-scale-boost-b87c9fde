import { StickyNote, CheckSquare, Lightbulb, FileUp, Brush } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Block } from "@/pages/Notes";

interface BlockTypeMenuProps {
  onCreateBlock: (type: Block['type']) => void;
}

export const BlockTypeMenu = ({ onCreateBlock }: BlockTypeMenuProps) => {
  const options = [
    {
      type: 'postit' as const,
      icon: StickyNote,
      label: 'Post-it',
      description: 'Nota rápida com cor',
    },
    {
      type: 'checklist' as const,
      icon: CheckSquare,
      label: 'Checklist',
      description: 'Lista de tarefas',
    },
    {
      type: 'idea' as const,
      icon: Lightbulb,
      label: 'Ideia',
      description: 'Card de ideia com tags',
    },
    {
      type: 'file' as const,
      icon: FileUp,
      label: 'Ficheiro',
      description: 'Upload de imagem/PDF',
    },
    {
      type: 'sketch' as const,
      icon: Brush,
      label: 'Desenho',
      description: 'Desenho livre',
    },
  ];

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-foreground mb-3">Criar novo bloco</h3>
      <div className="grid grid-cols-1 gap-2">
        {options.map((option) => (
          <Button
            key={option.type}
            variant="outline"
            className="h-auto flex items-center justify-start gap-3 p-3 hover:bg-primary/5"
            onClick={() => onCreateBlock(option.type)}
          >
            <option.icon className="h-5 w-5 text-primary shrink-0" />
            <div className="flex flex-col items-start">
              <span className="font-semibold text-sm">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};
