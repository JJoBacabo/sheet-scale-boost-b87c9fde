-- Update plan limits to match requirements
-- Beginner: 1 store, 0 campaigns
-- Basic: 1 store, 15 campaigns
-- Standard: 2 stores, 40 campaigns
-- Expert: 4 stores, unlimited campaigns

UPDATE plans 
SET store_limit = 1, campaign_limit = 0
WHERE code = 'beginner';

UPDATE plans 
SET store_limit = 1, campaign_limit = 15
WHERE code = 'basic';

UPDATE plans 
SET store_limit = 2, campaign_limit = 40
WHERE code = 'standard';

UPDATE plans 
SET store_limit = 4, campaign_limit = 0
WHERE code = 'expert';

-- Update FREE plan
UPDATE plans 
SET store_limit = 0, campaign_limit = 0
WHERE code = 'free';

-- Ensure all new users get 10-day trial with Standard limits
-- This will be handled by the trigger that already exists (handle_new_user)
-- We just need to make sure profiles are created with trial status

-- Add index for better performance on trial checks
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at ON profiles(trial_ends_at) WHERE subscription_status = 'active';
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_plan ON profiles(subscription_plan, subscription_status);

-- Add index for subscription queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_state ON subscriptions(state, user_id);

-- Add index for usage counters
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_id ON usage_counters(user_id);

-- Add index for integrations (stores)
CREATE INDEX IF NOT EXISTS idx_integrations_user_type ON integrations(user_id, integration_type);

-- Add index for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status ON campaigns(user_id, status);