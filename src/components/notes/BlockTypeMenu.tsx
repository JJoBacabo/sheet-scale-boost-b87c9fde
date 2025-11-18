import { StickyNote, CheckSquare, Lightbulb, FileUp, Brush } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Block } from "@/pages/Notes";
import { useLanguage } from "@/contexts/LanguageContext";

interface BlockTypeMenuProps {
  onCreateBlock: (type: Block['type']) => void;
}

export const BlockTypeMenu = ({ onCreateBlock }: BlockTypeMenuProps) => {
  const { t } = useLanguage();

  const options = [
    {
      type: 'postit' as const,
      icon: StickyNote,
      label: t("notes.blockTypes.postit"),
      description: t("notes.blockTypes.postitDesc"),
    },
    {
      type: 'checklist' as const,
      icon: CheckSquare,
      label: t("notes.blockTypes.checklist"),
      description: t("notes.blockTypes.checklistDesc"),
    },
    {
      type: 'idea' as const,
      icon: Lightbulb,
      label: t("notes.blockTypes.idea"),
      description: t("notes.blockTypes.ideaDesc"),
    },
    {
      type: 'file' as const,
      icon: FileUp,
      label: t("notes.blockTypes.file"),
      description: t("notes.blockTypes.fileDesc"),
    },
    {
      type: 'sketch' as const,
      icon: Brush,
      label: t("notes.blockTypes.sketch"),
      description: t("notes.blockTypes.sketchDesc"),
    },
  ];

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-foreground mb-3">{t("notes.createBlock")}</h3>
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
