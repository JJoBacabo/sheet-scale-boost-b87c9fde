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
    <div className="absolute top-4 left-4 flex flex-col gap-2 z-40">
      <div className="glass-card rounded-lg p-2 flex flex-col gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={onZoomIn}
          className="h-8 w-8"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="text-xs text-center font-mono text-muted-foreground px-1">
          {Math.round(zoom * 100)}%
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onZoomOut}
          className="h-8 w-8"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onResetZoom}
          className="h-8 w-8"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
      
      <Button
        variant="outline"
        onClick={onOrganize}
        className="glass-card gap-2"
      >
        <Grid3x3 className="h-4 w-4" />
        Organize
      </Button>
    </div>
  );
};
