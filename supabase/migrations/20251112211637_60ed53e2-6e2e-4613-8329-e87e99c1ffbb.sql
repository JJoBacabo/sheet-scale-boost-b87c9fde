-- Add Facebook authentication columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS facebook_access_token text,
ADD COLUMN IF NOT EXISTS facebook_token_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS facebook_user_id text,
ADD COLUMN IF NOT EXISTS facebook_user_name text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_facebook_user_id ON public.profiles(facebook_user_id);

-- Update RLS policies are already in place for profiles table