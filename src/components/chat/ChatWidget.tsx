import { MessageCircle, X } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { ChatInterface } from './ChatInterface';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffect, useRef } from 'react';

export const ChatWidget = () => {
  const { isOpen, openChat, closeChat } = useChat();
  const { language } = useLanguage();
  const chatRef = useRef<HTMLDivElement>(null);

  // Close chat when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && chatRef.current && !chatRef.current.contains(event.target as Node)) {
        closeChat();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeChat]);

  return (
    <>
      {/* Chat Interface */}
      {isOpen && (
        <div ref={chatRef} className="fixed bottom-6 right-6 z-50 w-[420px] h-[680px] bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-2xl border border-primary/30 rounded-[2rem] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-500">
          {/* Header */}
          <div className="relative bg-gradient-primary p-6 flex items-center justify-between overflow-hidden">
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/50 via-primary to-primary/50 animate-gradient bg-[length:200%_auto]" />
            
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/30">
                <MessageCircle className="w-7 h-7 text-white drop-shadow-lg" />
              </div>
              <div>
                <h3 className="text-white font-bold text-xl tracking-tight drop-shadow-md">
                  {language === 'pt' ? 'Suporte Sheet Boost' : 'Sheet Boost Support'}
                </h3>
                <p className="text-white/95 text-sm flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse" />
                  {language === 'pt' ? 'Online agora' : 'Online now'}
                </p>
              </div>
            </div>
            <button
              onClick={closeChat}
              className="relative w-11 h-11 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md transition-all duration-300 flex items-center justify-center group hover:rotate-90 border border-white/20 shadow-lg"
              aria-label="Close chat"
              title={language === 'pt' ? 'Fechar chat' : 'Close chat'}
            >
              <X className="w-6 h-6 text-white drop-shadow-md" />
            </button>
          </div>

          {/* Chat Interface */}
          <ChatInterface />
        </div>
      )}
    </>
  );
};
