-- Enable pgcrypto extension in extensions schema (not public)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Function to get session info without exposing password
CREATE OR REPLACE FUNCTION public.get_supplier_session_info(session_token TEXT)
RETURNS TABLE(
  session_id UUID,
  supplier_name TEXT,
  has_password BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    id as session_id,
    supplier_name::TEXT,
    (password IS NOT NULL) as has_password
  FROM public.supplier_quote_sessions
  WHERE token = session_token AND is_active = true;
$$;

-- Function to verify password server-side
CREATE OR REPLACE FUNCTION public.verify_supplier_session_password(
  session_token TEXT,
  input_password TEXT
)
RETURNS TABLE(
  session_id UUID,
  supplier_name TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as session_id,
    s.supplier_name::TEXT,
    CASE 
      WHEN s.password IS NULL THEN true
      WHEN s.password = extensions.crypt(input_password, s.password) THEN true
      ELSE false
    END as is_valid
  FROM public.supplier_quote_sessions s
  WHERE s.token = session_token AND s.is_active = true;
END;
$$;

-- Function to create supplier session with hashed password
CREATE OR REPLACE FUNCTION public.create_supplier_session_with_hash(
  p_user_id UUID,
  p_token TEXT,
  p_supplier_name TEXT,
  p_supplier_email TEXT,
  p_password TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  new_session_id UUID;
  hashed_password TEXT;
BEGIN
  -- Verify the user is authenticated and matches
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Hash password if provided
  IF p_password IS NOT NULL AND p_password != '' THEN
    hashed_password := extensions.crypt(p_password, extensions.gen_salt('bf'));
  ELSE
    hashed_password := NULL;
  END IF;
  
  -- Insert session
  INSERT INTO public.supplier_quote_sessions (
    user_id,
    token,
    supplier_name,
    supplier_email,
    password
  ) VALUES (
    p_user_id,
    p_token,
    p_supplier_name,
    NULLIF(p_supplier_email, ''),
    hashed_password
  )
  RETURNING id INTO new_session_id;
  
  RETURN new_session_id;
END;
$$;

-- Drop the old public SELECT policy that exposes passwords
DROP POLICY IF EXISTS "Public can view active sessions with valid token" ON public.supplier_quote_sessions;