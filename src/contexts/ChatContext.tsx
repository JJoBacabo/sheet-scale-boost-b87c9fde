import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChatLanguage, ChatMessage, ChatStatus, ChatCategory } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { getCategoryQuestion, getCategoryOptions, getAnswerForStep, getBackToMainOption } from '@/utils/chatFlows';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './LanguageContext';

interface ChatContextType {
  isOpen: boolean;
  language: ChatLanguage;
  messages: ChatMessage[];
  status: ChatStatus;
  category?: ChatCategory;
  adminMode: boolean;
  adminOnline: boolean;
  chatId?: string;
  openChat: () => void;
  closeChat: () => void;
  resetChat: () => void;
  sendMessage: (content: string) => void;
  selectOption: (option: any) => void;
  switchToAdmin: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language: userLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('active');
  const [category, setCategory] = useState<ChatCategory>();
  const [adminMode, setAdminMode] = useState(false);
  const [adminOnline] = useState(false);
  const [chatId, setChatId] = useState<string>();
  const { toast } = useToast();

  const language: ChatLanguage = userLanguage as ChatLanguage;

  // Setup realtime subscription for admin responses
  useEffect(() => {
    if (!chatId || !adminMode) return;

    const channel = supabase
      .channel(`support-chat-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_chats',
          filter: `id=eq.${chatId}`
        },
        (payload) => {
          console.log('Chat updated:', payload);
          const updatedChat = payload.new;
          
          // Parse messages and update if they changed
          let newMessages = updatedChat.messages;
          if (typeof newMessages === 'string') {
            try {
              newMessages = JSON.parse(newMessages);
            } catch (e) {
              console.error('Error parsing messages:', e);
              return;
            }
          }

          if (Array.isArray(newMessages)) {
            console.log('📨 Realtime update received');
            console.log('Current messages count:', messages.length);
            console.log('New messages count:', newMessages.length);
            
            // Update if different count or different last message
            if (newMessages.length !== messages.length) {
              console.log('✅ Updating messages - count changed');
              setMessages(newMessages);
            } else if (newMessages.length > 0 && messages.length > 0) {
              const lastNew = newMessages[newMessages.length - 1];
              const lastCurrent = messages[messages.length - 1];
              
              if (lastNew.content !== lastCurrent.content || lastNew.type !== lastCurrent.type) {
                console.log('✅ Updating messages - last message changed');
                setMessages(newMessages);
              }
            }
          }

          // Update status
          if (updatedChat.status === 'active' && status === 'waiting') {
            setStatus('active');
            toast({
              title: language === 'pt' ? 'Admin conectado' : 'Admin connected',
              description: language === 'pt' 
                ? 'Um administrador juntou-se ao chat' 
                : 'An administrator has joined the chat'
            });
          }

          if (updatedChat.status === 'resolved') {
            setStatus('resolved');
            toast({
              title: language === 'pt' ? 'Chat resolvido' : 'Chat resolved',
              description: language === 'pt' 
                ? 'Este chat foi marcado como resolvido' 
                : 'This chat has been marked as resolved'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, adminMode, messages.length]);

  // Update chat when language changes - reset completely
  useEffect(() => {
    if (messages.length > 0) {
      // Reset everything and reinitialize
      setMessages([]);
      setStatus('active');
      setCategory(undefined);
      setAdminMode(false);
      setChatId(undefined);
      
      // Reinitialize if chat is open
      if (isOpen) {
        setTimeout(() => {
          initializeChat();
        }, 100);
      }
    }
  }, [language]);

  const openChat = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      initializeChat();
    }
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  const resetChat = () => {
    setMessages([]);
    setStatus('active');
    setCategory(undefined);
    setAdminMode(false);
    setChatId(undefined);
    initializeChat();
  };

  const initializeChat = () => {
    const welcomeMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'bot',
      content: language === 'pt' 
        ? 'Olá! 👋 Sou o assistente Sheet Boost. Como posso ajudar?'
        : 'Hi there! 👋 I\'m the Sheet Boost assistant. How can I help you today?',
      timestamp: new Date(),
      options: getMainCategories()
    };
    setMessages([welcomeMessage]);
  };

  const getMainCategories = () => {
    return language === 'pt' ? [
      { id: 'meta', label: 'Integração Meta', category: 'meta_integration' as ChatCategory },
      { id: 'login', label: 'Login / Acesso', category: 'login' as ChatCategory },
      { id: 'dashboard', label: 'Dashboard / Campanhas', category: 'dashboard' as ChatCategory },
      { id: 'payments', label: 'Pagamentos', category: 'payments' as ChatCategory },
      { id: 'technical', label: 'Erros Técnicos', category: 'technical' as ChatCategory },
      { id: 'admin', label: 'Falar com Administrador', isAdminRequest: true }
    ] : [
      { id: 'meta', label: 'Meta Integration', category: 'meta_integration' as ChatCategory },
      { id: 'login', label: 'Login / Access', category: 'login' as ChatCategory },
      { id: 'dashboard', label: 'Dashboard / Campaigns', category: 'dashboard' as ChatCategory },
      { id: 'payments', label: 'Payments', category: 'payments' as ChatCategory },
      { id: 'technical', label: 'Technical Errors', category: 'technical' as ChatCategory },
      { id: 'admin', label: 'Talk to Admin', isAdminRequest: true }
    ];
  };

  const sendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Save to Supabase if in admin mode
    if (adminMode && chatId) {
      await saveChatToSupabase(newMessages);
    }
  };

  const selectOption = async (option: any) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: option.label,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    if (option.isAdminRequest) {
      switchToAdmin();
      return;
    }

    if (option.category) {
      setCategory(option.category);
      setTimeout(() => {
        const question = getCategoryQuestion(option.category, language);
        const categoryOptions = getCategoryOptions(option.category, language);
        
        const botMessage: ChatMessage = {
          id: crypto.randomUUID(),
          type: 'bot',
          content: question,
          timestamp: new Date(),
          options: categoryOptions
        };

        setMessages(prev => [...prev, botMessage]);
      }, 500);
      return;
    }

    if (option.nextStep) {
      if (option.nextStep === 'main_menu') {
        setTimeout(() => {
          const welcomeMessage: ChatMessage = {
            id: crypto.randomUUID(),
            type: 'bot',
            content: language === 'pt' 
              ? 'Como posso ajudar mais?'
              : 'How else can I help you?',
            timestamp: new Date(),
            options: getMainCategories()
          };
          setMessages(prev => [...prev, welcomeMessage]);
        }, 500);
      } else {
        setTimeout(() => {
          const answer = getAnswerForStep(option.nextStep, language);
          const backOption = getBackToMainOption(language);
          
          const botMessage: ChatMessage = {
            id: crypto.randomUUID(),
            type: 'bot',
            content: answer,
            timestamp: new Date(),
            options: [backOption]
          };

          setMessages(prev => [...prev, botMessage]);
        }, 800);
      }
    }
  };

  const switchToAdmin = async () => {
    setAdminMode(true);
    setStatus('waiting');

    const adminMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'bot',
      content: language === 'pt'
        ? 'Um administrador irá responder em breve. Por favor, descreva o seu problema.'
        : 'An administrator will join shortly. Please describe your issue.',
      timestamp: new Date()
    };

    const newMessages = [...messages, adminMessage];
    setMessages(newMessages);

    // Create chat in Supabase - use 'waiting' status (matches database default behavior)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        // Validate messages structure
        const validMessages = newMessages.map(msg => ({
          id: msg.id || crypto.randomUUID(),
          type: msg.type || 'user',
          content: msg.content || '',
          timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString()
        }));

        const { data, error } = await supabase
          .from('support_chats')
          .insert({
            user_id: user.id,
            language: language || 'pt',
            category: category || null,
            status: 'waiting', // Explicitly set to waiting
            messages: validMessages as any
          })
          .select()
          .single();

        if (data && !error) {
          setChatId(data.id);
        } else if (error) {
          console.error('Error creating chat:', error);
          toast({
            title: language === 'pt' ? 'Erro' : 'Error',
            description: language === 'pt' 
              ? 'Falha ao criar ticket de suporte' 
              : 'Failed to create support ticket',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Error in switchToAdmin:', error);
        toast({
          title: language === 'pt' ? 'Erro' : 'Error',
          description: language === 'pt' 
            ? 'Falha ao criar ticket de suporte' 
            : 'Failed to create support ticket',
          variant: 'destructive'
        });
      }
    }

    toast({
      title: language === 'pt' ? 'Conectado ao suporte' : 'Connected to support',
      description: language === 'pt' 
        ? 'Um administrador foi notificado' 
        : 'An administrator has been notified'
    });
  };

  const saveChatToSupabase = async (msgs: ChatMessage[]) => {
    if (!chatId) return;

    try {
      // Validate messages structure before saving
      const validMessages = msgs.map(msg => ({
        id: msg.id || crypto.randomUUID(),
        type: msg.type || 'user',
        content: msg.content || '',
        timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString()
      })).filter(msg => msg.content.trim().length > 0); // Only save messages with content

      const { error } = await supabase
        .from('support_chats')
        .update({
          messages: validMessages as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId);

      if (error) {
        console.error('Error saving chat:', error);
      }
    } catch (error) {
      console.error('Error in saveChatToSupabase:', error);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        language,
        messages,
        status,
        category,
        adminMode,
        adminOnline,
        chatId,
        openChat,
        closeChat,
        resetChat,
        sendMessage,
        selectOption,
        switchToAdmin
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
