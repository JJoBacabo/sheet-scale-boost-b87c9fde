import { useEffect, useRef, useState } from 'react';
import { Send, RotateCcw, MessageCircle } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { ChatMessage } from './ChatMessage';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const ChatInterface = () => {
  const { 
    messages, 
    adminMode, 
    adminOnline, 
    language, 
    sendMessage, 
    selectOption,
    resetChat
  } = useChat();
  
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleOptionClick = (option: any) => {
    selectOption(option);
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Admin Status */}
      {adminMode && (
        <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {language === 'pt' ? 'Modo administrador' : 'Admin mode'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${adminOnline ? 'bg-primary' : 'bg-red-500'} animate-pulse`} />
              <span className="text-xs font-medium text-muted-foreground">
                {adminOnline 
                  ? (language === 'pt' ? 'Online' : 'Online')
                  : (language === 'pt' ? 'Aguardando' : 'Waiting')
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Reset Button Bar */}
      {messages.length > 0 && !adminMode && (
        <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {language === 'pt' ? 'Conversação ativa' : 'Active conversation'}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={resetChat}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs hover:bg-primary/10"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {language === 'pt' ? 'Recomeçar' : 'Restart'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {language === 'pt' ? 'Iniciar nova conversa' : 'Start new conversation'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2 px-4">
              <div className="w-16 h-16 rounded-full bg-gradient-primary/20 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'pt' 
                  ? 'Olá! Como posso ajudar hoje?'
                  : 'Hello! How can I help you today?'}
              </p>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <ChatMessage 
            key={message.id} 
            message={message}
            onOptionClick={handleOptionClick}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input (only in admin mode) */}
      {adminMode && (
        <div className="p-4 border-t border-border bg-background">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={language === 'pt' ? 'Digite sua mensagem...' : 'Type your message...'}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="btn-gradient"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
