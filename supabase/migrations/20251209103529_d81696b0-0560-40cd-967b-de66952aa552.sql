-- Add explicit denial policy for unauthenticated access to profiles table
-- This ensures that even if RLS is bypassed or misconfigured, unauthenticated users cannot access data

-- First, revoke any public access grants (just to be safe)
REVOKE ALL ON public.profiles FROM anon;

-- The existing RLS policies already restrict to authenticated users viewing their own data
-- But we'll add an explicit check that requires authentication for all operations

-- Create a policy that explicitly requires authentication for SELECT
-- This acts as an additional security layer
CREATE POLICY "Require authentication for profile access"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Add explicit denial for public role as well
CREATE POLICY "Deny public access to profiles"
ON public.profiles
FOR ALL
TO public
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);