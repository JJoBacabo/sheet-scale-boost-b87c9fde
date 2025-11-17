import { useEffect, useState } from "react";
import { Canvas as FabricCanvas, PencilBrush } from "fabric";
import { Button } from "@/components/ui/button";
import { Eraser, Pen, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const canvasId = `canvas-${block.id}`;
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#000000");
  const [isEraser, setIsEraser] = useState(false);
  const [brushWidth, setBrushWidth] = useState(2);

  useEffect(() => {
    const canvasEl = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvasEl) {
      console.error("Canvas element not found:", canvasId);
      return;
    }

    console.log("Creating canvas for:", canvasId);
    const canvas = new FabricCanvas(canvasId, {
      width: block.width - 32,
      height: block.height - 100,
      backgroundColor: "#ffffff",
      isDrawingMode: true,
    });

    console.log("Canvas created, isDrawingMode:", canvas.isDrawingMode);

    // Initialize the freeDrawingBrush
    const brush = new PencilBrush(canvas);
    brush.color = activeColor;
    brush.width = 2;
    canvas.freeDrawingBrush = brush;

    console.log("Brush initialized:", {
      color: brush.color,
      width: brush.width,
      hasBrush: !!canvas.freeDrawingBrush
    });

    // Add mouse event listeners for debug
    canvas.on('mouse:down', (e) => {
      console.log("Mouse down on canvas", e.pointer);
    });

    canvas.on('mouse:move', (e) => {
      console.log("Mouse move on canvas", e.pointer);
    });

    canvas.on('mouse:up', (e) => {
      console.log("Mouse up on canvas", e.pointer);
    });

    // Load existing drawing if available
    if (block.content?.drawing) {
      canvas.loadFromJSON(block.content.drawing, () => {
        canvas.renderAll();
      });
    }

    // Save drawing on change
    canvas.on('path:created', (e) => {
      console.log("Path created!", e);
      const json = canvas.toJSON();
      onUpdate(block.id, {
        content: { ...block.content, drawing: json }
      });
    });

    setFabricCanvas(canvas);

    return () => {
      console.log("Disposing canvas");
      canvas.dispose();
    };
  }, [canvasId, block.width, block.height]);

  useEffect(() => {
    if (!fabricCanvas || !fabricCanvas.freeDrawingBrush) return;

    if (isEraser) {
      fabricCanvas.freeDrawingBrush.color = "#ffffff";
      fabricCanvas.freeDrawingBrush.width = brushWidth * 5; // Eraser is 5x thicker
    } else {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = brushWidth;
    }
  }, [activeColor, isEraser, fabricCanvas, brushWidth]);

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

        {/* Brush Width Dropdown */}
        <div className="border-l border-border pl-2">
          <Select value={String(brushWidth)} onValueChange={(value) => setBrushWidth(Number(value))}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              <SelectItem value="1">Fino (1px)</SelectItem>
              <SelectItem value="2">Médio (2px)</SelectItem>
              <SelectItem value="4">Grosso (4px)</SelectItem>
              <SelectItem value="8">Extra (8px)</SelectItem>
            </SelectContent>
          </Select>
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
      <div 
        className="flex-1 border border-border rounded overflow-hidden bg-white relative"
      >
        <canvas id={canvasId} style={{ display: 'block', touchAction: 'none' }} />
      </div>
    </div>
  );
};
