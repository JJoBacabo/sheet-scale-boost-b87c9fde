import { ChatMessage as ChatMessageType } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Bot, User, Shield } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  onOptionClick?: (option: any) => void;
}

export const ChatMessage = ({ message, onOptionClick }: ChatMessageProps) => {
  const isBot = message.type === 'bot';
  const isAdmin = message.type === 'admin';
  const isUser = message.type === 'user';

  return (
    <div className={`flex gap-3 ${isBot || isAdmin ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      {/* Avatar */}
      {(isBot || isAdmin) && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isAdmin ? 'bg-primary' : 'bg-gradient-primary'
        }`}>
          {isAdmin ? (
            <Shield className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>
      )}

      {/* Content */}
      <div className={`flex flex-col gap-2 max-w-[80%] ${!isBot && !isAdmin ? 'items-end' : ''}`}>
        {/* Message Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isBot || isAdmin
              ? 'bg-muted text-foreground rounded-tl-none'
              : 'bg-primary text-primary-foreground rounded-tr-none'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Options */}
        {message.options && message.options.length > 0 && (
          <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-bottom-1 duration-500">
            {message.options.map((option) => (
              <Button
                key={option.id}
                onClick={() => onOptionClick?.(option)}
                variant="outline"
                className="justify-start text-left h-auto py-3 px-4 bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all duration-300 group border-2"
              >
                <span className="group-hover:translate-x-1 transition-transform duration-300 font-medium">
                  {option.label}
                </span>
              </Button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground px-2">
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>

      {/* User Avatar */}
      {!isBot && !isAdmin && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
};
