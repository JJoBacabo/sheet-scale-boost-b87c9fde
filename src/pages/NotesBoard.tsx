import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PostItBlock } from "@/components/notes/PostItBlock";
import { ChecklistBlock } from "@/components/notes/ChecklistBlock";
import { IdeaCardBlock } from "@/components/notes/IdeaCardBlock";
import { FileBlock } from "@/components/notes/FileBlock";
import { SketchBlock } from "@/components/notes/SketchBlock";
import { BlockCreationMenu } from "@/components/notes/BlockCreationMenu";
import { CanvasControls } from "@/components/notes/CanvasControls";
import { useDebounce } from "@/hooks/useDebounce";

export interface Block {
  id: string;
  user_id: string;
  type: 'postit' | 'checklist' | 'idea' | 'file' | 'sketch';
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  color?: string;
  content: any;
  created_at: string;
  updated_at: string;
}

const NotesBoard = memo(() => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const debouncedBlocks = useDebounce(blocks, 500);

  const loadBlocks = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        setIsLoading(false);
        return;
      }

      console.log('Loading blocks for user:', user.id);

      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading blocks:', error);
        toast({
          title: "Erro ao carregar blocos",
          description: error.message,
          variant: "destructive",
        });
      } else if (data) {
        console.log('Loaded blocks:', data);
        setBlocks(data as Block[]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const saveBlocks = async (blocksToSave: Block[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update all blocks
    for (const block of blocksToSave) {
      const { error } = await supabase
        .from('blocks')
        .update({
          position_x: block.position_x,
          position_y: block.position_y,
          width: block.width,
          height: block.height,
          color: block.color,
          content: block.content,
        })
        .eq('id', block.id);

      if (error) {
        console.error('Error updating block:', error);
      }
    }
  };

  // Load blocks on mount
  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  // Auto-save blocks
  useEffect(() => {
    if (debouncedBlocks.length > 0 && !isLoading) {
      saveBlocks(debouncedBlocks);
    }
  }, [debouncedBlocks, isLoading]);

  const createBlock = useCallback(async (type: Block['type'], initialData: Partial<Block> = {}) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      console.log('Creating block of type:', type);

      const newBlock = {
        user_id: user.id,
        type,
        position_x: initialData.position_x || 100,
        position_y: initialData.position_y || 100,
        width: initialData.width || (type === 'postit' ? 250 : type === 'sketch' ? 400 : 300),
        height: initialData.height || (type === 'postit' ? 250 : type === 'sketch' ? 300 : 200),
        color: initialData.color || (type === 'postit' ? '#FEF08A' : undefined),
        content: initialData.content || {},
      };

      const { data, error } = await supabase
        .from('blocks')
        .insert([newBlock])
        .select()
        .single();

      if (error) {
        console.error('Error creating block:', error);
        toast({
          title: "Erro ao criar bloco",
          description: error.message,
          variant: "destructive",
        });
      } else if (data) {
        console.log('Block created successfully:', data);
        setBlocks(prev => [...prev, data as Block]);
        toast({
          title: "Bloco criado",
          description: "O bloco foi adicionado com sucesso",
        });
      }
    } catch (err) {
      console.error('Exception creating block:', err);
    }
  }, [toast]);

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setBlocks(blocks => 
      blocks.map(block => 
        block.id === id ? { ...block, ...updates } : block
      )
    );
  }, []);

  const deleteBlock = async (id: string) => {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error deleting block",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setBlocks(blocks.filter(block => block.id !== id));
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 2));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleOrganize = () => {
    const gridSize = 50;
    const spacing = 20;
    const blocksPerRow = 4;

    blocks.forEach((block, index) => {
      const row = Math.floor(index / blocksPerRow);
      const col = index % blocksPerRow;
      const x = col * (300 + spacing) + gridSize;
      const y = row * (300 + spacing) + gridSize;

      updateBlock(block.id, {
        position_x: x,
        position_y: y,
      });
    });
  };

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDraggingBlock) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [isDraggingBlock, pan.x, pan.y]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && !isDraggingBlock) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [isPanning, panStart.x, panStart.y]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const renderBlock = useCallback((block: Block) => {
    const commonProps = {
      block,
      onUpdate: updateBlock,
      onDelete: deleteBlock,
      zoom,
      onDragStart: () => setIsDraggingBlock(true),
      onDragEnd: () => setIsDraggingBlock(false),
    };

    switch (block.type) {
      case 'postit':
        return <PostItBlock key={block.id} {...commonProps} />;
      case 'checklist':
        return <ChecklistBlock key={block.id} {...commonProps} />;
      case 'idea':
        return <IdeaCardBlock key={block.id} {...commonProps} />;
      case 'file':
        return <FileBlock key={block.id} {...commonProps} />;
      case 'sketch':
        return <SketchBlock key={block.id} {...commonProps} />;
      default:
        return null;
    }
  }, [zoom, updateBlock, deleteBlock]);

  // Memoize rendered blocks
  const renderedBlocks = useMemo(() => blocks.map(renderBlock), [blocks, renderBlock]);

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
            <>
              {/* Main Canvas */}
              <div
                className="relative w-full h-screen overflow-hidden"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                style={{
                  cursor: isPanning ? 'grabbing' : 'grab',
                  backgroundImage: `
                    linear-gradient(rgba(var(--border-rgb, 200, 200, 200), 0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(var(--border-rgb, 200, 200, 200), 0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: `${50 * zoom}px ${50 * zoom}px`,
                  backgroundPosition: `${pan.x}px ${pan.y}px`,
                }}
              >
                {/* Canvas Controls */}
                <CanvasControls
                  zoom={zoom}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onResetZoom={handleResetZoom}
                  onOrganize={handleOrganize}
                />

                {/* Blocks */}
                <div
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                  }}
                >
                  {renderedBlocks}
                </div>
              </div>

              {/* Floating Action Button with Popover */}
              <Popover open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  side="top" 
                  align="end" 
                  className="w-[400px] p-4 mb-2 bg-background border-border"
                  sideOffset={8}
                >
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Adicionar Elemento</h3>
                    <BlockCreationMenu
                      onCreateBlock={(type) => {
                        console.log('Creating block from menu:', type);
                        createBlock(type);
                        setIsDialogOpen(false);
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
});

NotesBoard.displayName = 'NotesBoard';

export default NotesBoard;
