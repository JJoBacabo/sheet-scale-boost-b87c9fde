-- Add plan limits and features to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS store_limit integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS campaign_limit integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS features_enabled jsonb DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN public.subscriptions.store_limit IS 'Number of stores allowed (0 = none, -1 = unlimited)';
COMMENT ON COLUMN public.subscriptions.campaign_limit IS 'Number of campaigns allowed (0 = none, -1 = unlimited)';
COMMENT ON COLUMN public.subscriptions.features_enabled IS 'Array of enabled features like ["daily_roas_profit_sheet", "campaigns"]';
