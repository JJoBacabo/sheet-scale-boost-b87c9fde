-- Create saved_ads table for storing user's saved ads from research
CREATE TABLE IF NOT EXISTS public.saved_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ad_library_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  ad_text TEXT,
  snapshot_url TEXT NOT NULL,
  spend TEXT,
  impressions TEXT,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_ads ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_ads
CREATE POLICY "Users can view their own saved ads"
ON public.saved_ads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved ads"
ON public.saved_ads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved ads"
ON public.saved_ads
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_saved_ads_user_id ON public.saved_ads(user_id);
CREATE INDEX idx_saved_ads_ad_library_id ON public.saved_ads(ad_library_id);