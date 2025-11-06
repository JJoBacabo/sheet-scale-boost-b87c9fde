-- Create profit_sheet_entries table for storing manual values (outros gastos, refunds)
CREATE TABLE IF NOT EXISTS public.profit_sheet_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shopify_integration_id UUID NOT NULL,
  ad_account_id TEXT NOT NULL,
  date DATE NOT NULL,
  other_expenses NUMERIC DEFAULT 0,
  manual_refunds NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, shopify_integration_id, ad_account_id, date)
);

-- Enable RLS
ALTER TABLE public.profit_sheet_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own entries"
  ON public.profit_sheet_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entries"
  ON public.profit_sheet_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries"
  ON public.profit_sheet_entries
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries"
  ON public.profit_sheet_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_profit_entries_user_date ON public.profit_sheet_entries(user_id, date DESC);
CREATE INDEX idx_profit_entries_integrations ON public.profit_sheet_entries(shopify_integration_id, ad_account_id);

-- Trigger for updated_at
CREATE TRIGGER update_profit_entries_updated_at
  BEFORE UPDATE ON public.profit_sheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();