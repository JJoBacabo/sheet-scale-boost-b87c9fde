import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BlockWrapper } from "@/components/notes/BlockWrapper";
import { Textarea } from "@/components/ui/textarea";

export interface Block {
  id: string;
  user_id: string;
  type: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  color: string;
  content: { text?: string };
  created_at: string;
  updated_at: string;
}

const COLORS = [
  '#FEF08A', // yellow
  '#FBC8D5', // pink
  '#BFDBFE', // blue
  '#BBF7D0', // green
  '#E5E7EB', // gray
];

const NotesBoard = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setBlocks(data as Block[]);
    } catch (error: any) {
      console.error('Error loading blocks:', error);
      toast({
        title: "Erro ao carregar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createBlock = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newBlock = {
        user_id: user.id,
        type: 'postit',
        position_x: 100 + Math.random() * 200,
        position_y: 100 + Math.random() * 200,
        width: 250,
        height: 250,
        color: COLORS[0],
        content: { text: '' },
      };

      const { data, error } = await supabase
        .from('blocks')
        .insert([newBlock])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setBlocks(prev => [...prev, data as Block]);
        toast({
          title: "Nota criada",
          description: "Arraste e edite sua nota",
        });
      }
    } catch (error: any) {
      console.error('Error creating block:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateBlock = async (id: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ));

    // Save to database
    const block = blocks.find(b => b.id === id);
    if (!block) return;

    const updatedBlock = { ...block, ...updates };
    
    await supabase
      .from('blocks')
      .update({
        position_x: updatedBlock.position_x,
        position_y: updatedBlock.position_y,
        width: updatedBlock.width,
        height: updatedBlock.height,
        color: updatedBlock.color,
        content: updatedBlock.content,
      })
      .eq('id', id);
  };

  const deleteBlock = async (id: string) => {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', id);

    if (!error) {
      setBlocks(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <SidebarProvider>
      <div className="relative w-full h-screen overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            </div>
          ) : (
            <div
              className="relative w-full h-screen overflow-hidden bg-background"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              style={{
                cursor: isPanning ? 'grabbing' : 'default',
                backgroundImage: `
                  linear-gradient(hsl(var(--border) / 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, hsl(var(--border) / 0.1) 1px, transparent 1px)
                `,
                backgroundSize: `${50 * zoom}px ${50 * zoom}px`,
                backgroundPosition: `${pan.x}px ${pan.y}px`,
              }}
            >
              {/* Zoom controls */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-50">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(z => Math.min(z + 0.1, 2))}
                  className="bg-background"
                >
                  +
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}
                  className="bg-background"
                >
                  -
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(1)}
                  className="bg-background"
                >
                  100%
                </Button>
              </div>

              {/* Canvas with blocks */}
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: '0 0',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ pointerEvents: 'auto', position: 'relative', width: '100%', height: '100%' }}>
                  {blocks.map((block) => (
                    <BlockWrapper
                      key={block.id}
                      id={block.id}
                      x={block.position_x}
                      y={block.position_y}
                      width={block.width}
                      height={block.height}
                      zoom={zoom}
                      onUpdate={updateBlock}
                      onDelete={deleteBlock}
                    >
                      <div
                        className="w-full h-full rounded-lg shadow-lg p-4 flex flex-col gap-3"
                        style={{ backgroundColor: block.color }}
                      >
                        {/* Color picker */}
                        <div className="flex gap-1">
                          {COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => updateBlock(block.id, { color })}
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>

                        {/* Text area */}
                        <Textarea
                          value={block.content?.text || ''}
                          onChange={(e) => updateBlock(block.id, { 
                            content: { text: e.target.value } 
                          })}
                          placeholder="Escreva sua nota..."
                          className="flex-1 resize-none bg-transparent border-none focus-visible:ring-0 text-base"
                          style={{ color: '#000000' }}
                        />
                      </div>
                    </BlockWrapper>
                  ))}
                </div>
              </div>

              {/* Add button */}
              <Button
                size="lg"
                onClick={createBlock}
                className="fixed bottom-8 right-8 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow z-50"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default NotesBoard;
