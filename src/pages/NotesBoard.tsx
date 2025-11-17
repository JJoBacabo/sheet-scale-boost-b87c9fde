import { useState, useEffect, useCallback, memo } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Background3D } from "@/components/ui/Background3D";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const { toast } = useToast();

  const debouncedBlocks = useDebounce(blocks, 500);

  // Load blocks
  useEffect(() => {
    loadBlocks();
  }, []);

  // Auto-save blocks
  useEffect(() => {
    if (debouncedBlocks.length > 0) {
      saveBlocks(debouncedBlocks);
    }
  }, [debouncedBlocks]);

  const loadBlocks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: "Error loading blocks",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setBlocks(data as Block[]);
    }
  };

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

  const createBlock = async (type: Block['type'], initialData: Partial<Block> = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
      toast({
        title: "Error creating block",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setBlocks([...blocks, data as Block]);
      setIsDialogOpen(false);
      toast({
        title: "Block created",
        description: `${type} block has been created successfully.`,
      });
    }
  };

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ));
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
      setBlocks(blocks.filter(b => b.id !== id));
      toast({
        title: "Block deleted",
        description: "Block has been deleted successfully.",
      });
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleOrganize = () => {
    const GRID_SIZE = 350;
    const MARGIN = 20;
    
    setBlocks(prev => prev.map((block, index) => ({
      ...block,
      position_x: (index % 4) * GRID_SIZE + MARGIN,
      position_y: Math.floor(index / 4) * GRID_SIZE + MARGIN,
    })));

    toast({
      title: "Blocks organized",
      description: "All blocks have been arranged in a grid.",
    });
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

  const renderBlock = (block: Block) => {
    const commonProps = {
      key: block.id,
      block,
      onUpdate: updateBlock,
      onDelete: deleteBlock,
      zoom,
    };

    switch (block.type) {
      case 'postit':
        return <PostItBlock {...commonProps} />;
      case 'checklist':
        return <ChecklistBlock {...commonProps} />;
      case 'idea':
        return <IdeaCardBlock {...commonProps} />;
      case 'file':
        return <FileBlock {...commonProps} />;
      case 'sketch':
        return <SketchBlock {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex relative overflow-hidden">
        <Background3D />
        
        <div className="flex flex-1 relative z-10">
          <AppSidebar />

          <SidebarInset className="flex-1 transition-all duration-300 relative bg-background/20 backdrop-blur-[2px]">
            <div className="relative w-full h-screen overflow-hidden bg-card">
        {/* Canvas */}
        <div
          className="absolute inset-0 bg-background"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            cursor: isPanning ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              width: '100%',
              height: '100%',
              position: 'relative',
            }}
          >
            {blocks.map(renderBlock)}
          </div>
        </div>

        {/* Controls */}
        <CanvasControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          onOrganize={handleOrganize}
        />

        {/* FAB */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-2xl z-50 hover:scale-110 transition-transform"
            >
              <Plus className="h-7 w-7" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Block</DialogTitle>
            </DialogHeader>
            <BlockCreationMenu onCreateBlock={createBlock} />
          </DialogContent>
        </Dialog>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
});

export default NotesBoard;
