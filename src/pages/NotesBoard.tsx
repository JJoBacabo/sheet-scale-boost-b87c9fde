import { useState, useEffect, useCallback } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BlockWrapper } from "@/components/notes/BlockWrapper";
import { BlockCreationMenu } from "@/components/notes/BlockCreationMenu";
import { CanvasControls } from "@/components/notes/CanvasControls";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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

const POSTIT_COLORS = [
  { name: 'yellow', value: '#FEF08A' },
  { name: 'pink', value: '#FBC8D5' },
  { name: 'blue', value: '#BFDBFE' },
  { name: 'green', value: '#BBF7D0' },
  { name: 'gray', value: '#E5E7EB' },
];

const NotesBoard = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { toast } = useToast();

  const loadBlocks = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Loading blocks for user:', user.id);

      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading blocks:', error);
        toast({
          title: "Erro ao carregar",
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

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const createBlock = async (type: Block['type'], initialData: Partial<Block> = {}) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Creating block from menu:', type);

      const newBlock = {
        user_id: user.id,
        type,
        position_x: initialData.position_x || 100,
        position_y: initialData.position_y || 100,
        width: initialData.width || (type === 'postit' ? 250 : type === 'sketch' ? 400 : 300),
        height: initialData.height || (type === 'postit' ? 250 : type === 'sketch' ? 300 : 200),
        color: initialData.color || (type === 'postit' ? '#FEF08A' : undefined),
        content: initialData.content || (type === 'checklist' ? { items: [] } : {}),
      };

      const { data, error } = await supabase
        .from('blocks')
        .insert([newBlock])
        .select()
        .single();

      if (error) {
        console.error('Error creating block:', error);
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      } else if (data) {
        console.log('Block created successfully:', data);
        setBlocks(prev => [...prev, data as Block]);
        setIsPopoverOpen(false);
        toast({
          title: "Bloco criado",
          description: "Arraste e edite o bloco",
        });
      }
    } catch (err) {
      console.error('Exception:', err);
    }
  };

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setBlocks(prev => {
      const updated = prev.map(block => 
        block.id === id ? { ...block, ...updates } : block
      );
      
      // Save to database
      const blockToUpdate = updated.find(b => b.id === id);
      if (blockToUpdate) {
        supabase
          .from('blocks')
          .update({
            position_x: blockToUpdate.position_x,
            position_y: blockToUpdate.position_y,
            width: blockToUpdate.width,
            height: blockToUpdate.height,
            color: blockToUpdate.color,
            content: blockToUpdate.content,
          })
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('Error updating block:', error);
          });
      }
      
      return updated;
    });
  }, []);

  const deleteBlock = async (id: string) => {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', id);

    if (!error) {
      setBlocks(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleOrganize = () => {
    const gridSize = 50;
    const spacing = 20;
    const cols = 4;

    blocks.forEach((block, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * (300 + spacing) + gridSize;
      const y = row * (300 + spacing) + gridSize;

      updateBlock(block.id, { position_x: x, position_y: y });
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

  const renderBlockContent = (block: Block) => {
    switch (block.type) {
      case 'postit':
        return (
          <div className="w-full h-full flex flex-col gap-3">
            <div className="flex gap-1">
              {POSTIT_COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => updateBlock(block.id, { color: color.value })}
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                  aria-label={`Color ${color.name}`}
                />
              ))}
            </div>
            <Textarea
              value={block.content?.text || ''}
              onChange={(e) => updateBlock(block.id, { 
                content: { ...block.content, text: e.target.value } 
              })}
              placeholder="Digite sua nota..."
              className="flex-1 resize-none bg-transparent border-none text-foreground placeholder:text-muted-foreground focus-visible:ring-0 text-base"
              style={{ color: 'black' }}
            />
          </div>
        );

      case 'checklist':
        const items = block.content?.items || [];
        return (
          <div className="w-full h-full flex flex-col gap-3 overflow-auto">
            <Input
              value={block.content?.title || ''}
              onChange={(e) => updateBlock(block.id, {
                content: { ...block.content, title: e.target.value }
              })}
              placeholder="Título da lista"
              className="font-semibold"
            />
            <div className="flex-1 space-y-2 overflow-y-auto">
              {items.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={(checked) => {
                      const newItems = [...items];
                      newItems[index] = { ...item, checked };
                      updateBlock(block.id, {
                        content: { ...block.content, items: newItems }
                      });
                    }}
                  />
                  <Input
                    value={item.text}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index] = { ...item, text: e.target.value };
                      updateBlock(block.id, {
                        content: { ...block.content, items: newItems }
                      });
                    }}
                    className="flex-1"
                  />
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  updateBlock(block.id, {
                    content: {
                      ...block.content,
                      items: [...items, { text: '', checked: false }]
                    }
                  });
                }}
                className="w-full"
              >
                + Adicionar item
              </Button>
            </div>
          </div>
        );

      case 'idea':
        return (
          <div className="w-full h-full flex flex-col gap-3">
            <Input
              value={block.content?.title || ''}
              onChange={(e) => updateBlock(block.id, {
                content: { ...block.content, title: e.target.value }
              })}
              placeholder="Título da ideia"
              className="font-bold text-lg"
            />
            <Textarea
              value={block.content?.description || ''}
              onChange={(e) => updateBlock(block.id, {
                content: { ...block.content, description: e.target.value }
              })}
              placeholder="Descreva sua ideia..."
              className="flex-1 resize-none"
            />
          </div>
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {block.type} block
          </div>
        );
    }
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
            <>
              <div
                className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-background to-muted/20"
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
                <CanvasControls
                  zoom={zoom}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onResetZoom={handleResetZoom}
                  onOrganize={handleOrganize}
                />

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
                          className="w-full h-full rounded-lg shadow-lg p-4 bg-card border"
                          style={block.type === 'postit' ? { backgroundColor: block.color } : {}}
                        >
                          {renderBlockContent(block)}
                        </div>
                      </BlockWrapper>
                    ))}
                  </div>
                </div>

                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      size="lg"
                      className="fixed bottom-8 right-8 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow z-50"
                    >
                      <Plus className="h-6 w-6" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-80" 
                    side="top" 
                    align="end"
                    sideOffset={10}
                  >
                    <BlockCreationMenu onCreateBlock={createBlock} />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default NotesBoard;
