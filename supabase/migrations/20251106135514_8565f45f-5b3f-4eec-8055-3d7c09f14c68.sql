-- ============================================
-- SUBSCRIPTION STATE MACHINE & INFRASTRUCTURE
-- ============================================

-- 1. Create enum for subscription states
CREATE TYPE subscription_state AS ENUM ('active', 'expired', 'suspended', 'archived');

-- 2. Create plans catalog table
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('monthly', 'annual')),
  store_limit INTEGER NOT NULL DEFAULT 0,
  campaign_limit INTEGER NOT NULL DEFAULT 0,
  features_enabled JSONB NOT NULL DEFAULT '[]'::jsonb,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  price_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(code, cadence)
);

-- 3. Add new columns to subscriptions table
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS state subscription_state NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_code TEXT,
  ADD COLUMN IF NOT EXISTS readonly_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_state_change_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS state_change_reason TEXT;

-- 4. Create usage counters table
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stores_used INTEGER NOT NULL DEFAULT 0,
  campaigns_used INTEGER NOT NULL DEFAULT 0,
  stores_limit INTEGER NOT NULL DEFAULT 0,
  campaigns_limit INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 5. Create audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  old_state subscription_state,
  new_state subscription_state,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create archived user data table (RGPD compliant)
CREATE TABLE IF NOT EXISTS public.archived_user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id UUID NOT NULL,
  encrypted_snapshot BYTEA,
  anonymized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  restoration_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '180 days'),
  can_restore BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. Enable RLS on new tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_user_data ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for plans (public read)
CREATE POLICY "Anyone can view active plans"
  ON public.plans FOR SELECT
  USING (is_active = true);

-- 9. RLS Policies for usage_counters
CREATE POLICY "Users can view their own usage"
  ON public.usage_counters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
  ON public.usage_counters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
  ON public.usage_counters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 10. RLS Policies for audit_logs
CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 11. RLS Policies for archived_user_data (admin only)
CREATE POLICY "Admins can view archived data"
  ON public.archived_user_data FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 12. Create function to log state changes
CREATE OR REPLACE FUNCTION log_subscription_state_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.state IS DISTINCT FROM NEW.state) THEN
    INSERT INTO public.audit_logs (
      user_id,
      subscription_id,
      event_type,
      event_data,
      old_state,
      new_state
    ) VALUES (
      NEW.user_id,
      NEW.id,
      'subscription_state_change',
      jsonb_build_object(
        'reason', NEW.state_change_reason,
        'plan_name', NEW.plan_name
      ),
      OLD.state,
      NEW.state
    );
    
    NEW.last_state_change_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 13. Create trigger for state change logging
DROP TRIGGER IF EXISTS on_subscription_state_change ON public.subscriptions;
CREATE TRIGGER on_subscription_state_change
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_state_change();

-- 14. Create function to sync usage counters with subscription
CREATE OR REPLACE FUNCTION sync_usage_counters()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usage_counters (
    user_id,
    subscription_id,
    stores_limit,
    campaigns_limit
  ) VALUES (
    NEW.user_id,
    NEW.id,
    NEW.store_limit,
    NEW.campaign_limit
  )
  ON CONFLICT (user_id) DO UPDATE SET
    subscription_id = EXCLUDED.subscription_id,
    stores_limit = EXCLUDED.stores_limit,
    campaigns_limit = EXCLUDED.campaigns_limit,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 15. Create trigger for usage counter sync
DROP TRIGGER IF EXISTS on_subscription_upsert ON public.subscriptions;
CREATE TRIGGER on_subscription_upsert
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_usage_counters();

-- 16. Insert default plans
INSERT INTO public.plans (code, name, cadence, store_limit, campaign_limit, features_enabled, price_amount, currency) VALUES
  ('beginner', 'Beginner', 'monthly', 3, 10, '["basic_analytics", "manual_campaign_entry", "product_sync"]'::jsonb, 29.00, 'EUR'),
  ('beginner', 'Beginner', 'annual', 3, 10, '["basic_analytics", "manual_campaign_entry", "product_sync"]'::jsonb, 290.00, 'EUR'),
  ('basic', 'Basic', 'monthly', 5, 25, '["basic_analytics", "campaign_management", "product_sync", "facebook_integration"]'::jsonb, 49.00, 'EUR'),
  ('basic', 'Basic', 'annual', 5, 25, '["basic_analytics", "campaign_management", "product_sync", "facebook_integration"]'::jsonb, 490.00, 'EUR'),
  ('standard', 'Standard', 'monthly', 10, 50, '["advanced_analytics", "campaign_management", "product_sync", "facebook_integration", "profit_sheet", "meta_dashboard"]'::jsonb, 99.00, 'EUR'),
  ('standard', 'Standard', 'annual', 10, 50, '["advanced_analytics", "campaign_management", "product_sync", "facebook_integration", "profit_sheet", "meta_dashboard"]'::jsonb, 990.00, 'EUR'),
  ('expert', 'Expert', 'monthly', 999, 999, '["advanced_analytics", "campaign_management", "product_sync", "facebook_integration", "profit_sheet", "meta_dashboard", "api_access", "priority_support"]'::jsonb, 199.00, 'EUR'),
  ('expert', 'Expert', 'annual', 999, 999, '["advanced_analytics", "campaign_management", "product_sync", "facebook_integration", "profit_sheet", "meta_dashboard", "api_access", "priority_support"]'::jsonb, 1990.00, 'EUR')
ON CONFLICT (code, cadence) DO NOTHING;

-- 17. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_state ON public.subscriptions(state);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_state ON public.subscriptions(user_id, state);
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_period ON public.subscriptions(grace_period_ends_at) WHERE grace_period_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_archive_scheduled ON public.subscriptions(archive_scheduled_at) WHERE archive_scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_counters_user ON public.usage_counters(user_id);