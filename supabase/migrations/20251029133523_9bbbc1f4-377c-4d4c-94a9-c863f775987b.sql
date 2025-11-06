-- Create daily_roas table for tracking campaign performance by day
CREATE TABLE public.daily_roas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_spent NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  atc INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  product_price NUMERIC DEFAULT 0,
  cog NUMERIC DEFAULT 0,
  units_sold INTEGER DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  margin_euros NUMERIC DEFAULT 0,
  margin_percentage NUMERIC DEFAULT 0,
  decision TEXT,
  decision_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, campaign_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_roas ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own daily roas data" 
ON public.daily_roas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily roas data" 
ON public.daily_roas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily roas data" 
ON public.daily_roas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily roas data" 
ON public.daily_roas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_roas_updated_at
BEFORE UPDATE ON public.daily_roas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_daily_roas_user_date ON public.daily_roas(user_id, date);
CREATE INDEX idx_daily_roas_campaign ON public.daily_roas(campaign_id);