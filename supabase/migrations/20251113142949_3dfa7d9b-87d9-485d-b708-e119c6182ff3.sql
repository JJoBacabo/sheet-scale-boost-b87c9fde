-- Enable real-time updates for supplier_quotes table
ALTER TABLE public.supplier_quotes REPLICA IDENTITY FULL;

-- Add the table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_quotes;