-- Add priority column to support_chats table
ALTER TABLE public.support_chats
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Create index for priority
CREATE INDEX IF NOT EXISTS idx_support_chats_priority ON public.support_chats(priority);

-- Update existing tickets to have medium priority
UPDATE public.support_chats
SET priority = 'medium'
WHERE priority IS NULL;

