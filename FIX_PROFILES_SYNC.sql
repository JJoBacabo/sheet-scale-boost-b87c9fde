-- =====================================================
-- FIX: Sync profiles with active subscriptions
-- =====================================================
-- Run this ONCE to fix existing users with active subscriptions
-- but outdated profile data

UPDATE profiles p
SET 
  subscription_plan = s.plan_code,
  subscription_status = 'active',
  updated_at = now()
FROM subscriptions s
WHERE p.user_id = s.user_id 
  AND s.status = 'active'
  AND (p.subscription_plan != s.plan_code OR p.subscription_status != 'active');

-- Check results
SELECT 
  p.user_id,
  p.subscription_plan as profile_plan,
  p.subscription_status as profile_status,
  s.plan_code as subscription_plan,
  s.status as subscription_status
FROM profiles p
LEFT JOIN subscriptions s ON p.user_id = s.user_id AND s.status = 'active'
WHERE s.id IS NOT NULL;
