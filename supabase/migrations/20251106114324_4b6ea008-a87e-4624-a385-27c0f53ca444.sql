-- Create subscription history table
CREATE TABLE public.subscription_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'updated', 'renewed', 'canceled', 'expired'
  plan_name TEXT NOT NULL,
  billing_period TEXT NOT NULL,
  status TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  amount NUMERIC,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own subscription history"
  ON public.subscription_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription history"
  ON public.subscription_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_subscription_history_user_id ON public.subscription_history(user_id);
CREATE INDEX idx_subscription_history_created_at ON public.subscription_history(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_subscription_history_updated_at
  BEFORE UPDATE ON public.subscription_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();