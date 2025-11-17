import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DraggableNote } from "@/components/notes/DraggableNote";

interface Note {
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

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'postit')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setNotes(data as Note[]);
    } catch (error: any) {
      console.error('Error loading notes:', error);
      toast({
        title: "Erro ao carregar notas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const colors = ['#FEF08A', '#FBC8D5', '#BFDBFE', '#BBF7D0', '#E5E7EB'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newNote = {
        user_id: user.id,
        type: 'postit',
        position_x: 100 + Math.random() * 300,
        position_y: 100 + Math.random() * 300,
        width: 250,
        height: 250,
        color: randomColor,
        content: { text: '' },
      };

      const { data, error } = await supabase
        .from('blocks')
        .insert([newNote])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setNotes(prev => [...prev, data as Note]);
        toast({
          title: "Nota criada",
          description: "Arraste e edite sua nota",
        });
      }
    } catch (error: any) {
      console.error('Error creating note:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, ...updates } : note
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

  const deleteNote = async (id: string) => {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotes(prev => prev.filter(n => n.id !== id));
      toast({
        title: "Nota eliminada",
        description: "A nota foi removida",
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="flex w-full h-screen overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            </div>
          ) : (
            <div
              className="relative w-full h-full overflow-hidden bg-background"
              style={{
                backgroundImage: `
                  linear-gradient(hsl(var(--border) / 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, hsl(var(--border) / 0.1) 1px, transparent 1px)
                `,
                backgroundSize: `${50 * zoom}px ${50 * zoom}px`,
              }}
            >
              {/* Zoom controls */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-50">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(z => Math.min(z + 0.1, 2))}
                  className="bg-background/95 backdrop-blur-sm"
                >
                  +
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}
                  className="bg-background/95 backdrop-blur-sm"
                >
                  -
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom(1)}
                  className="bg-background/95 backdrop-blur-sm text-xs"
                >
                  100%
                </Button>
              </div>

              {/* Canvas with notes */}
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: '0 0',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                }}
              >
                {notes.map((note) => (
                  <DraggableNote
                    key={note.id}
                    note={note}
                    zoom={zoom}
                    onUpdate={updateNote}
                    onDelete={deleteNote}
                  />
                ))}
              </div>

              {/* Add button */}
              <Button
                size="lg"
                onClick={createNote}
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

export default Notes;
