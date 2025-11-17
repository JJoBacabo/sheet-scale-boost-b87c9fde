import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Plus, StickyNote as StickyNoteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NoteCard } from "@/components/notes/NoteCard";
import { motion } from "framer-motion";

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
        .order('created_at', { ascending: false });

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
        position_x: 0,
        position_y: 0,
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
        setNotes(prev => [data as Note, ...prev]);
        toast({
          title: "Nota criada",
          description: "Nova nota adicionada com sucesso",
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

  const updateNote = async (id: string, text: string, color: string) => {
    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, content: { text }, color } : note
    ));

    await supabase
      .from('blocks')
      .update({
        content: { text },
        color,
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
        description: "A nota foi removida com sucesso",
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <div className="p-8 w-full">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
                    <StickyNoteIcon className="w-10 h-10 text-primary" />
                    Minhas Notas
                  </h1>
                  <p className="text-muted-foreground">
                    Crie e organize suas notas
                  </p>
                </div>
                <Button
                  onClick={createNote}
                  size="lg"
                  className="gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Nova Nota
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando notas...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Empty State */}
                {notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <StickyNoteIcon className="w-20 h-20 text-muted-foreground/20 mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Nenhuma nota ainda
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Crie sua primeira nota para começar
                    </p>
                    <Button onClick={createNote} size="lg" className="gap-2">
                      <Plus className="w-5 h-5" />
                      Criar Primeira Nota
                    </Button>
                  </div>
                ) : (
                  /* Notes Grid */
                  <motion.div 
                    className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {notes.map((note, index) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <NoteCard
                          note={note}
                          onUpdate={updateNote}
                          onDelete={deleteNote}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Notes;
