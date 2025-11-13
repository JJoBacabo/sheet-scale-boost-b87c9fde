-- Add public access policy for supplier quote sessions with valid token
CREATE POLICY "Public can view active sessions with valid token"
ON public.supplier_quote_sessions
FOR SELECT
TO public
USING (is_active = true AND token IS NOT NULL);