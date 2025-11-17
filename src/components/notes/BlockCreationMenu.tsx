import { StickyNote, CheckSquare, Lightbulb, FileUp, Brush } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Block } from "@/pages/NotesBoard";

interface BlockCreationMenuProps {
  onCreateBlock: (type: Block['type'], initialData?: Partial<Block>) => void;
}

export const BlockCreationMenu = ({ onCreateBlock }: BlockCreationMenuProps) => {
  const options = [
    {
      type: 'postit' as const,
      icon: StickyNote,
      label: 'Post-it',
      description: 'Quick note with color',
    },
    {
      type: 'checklist' as const,
      icon: CheckSquare,
      label: 'Checklist',
      description: 'Task list with checkboxes',
    },
    {
      type: 'idea' as const,
      icon: Lightbulb,
      label: 'Idea Card',
      description: 'Detailed idea with tags',
    },
    {
      type: 'file' as const,
      icon: FileUp,
      label: 'Upload File',
      description: 'Image or PDF',
    },
    {
      type: 'sketch' as const,
      icon: Brush,
      label: 'Freehand Sketch',
      description: 'Draw freely',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
      {options.map((option) => (
        <Button
          key={option.type}
          variant="outline"
          className="h-auto flex-col items-start p-4 space-y-2"
          onClick={() => onCreateBlock(option.type)}
        >
          <div className="flex items-center gap-2 w-full">
            <option.icon className="h-5 w-5 text-primary" />
            <span className="font-semibold">{option.label}</span>
          </div>
          <p className="text-xs text-muted-foreground">{option.description}</p>
        </Button>
      ))}
    </div>
  );
};
