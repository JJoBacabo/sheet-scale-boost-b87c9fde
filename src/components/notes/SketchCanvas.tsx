import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, PencilBrush } from "fabric";
import { Button } from "@/components/ui/button";
import { Eraser, Pen, Trash2 } from "lucide-react";
import type { Block } from "@/pages/Notes";

interface SketchCanvasProps {
  block: Block;
  onUpdate: (id: string, updates: Partial<Block>) => void;
}

const COLORS = [
  '#000000', // black
  '#EF4444', // red
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#8B5CF6', // purple
];

export const SketchCanvas = ({ block, onUpdate }: SketchCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#000000");
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: block.width - 32,
      height: block.height - 100,
      backgroundColor: "#ffffff",
      isDrawingMode: true,
    });

    // Initialize the freeDrawingBrush
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = 2;
    }

    // Load existing drawing if available
    if (block.content?.drawing) {
      canvas.loadFromJSON(block.content.drawing, () => {
        canvas.renderAll();
      });
    }

    // Save drawing on change
    canvas.on('path:created', () => {
      const json = canvas.toJSON();
      onUpdate(block.id, {
        content: { ...block.content, drawing: json }
      });
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [block.width, block.height, block.id]);

  useEffect(() => {
    if (!fabricCanvas || !fabricCanvas.freeDrawingBrush) return;

    if (isEraser) {
      fabricCanvas.freeDrawingBrush.color = "#ffffff";
      fabricCanvas.freeDrawingBrush.width = 10;
    } else {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = 2;
    }
  }, [activeColor, isEraser, fabricCanvas]);

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    onUpdate(block.id, {
      content: { ...block.content, drawing: null }
    });
  };

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Colors */}
        <div className="flex gap-1">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                setActiveColor(color);
                setIsEraser(false);
              }}
              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                activeColor === color && !isEraser ? 'border-foreground ring-2 ring-foreground/20' : 'border-border'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Tools */}
        <div className="flex gap-1 ml-auto">
          <Button
            size="icon"
            variant={!isEraser ? "default" : "outline"}
            className="h-8 w-8"
            onClick={() => setIsEraser(false)}
          >
            <Pen className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={isEraser ? "default" : "outline"}
            className="h-8 w-8"
            onClick={() => setIsEraser(true)}
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-8 w-8"
            onClick={handleClear}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 border border-border rounded overflow-hidden bg-white">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
