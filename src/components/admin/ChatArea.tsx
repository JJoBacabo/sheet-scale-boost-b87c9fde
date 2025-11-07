import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SupportChat } from '@/hooks/useAdminSupport';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Trash2, Send, User, UserCog, FileText, Check, X, AlertTriangle, MessageSquare } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChatAreaProps {
  ticket: SupportChat | null;
  onSendMessage: (message: string) => void;
  onMarkAsResolved: () => void;
  onReopenTicket?: () => void;
  onDelete: () => void;
  onUpdateNotes: (notes: string) => void;
  onUpdatePriority?: (priority: 'low' | 'medium' | 'high' | 'urgent') => void;
  onClaimTicket: () => void;
  currentAdminId: string;
}

// Helper function to get display name (name or email username)
const getDisplayName = (fullName?: string | null, email?: string | null): string => {
  if (fullName?.trim()) {
    return fullName.trim();
  }
  if (email) {
    // Extract username from email (part before @)
    return email.split('@')[0];
  }
  return 'User';
};

export const ChatArea = ({ 
  ticket, 
  onSendMessage, 
  onMarkAsResolved,
  onReopenTicket,
  onDelete,
  onUpdateNotes,
  onUpdatePriority,
  onClaimTicket,
  currentAdminId 
}: ChatAreaProps) => {
  const { language } = useLanguage();
  const isPortuguese = language === 'pt';
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ticket) {
      setNotes(ticket.notes || '');
      setOriginalNotes(ticket.notes || '');
    }
  }, [ticket?.id]);

  useEffect(() => {
    // Log messages for debugging
    if (ticket?.messages) {
      console.log('💬 ChatArea messages updated:', ticket.messages.length, 'messages');
      console.log('Last message:', ticket.messages[ticket.messages.length - 1]);
    }
    
    // Scroll to bottom when messages change
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [ticket?.messages, ticket?.messages?.length]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveNotes = () => {
    onUpdateNotes(notes);
    setOriginalNotes(notes);
  };

  const handleDeleteNotes = () => {
    setNotes('');
    setOriginalNotes('');
    onUpdateNotes('');
  };

  const notesChanged = notes !== originalNotes;

  if (!ticket) {
    return (
      <div className="h-full flex items-center justify-center bg-background/50">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">
            {isPortuguese ? 'Selecione um ticket para começar' : 'Select a ticket to start'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {(() => {
                  const displayName = getDisplayName(ticket.profiles?.full_name, ticket.profiles?.email);
                  return displayName[0]?.toUpperCase() || 'U';
                })()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-bold text-lg text-foreground">
                {getDisplayName(ticket.profiles?.full_name, ticket.profiles?.email)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {ticket.language === 'pt' ? '🇵🇹 Português' : '🇬🇧 English'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!ticket.admin_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClaimTicket}
                className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <UserCog className="h-4 w-4" />
                {isPortuguese ? 'Atribuir a Mim' : 'Claim'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes(!showNotes)}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {isPortuguese ? 'Notas' : 'Notes'}
            </Button>
            {(ticket.status?.toLowerCase().trim() === 'resolved') ? (
              onReopenTicket && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReopenTicket}
                  className="gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {isPortuguese ? 'Reabrir' : 'Reopen'}
                </Button>
              )
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={onMarkAsResolved}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {isPortuguese ? 'Resolver' : 'Resolve'}
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isPortuguese ? 'Eliminar ticket?' : 'Delete ticket?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isPortuguese 
                      ? 'Esta ação não pode ser desfeita. O ticket será permanentemente eliminado.'
                      : 'This action cannot be undone. The ticket will be permanently deleted.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {isPortuguese ? 'Cancelar' : 'Cancel'}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>
                    {isPortuguese ? 'Eliminar' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {showNotes && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">
                {isPortuguese ? 'Notas internas (apenas admin)' : 'Internal notes (admin only)'}
              </label>
              <div className="flex gap-2">
                {notes && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-destructive hover:text-destructive">
                        <X className="h-3 w-3" />
                        {isPortuguese ? 'Limpar' : 'Clear'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {isPortuguese ? 'Eliminar notas?' : 'Delete notes?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {isPortuguese 
                            ? 'Tem a certeza que deseja eliminar todas as notas?'
                            : 'Are you sure you want to delete all notes?'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          {isPortuguese ? 'Cancelar' : 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteNotes}>
                          {isPortuguese ? 'Eliminar' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 gap-1"
                  onClick={handleSaveNotes}
                  disabled={!notesChanged}
                >
                  <Check className="h-3 w-3" />
                  {isPortuguese ? 'Guardar' : 'Save'}
                </Button>
              </div>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isPortuguese ? 'Adicionar notas...' : 'Add notes...'}
              className="min-h-[80px] bg-background"
            />
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{isPortuguese ? 'Prioridade:' : 'Priority:'}</span>
            <Select
              value={ticket.priority || 'medium'}
              onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => {
                onUpdatePriority?.(value);
              }}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{isPortuguese ? 'Baixa' : 'Low'}</SelectItem>
                <SelectItem value="medium">{isPortuguese ? 'Média' : 'Medium'}</SelectItem>
                <SelectItem value="high">{isPortuguese ? 'Alta' : 'High'}</SelectItem>
                <SelectItem value="urgent">{isPortuguese ? 'Urgente' : 'Urgent'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className={cn(
            (ticket.status?.toLowerCase().trim() === 'resolved') && "bg-blue-500/10 text-blue-500",
            (ticket.status?.toLowerCase().trim() === 'active') && "bg-green-500/10 text-green-500",
            (ticket.status?.toLowerCase().trim() === 'waiting' || !ticket.status) && "bg-yellow-500/10 text-yellow-500"
          )}>
            {ticket.status?.toLowerCase().trim() === 'resolved' 
              ? (isPortuguese ? 'Resolvido' : 'Resolved')
              : ticket.status?.toLowerCase().trim() === 'active'
              ? (isPortuguese ? 'Ativo' : 'Active')
              : (isPortuguese ? 'Pendente' : 'Waiting')}
          </Badge>
          {ticket.category && (
            <Badge variant="secondary">
              {ticket.category}
            </Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Array.isArray(ticket.messages) && ticket.messages
          .filter((msg: any) => msg && typeof msg === 'object' && (msg.content || msg.message)) // Validate message structure
          .map((msg: any, idx: number) => {
            const isAdmin = msg.type === 'admin' || msg.sender === 'admin';
            const isUser = msg.type === 'user' || msg.sender === 'user';
            const isBot = msg.type === 'bot';
            
            // Skip rendering bot options in admin view
            if (msg.options) return null;
            
            const messageContent = msg.content || msg.message || '';
            const messageTimestamp = msg.timestamp || new Date().toISOString();
            
            return (
              <div
                key={msg.id || `msg-${idx}-${messageTimestamp}`}
                className={cn(
                  "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  isAdmin ? "justify-end" : "justify-start"
                )}
              >
                {!isAdmin && (
                  <Avatar className="shrink-0">
                    <AvatarFallback className="bg-muted">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                  "max-w-[70%] space-y-1",
                  isAdmin && "items-end"
                )}>
                  <div className={cn(
                    "rounded-2xl px-4 py-3",
                    isAdmin 
                      ? "bg-primary text-primary-foreground rounded-br-none" 
                      : isBot
                      ? "bg-muted/50 text-muted-foreground rounded-bl-none"
                      : "bg-muted text-foreground rounded-bl-none"
                  )}>
                    <p className="whitespace-pre-wrap break-words">{messageContent}</p>
                  </div>
                  <p className="text-xs text-muted-foreground px-2">
                    {(() => {
                      try {
                        const date = new Date(messageTimestamp);
                        if (isNaN(date.getTime())) return '';
                        return formatDistanceToNow(date, {
                          addSuffix: true,
                          locale: isPortuguese ? pt : enUS
                        });
                      } catch {
                        return '';
                      }
                    })()}
                  </p>
                </div>
                {isAdmin && (
                  <Avatar className="shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <UserCog className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {ticket.status?.toLowerCase().trim() !== 'resolved' && (
        <div className="p-4 border-t border-border bg-card">
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isPortuguese ? 'Escreva a sua resposta...' : 'Type your response...'}
              className="min-h-[60px] resize-none"
            />
            <Button 
              onClick={handleSend}
              disabled={!message.trim()}
              className="shrink-0 h-[60px] w-[60px]"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

