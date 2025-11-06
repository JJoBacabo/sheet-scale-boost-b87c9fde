-- Add integration_id to products table to link products to specific stores
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS integration_id uuid REFERENCES public.integrations(id) ON DELETE SET NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_integration_id ON public.products(integration_id);

-- Update existing products to link them to their integration based on user_id
-- This will set integration_id to the first shopify integration for each user
UPDATE public.products p
SET integration_id = (
  SELECT i.id 
  FROM public.integrations i 
  WHERE i.user_id = p.user_id 
    AND i.integration_type = 'shopify'
  ORDER BY i.created_at ASC
  LIMIT 1
)
WHERE p.integration_id IS NULL AND p.shopify_product_id IS NOT NULL;