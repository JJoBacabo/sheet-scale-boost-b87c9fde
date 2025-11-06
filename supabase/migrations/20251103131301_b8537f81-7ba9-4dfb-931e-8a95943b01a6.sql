-- Enable realtime for profit_sheet_entries table
ALTER TABLE public.profit_sheet_entries REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profit_sheet_entries;