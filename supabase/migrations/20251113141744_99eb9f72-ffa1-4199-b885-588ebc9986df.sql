-- Add public access policy for products in active quote sessions
CREATE POLICY "Public can view products in active quote sessions"
ON public.products
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.supplier_quotes sq
    JOIN public.supplier_quote_sessions sqs ON sq.session_id = sqs.id
    WHERE sq.product_id = products.id
    AND sqs.is_active = true
  )
);