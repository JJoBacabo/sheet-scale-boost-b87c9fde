-- Drop the existing public access policy for products
DROP POLICY IF EXISTS "Public can view products in active quote sessions" ON public.products;

-- Create a more restrictive view for supplier quote access
-- Instead of exposing all product data, we'll use a function that returns only safe fields
CREATE OR REPLACE FUNCTION public.get_product_for_quote(product_id uuid)
RETURNS TABLE (
  id uuid,
  product_name text,
  image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.product_name, p.image_url
  FROM public.products p
  WHERE p.id = product_id
    AND EXISTS (
      SELECT 1 FROM public.supplier_quotes sq
      JOIN public.supplier_quote_sessions sqs ON sq.session_id = sqs.id
      WHERE sq.product_id = p.id AND sqs.is_active = true
    );
$$;

-- Revoke direct public access to products table for anon role
REVOKE SELECT ON public.products FROM anon;

-- The supplier_quotes table still needs access to product info through the function
-- but the direct SELECT policy is removed, so public cannot see sensitive data

-- Add a comment explaining the security change
COMMENT ON FUNCTION public.get_product_for_quote IS 'Returns only product_name and image_url for products in active quote sessions. Hides sensitive financial data (cost_price, selling_price, profit_margin, etc.) from external suppliers.';