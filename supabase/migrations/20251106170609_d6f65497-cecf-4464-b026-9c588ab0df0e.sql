-- Create trigger to auto-sync profile when subscription changes
CREATE OR REPLACE FUNCTION sync_profile_from_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- When subscription becomes active, update profile
  IF NEW.status = 'active' THEN
    UPDATE profiles
    SET 
      subscription_plan = NEW.plan_code,
      subscription_status = 'active',
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- When subscription becomes inactive, revert to free
  IF NEW.status = 'inactive' AND OLD.status = 'active' THEN
    UPDATE profiles
    SET 
      subscription_plan = 'free',
      subscription_status = 'inactive',
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on subscriptions table
DROP TRIGGER IF EXISTS trigger_sync_profile_from_subscription ON subscriptions;
CREATE TRIGGER trigger_sync_profile_from_subscription
  AFTER INSERT OR UPDATE OF status, plan_code
  ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_from_subscription();