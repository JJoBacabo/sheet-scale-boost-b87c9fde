-- ============================================
-- COMPREHENSIVE AUDIT LOGS FOR ALL OPERATIONS
-- ============================================

-- ============================================
-- 1. SUBSCRIPTIONS (complementar ao já existente)
-- ============================================

-- Log subscription creation
CREATE OR REPLACE FUNCTION log_subscription_created()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    BEGIN
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
        'subscription_created',
        jsonb_build_object(
          'plan_name', NEW.plan_name,
          'billing_period', NEW.billing_period,
          'status', NEW.status,
          'stripe_subscription_id', NEW.stripe_subscription_id
        ),
        NULL,
        NEW.state
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log subscription creation for %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Log subscription updates (beyond state changes)
CREATE OR REPLACE FUNCTION log_subscription_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Log plan changes
    IF (OLD.plan_name IS DISTINCT FROM NEW.plan_name) THEN
      BEGIN
        INSERT INTO public.audit_logs (
          user_id,
          subscription_id,
          event_type,
          event_data
        ) VALUES (
          NEW.user_id,
          NEW.id,
          'subscription_plan_changed',
          jsonb_build_object(
            'previous_plan', OLD.plan_name,
            'new_plan', NEW.plan_name,
            'billing_period', NEW.billing_period
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to log subscription plan change: %', SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for subscriptions
DROP TRIGGER IF EXISTS on_subscription_created ON public.subscriptions;
CREATE TRIGGER on_subscription_created
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_created();

DROP TRIGGER IF EXISTS on_subscription_updated ON public.subscriptions;
CREATE TRIGGER on_subscription_updated
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_updated();

-- ============================================
-- 2. USERS/PROFILES
-- ============================================

-- Log user creation (complementar ao handle_new_user)
CREATE OR REPLACE FUNCTION log_user_created()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    BEGIN
      INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data
      ) VALUES (
        NEW.id,
        'user_created',
        jsonb_build_object(
          'email', NEW.email,
          'created_at', NEW.created_at
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log user creation for %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Log profile updates
CREATE OR REPLACE FUNCTION log_profile_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    BEGIN
      -- Log subscription plan changes in profile
      IF (OLD.subscription_plan IS DISTINCT FROM NEW.subscription_plan) THEN
        INSERT INTO public.audit_logs (
          user_id,
          event_type,
          event_data
        ) VALUES (
          NEW.user_id,
          'user_plan_updated',
          jsonb_build_object(
            'previous_plan', OLD.subscription_plan,
            'new_plan', NEW.subscription_plan,
            'updated_by', COALESCE(auth.uid(), 'system')
          )
        );
      END IF;
      
      -- Log subscription status changes in profile
      IF (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status) THEN
        INSERT INTO public.audit_logs (
          user_id,
          event_type,
          event_data
        ) VALUES (
          NEW.user_id,
          'user_status_updated',
          jsonb_build_object(
            'previous_status', OLD.subscription_status,
            'new_status', NEW.subscription_status,
            'updated_by', COALESCE(auth.uid(), 'system')
          )
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log profile update for %: %', NEW.user_id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for users/profiles
-- Note: Trigger on auth.users may already exist, so we use IF NOT EXISTS pattern
-- We'll create it conditionally to avoid conflicts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_user_created_audit'
  ) THEN
    CREATE TRIGGER on_user_created_audit
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION log_user_created();
  END IF;
END $$;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_profile_updated();

-- ============================================
-- 3. CAMPAIGNS
-- ============================================

-- Log campaign operations
CREATE OR REPLACE FUNCTION log_campaign_operations()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    BEGIN
      INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data
      ) VALUES (
        NEW.user_id,
        'campaign_created',
        jsonb_build_object(
          'campaign_id', NEW.id,
          'campaign_name', NEW.campaign_name,
          'platform', NEW.platform,
          'status', NEW.status
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log campaign creation: %', SQLERRM;
    END;
  ELSIF (TG_OP = 'UPDATE') THEN
    BEGIN
      -- Log status changes
      IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.audit_logs (
          user_id,
          event_type,
          event_data
        ) VALUES (
          NEW.user_id,
          'campaign_updated',
          jsonb_build_object(
            'campaign_id', NEW.id,
            'campaign_name', NEW.campaign_name,
            'previous_status', OLD.status,
            'new_status', NEW.status
          )
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log campaign update: %', SQLERRM;
    END;
  ELSIF (TG_OP = 'DELETE') THEN
    BEGIN
      INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data
      ) VALUES (
        OLD.user_id,
        'campaign_deleted',
        jsonb_build_object(
          'campaign_id', OLD.id,
          'campaign_name', OLD.campaign_name,
          'platform', OLD.platform,
          'deleted_by', COALESCE(auth.uid(), 'system')
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log campaign deletion: %', SQLERRM;
    END;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for campaigns
DROP TRIGGER IF EXISTS on_campaign_operations ON public.campaigns;
CREATE TRIGGER on_campaign_operations
  AFTER INSERT OR UPDATE OR DELETE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION log_campaign_operations();

-- ============================================
-- 4. PRODUCTS
-- ============================================

-- Log product operations
CREATE OR REPLACE FUNCTION log_product_operations()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    BEGIN
      INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data
      ) VALUES (
        NEW.user_id,
        'product_created',
        jsonb_build_object(
          'product_id', NEW.id,
          'product_name', NEW.product_name,
          'sku', NEW.sku,
          'shopify_product_id', NEW.shopify_product_id
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log product creation: %', SQLERRM;
    END;
  ELSIF (TG_OP = 'UPDATE') THEN
    BEGIN
      -- Log significant updates (price changes, etc)
      IF (OLD.selling_price IS DISTINCT FROM NEW.selling_price OR
          OLD.cost_price IS DISTINCT FROM NEW.cost_price) THEN
        INSERT INTO public.audit_logs (
          user_id,
          event_type,
          event_data
        ) VALUES (
          NEW.user_id,
          'product_updated',
          jsonb_build_object(
            'product_id', NEW.id,
            'product_name', NEW.product_name,
            'previous_selling_price', OLD.selling_price,
            'new_selling_price', NEW.selling_price,
            'previous_cost_price', OLD.cost_price,
            'new_cost_price', NEW.cost_price
          )
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log product update: %', SQLERRM;
    END;
  ELSIF (TG_OP = 'DELETE') THEN
    BEGIN
      INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data
      ) VALUES (
        OLD.user_id,
        'product_deleted',
        jsonb_build_object(
          'product_id', OLD.id,
          'product_name', OLD.product_name,
          'sku', OLD.sku,
          'deleted_by', COALESCE(auth.uid(), 'system')
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log product deletion: %', SQLERRM;
    END;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for products
DROP TRIGGER IF EXISTS on_product_operations ON public.products;
CREATE TRIGGER on_product_operations
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION log_product_operations();

-- ============================================
-- 5. USER ROLES (Admin actions)
-- ============================================

-- Log admin role changes
CREATE OR REPLACE FUNCTION log_user_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    BEGIN
      INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data
      ) VALUES (
        NEW.user_id,
        'admin_role_added',
        jsonb_build_object(
          'role', NEW.role,
          'added_by', COALESCE(auth.uid(), 'system')
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log admin role addition: %', SQLERRM;
    END;
  ELSIF (TG_OP = 'DELETE') THEN
    BEGIN
      INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data
      ) VALUES (
        OLD.user_id,
        'admin_role_removed',
        jsonb_build_object(
          'role', OLD.role,
          'removed_by', COALESCE(auth.uid(), 'system')
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log admin role removal: %', SQLERRM;
    END;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for user_roles
DROP TRIGGER IF EXISTS on_user_role_changes ON public.user_roles;
CREATE TRIGGER on_user_role_changes
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_role_changes();

-- ============================================
-- 6. INTEGRATIONS
-- ============================================

-- Log integration operations
CREATE OR REPLACE FUNCTION log_integration_operations()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    BEGIN
      INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data
      ) VALUES (
        NEW.user_id,
        CASE 
          WHEN NEW.integration_type = 'shopify' THEN 'shopify_connected'
          WHEN NEW.integration_type = 'facebook' THEN 'facebook_connected'
          ELSE 'integration_created'
        END,
        jsonb_build_object(
          'integration_id', NEW.id,
          'integration_type', NEW.integration_type,
          'status', NEW.status
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log integration creation: %', SQLERRM;
    END;
  ELSIF (TG_OP = 'UPDATE') THEN
    BEGIN
      -- Log status changes
      IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.audit_logs (
          user_id,
          event_type,
          event_data
        ) VALUES (
          NEW.user_id,
          'integration_updated',
          jsonb_build_object(
            'integration_id', NEW.id,
            'integration_type', NEW.integration_type,
            'previous_status', OLD.status,
            'new_status', NEW.status
          )
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log integration update: %', SQLERRM;
    END;
  ELSIF (TG_OP = 'DELETE') THEN
    BEGIN
      INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data
      ) VALUES (
        OLD.user_id,
        CASE 
          WHEN OLD.integration_type = 'shopify' THEN 'shopify_disconnected'
          WHEN OLD.integration_type = 'facebook' THEN 'facebook_disconnected'
          ELSE 'integration_deleted'
        END,
        jsonb_build_object(
          'integration_id', OLD.id,
          'integration_type', OLD.integration_type,
          'deleted_by', COALESCE(auth.uid(), 'system')
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log integration deletion: %', SQLERRM;
    END;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for integrations
DROP TRIGGER IF EXISTS on_integration_operations ON public.integrations;
CREATE TRIGGER on_integration_operations
  AFTER INSERT OR UPDATE OR DELETE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION log_integration_operations();

-- ============================================
-- 7. UPDATE INDEXES
-- ============================================

-- Add index for all new event types
CREATE INDEX IF NOT EXISTS idx_audit_logs_all_events 
ON public.audit_logs(event_type, created_at DESC);

-- Update existing index to include all event types (drop and recreate with broader condition)
DROP INDEX IF EXISTS idx_audit_logs_ticket_events;
-- Create a more comprehensive index
CREATE INDEX IF NOT EXISTS idx_audit_logs_all_event_types 
ON public.audit_logs(event_type, created_at DESC);

