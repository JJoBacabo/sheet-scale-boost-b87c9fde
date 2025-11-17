import { ZoomIn, ZoomOut, Maximize2, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CanvasControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onOrganize: () => void;
}

export const CanvasControls = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOrganize,
}: CanvasControlsProps) => {
  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 z-40 group">
      <div className="glass-card rounded-lg p-1.5 flex flex-col gap-1 scale-75 group-hover:scale-100 transition-transform duration-200 origin-top-left">
        <Button
          size="icon"
          variant="ghost"
          onClick={onZoomIn}
          className="h-7 w-7"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <div className="text-[10px] text-center font-mono text-muted-foreground px-1">
          {Math.round(zoom * 100)}%
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onZoomOut}
          className="h-7 w-7"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onResetZoom}
          className="h-7 w-7"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      <Button
        variant="outline"
        onClick={onOrganize}
        className="glass-card gap-2 scale-75 group-hover:scale-100 transition-transform duration-200 origin-top-left text-xs py-1 px-2 h-7"
      >
        <Grid3x3 className="h-3.5 w-3.5" />
        Organize
      </Button>
    </div>
  );
};
