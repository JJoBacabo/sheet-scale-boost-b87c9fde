-- Add password field to supplier_quote_sessions
ALTER TABLE public.supplier_quote_sessions
ADD COLUMN IF NOT EXISTS password TEXT;