-- Add is_active column to supplier_quotes to track which quote is currently active
-- This allows us to keep historical quotes while marking only one as active per product
ALTER TABLE public.supplier_quotes
ADD COLUMN is_active boolean DEFAULT false NOT NULL;

-- Add helpful comment to the table
COMMENT ON TABLE public.supplier_quotes IS 'Stores all supplier quotes for products. Multiple quotes can exist per product for historical tracking, but only one should be marked as is_active=true at a time.';

COMMENT ON COLUMN public.supplier_quotes.is_active IS 'Indicates if this is the currently active quote for the product. Only one quote per product should have is_active=true.';

-- Add indexes for better query performance
CREATE INDEX idx_supplier_quotes_product_active ON public.supplier_quotes(product_id, is_active);
CREATE INDEX idx_supplier_quotes_product_date ON public.supplier_quotes(product_id, created_at DESC);

-- Update the trigger function to handle the is_active flag
CREATE OR REPLACE FUNCTION public.sync_quote_to_product_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When a new quote is inserted with a price, mark it as active and deactivate others
  IF TG_OP = 'INSERT' AND NEW.quoted_price IS NOT NULL THEN
    -- Deactivate all other quotes for this product
    UPDATE public.supplier_quotes
    SET is_active = false
    WHERE product_id = NEW.product_id AND id != NEW.id;
    
    -- Mark this new quote as active
    NEW.is_active = true;
    
    -- Update the product's cost_price
    UPDATE public.products
    SET 
      cost_price = NEW.quoted_price,
      updated_at = now()
    WHERE id = NEW.product_id;
  END IF;
  
  -- When a quote is updated to become active
  IF TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false THEN
    -- Deactivate all other quotes for this product
    UPDATE public.supplier_quotes
    SET is_active = false
    WHERE product_id = NEW.product_id AND id != NEW.id;
    
    -- Update the product's cost_price if there's a quoted price
    IF NEW.quoted_price IS NOT NULL THEN
      UPDATE public.products
      SET 
        cost_price = NEW.quoted_price,
        updated_at = now()
      WHERE id = NEW.product_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;