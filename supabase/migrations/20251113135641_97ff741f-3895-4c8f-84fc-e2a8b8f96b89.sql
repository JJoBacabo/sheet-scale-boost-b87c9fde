-- Create supplier quote sessions table
CREATE TABLE public.supplier_quote_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  supplier_name TEXT NOT NULL,
  supplier_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supplier quotes table
CREATE TABLE public.supplier_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.supplier_quote_sessions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quoted_price NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, product_id)
);

-- Enable RLS
ALTER TABLE public.supplier_quote_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quotes ENABLE ROW LEVEL SECURITY;

-- Create function to validate token for public access
CREATE OR REPLACE FUNCTION public.validate_quote_token(session_token TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.supplier_quote_sessions
  WHERE token = session_token AND is_active = true
$$;

-- RLS Policies for supplier_quote_sessions
CREATE POLICY "Users can view their own sessions"
  ON public.supplier_quote_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.supplier_quote_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.supplier_quote_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.supplier_quote_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for supplier_quotes
CREATE POLICY "Users can view quotes from their sessions"
  ON public.supplier_quotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_quote_sessions
      WHERE id = supplier_quotes.session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view quotes with valid token"
  ON public.supplier_quotes
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.supplier_quote_sessions WHERE is_active = true
    )
  );

CREATE POLICY "Public can insert quotes with valid token"
  ON public.supplier_quotes
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.supplier_quote_sessions WHERE is_active = true
    )
  );

CREATE POLICY "Public can update quotes with valid token"
  ON public.supplier_quotes
  FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM public.supplier_quote_sessions WHERE is_active = true
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_supplier_quote_sessions_updated_at
  BEFORE UPDATE ON public.supplier_quote_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_quotes_updated_at
  BEFORE UPDATE ON public.supplier_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();