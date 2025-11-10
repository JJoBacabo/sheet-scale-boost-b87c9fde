-- ============================================
-- ADD INSERT POLICY FOR AUDIT LOGS
-- ============================================

-- Drop policy if it exists to avoid errors
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;

-- Allow admins to insert audit logs manually (for fallback scenarios)
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role and triggers to insert (they use SECURITY DEFINER, but this helps)
-- Note: Triggers already work because they use SECURITY DEFINER, but this ensures admins can insert manually

