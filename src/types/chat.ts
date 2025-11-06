export type ChatLanguage = 'pt' | 'en';

export type ChatStatus = 'active' | 'waiting' | 'resolved';

export type ChatCategory = 
  | 'meta_integration'
  | 'login'
  | 'dashboard'
  | 'payments'
  | 'technical'
  | 'admin';

export interface ChatMessage {
  id: string;
  type: 'bot' | 'user' | 'admin';
  content: string;
  timestamp: Date;
  options?: ChatOption[];
}

export interface ChatOption {
  id: string;
  label: string;
  nextStep?: string;
  category?: ChatCategory;
  isAdminRequest?: boolean;
}

export interface SupportChat {
  id: string;
  user_id: string;
  category?: string;
  language: ChatLanguage;
  status: ChatStatus;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}
