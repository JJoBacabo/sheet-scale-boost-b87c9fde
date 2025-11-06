-- Remove the unique constraint that prevents multiple stores of the same type
ALTER TABLE public.integrations 
DROP CONSTRAINT IF EXISTS integrations_user_id_integration_type_key;

-- Add a new unique constraint that allows multiple stores but prevents duplicate myshopify_domain per user
-- This ensures a user can't connect the same store twice
CREATE UNIQUE INDEX IF NOT EXISTS integrations_user_shopify_domain_unique 
ON public.integrations (user_id, integration_type, (metadata->>'myshopify_domain'))
WHERE integration_type = 'shopify';