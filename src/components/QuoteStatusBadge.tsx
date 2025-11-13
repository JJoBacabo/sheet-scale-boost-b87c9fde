import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";

interface QuoteStatusBadgeProps {
  completed: number;
  total: number;
  percentage: number;
}

export const QuoteStatusBadge = ({ completed, total, percentage }: QuoteStatusBadgeProps) => {
  const isComplete = completed === total && total > 0;

  return (
    <Badge
      variant={isComplete ? "default" : "secondary"}
      className="flex items-center gap-1"
    >
      {isComplete ? (
        <>
          <CheckCircle2 className="h-3 w-3" />
          Complete
        </>
      ) : (
        <>
          <Clock className="h-3 w-3" />
          {completed}/{total} ({percentage}%)
        </>
      )}
    </Badge>
  );
};
