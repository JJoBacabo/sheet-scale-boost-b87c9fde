-- Fix sync_quote_to_product_cost() to verify ownership before updating products
CREATE OR REPLACE FUNCTION public.sync_quote_to_product_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  session_user_id UUID;
  product_user_id UUID;
BEGIN
  -- Get session owner
  SELECT user_id INTO session_user_id
  FROM public.supplier_quote_sessions
  WHERE id = NEW.session_id;
  
  -- Get product owner
  SELECT user_id INTO product_user_id
  FROM public.products
  WHERE id = NEW.product_id;
  
  -- Verify ownership match - prevent cross-user modifications
  IF session_user_id IS NULL OR product_user_id IS NULL OR session_user_id != product_user_id THEN
    RAISE EXCEPTION 'Cannot update product: ownership verification failed';
  END IF;
  
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