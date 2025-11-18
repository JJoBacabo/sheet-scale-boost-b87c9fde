import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DraggableBlock } from "@/components/notes/DraggableBlock";
import { BlockTypeMenu } from "@/components/notes/BlockTypeMenu";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useIsMobile } from "@/hooks/use-mobile";

export interface Block {
  id: string;
  user_id: string;
  type: 'postit' | 'checklist' | 'idea' | 'file' | 'sketch';
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  color: string;
  content: any;
  created_at: string;
  updated_at: string;
}

const Notes = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const { toast } = useToast();
  const { t } = useLanguage();
  const isMobile = useIsMobile();

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
        title: t("notes.errorLoading"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createBlock = async (type: Block['type']) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate position accounting for pan and zoom
      const baseX = (window.innerWidth / 2 - panOffset.x) / zoom;
      const baseY = (window.innerHeight / 2 - panOffset.y) / zoom;

      const newBlock = {
        user_id: user.id,
        type,
        position_x: baseX - 150,
        position_y: baseY - 100,
        width: type === 'postit' ? 250 : type === 'sketch' ? 400 : 300,
        height: type === 'postit' ? 250 : type === 'sketch' ? 300 : 200,
        color: '#FEF08A',
        content: type === 'checklist' ? { items: [] } : {},
      };

      const { data, error } = await supabase
        .from('blocks')
        .insert([newBlock])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setBlocks(prev => [...prev, data as Block]);
        setIsPopoverOpen(false);
        toast({
          title: t("notes.blockCreated"),
          description: t("notes.dragAndEdit"),
        });
      }
    } catch (error: any) {
      console.error('Error creating block:', error);
      toast({
        title: t("notes.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateBlock = async (id: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ));

    await supabase
      .from('blocks')
      .update({
        position_x: updates.position_x,
        position_y: updates.position_y,
        width: updates.width,
        height: updates.height,
        color: updates.color,
        content: updates.content,
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
      toast({
        title: "Bloco eliminado",
        description: "O bloco foi removido",
      });
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on the canvas background, not on a block
    if (e.target === e.currentTarget) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
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
      <div className="flex w-full h-screen overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 relative p-0">
          {/* Header with Language Toggle */}
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <LanguageToggle />
          </div>

          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">{t("notes.loading")}</p>
              </div>
            </div>
          ) : (
            <div
              className="relative w-full h-full overflow-hidden bg-background"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              style={{
                cursor: isPanning ? 'grabbing' : 'grab',
                backgroundImage: `
                  linear-gradient(hsl(var(--border) / 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, hsl(var(--border) / 0.1) 1px, transparent 1px)
                `,
                backgroundSize: `${50 * zoom}px ${50 * zoom}px`,
                backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
              }}
            >
              {/* Zoom controls */}
              <div className={`fixed ${isMobile ? "top-16 right-4" : "top-16 right-4"} flex ${isMobile ? "flex-row" : "flex-col"} gap-2 z-40 bg-background/95 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-border`}>
                <Button
                  size={isMobile ? "icon" : "sm"}
                  variant="outline"
                  onClick={() => setZoom(z => Math.min(z + 0.1, 2))}
                  title={t("notes.zoomIn")}
                  className={isMobile ? "h-10 w-10" : ""}
                >
                  +
                </Button>
                <Button
                  size={isMobile ? "icon" : "sm"}
                  variant="outline"
                  onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}
                  title={t("notes.zoomOut")}
                  className={isMobile ? "h-10 w-10" : ""}
                >
                  -
                </Button>
                <Button
                  size={isMobile ? "icon" : "sm"}
                  variant="outline"
                  onClick={() => setZoom(1)}
                  title={t("notes.resetZoom")}
                  className={isMobile ? "h-10 w-10 text-xs" : "text-xs"}
                >
                  100%
                </Button>
              </div>

              {/* Canvas with blocks */}
              <div
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                  transformOrigin: '0 0',
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  pointerEvents: isPanning ? 'none' : 'auto',
                }}
              >
                {blocks.map((block) => (
                  <DraggableBlock
                    key={block.id}
                    block={block}
                    zoom={zoom}
                    onUpdate={updateBlock}
                    onDelete={deleteBlock}
                  />
                ))}
              </div>

              {/* Add button with menu */}
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="lg"
                    className={`fixed ${isMobile ? "bottom-4 right-4" : "bottom-8 right-8"} rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow z-50`}
                    title={t("notes.createNew")}
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className={isMobile ? "w-[90vw] max-w-sm" : "w-80"}
                  side="top" 
                  align="end"
                  sideOffset={10}
                >
                  <BlockTypeMenu onCreateBlock={createBlock} />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Notes;
