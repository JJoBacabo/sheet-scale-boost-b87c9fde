-- Remove the duplicate unique constraint that was added
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_user_id_unique;

-- The original profiles_user_id_key constraint is sufficient
-- The handle_new_user function should work with the existing constraint
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now();
  
  RETURN NEW;
END;
$function$;