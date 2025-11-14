-- Function to sync quoted price to product cost_price
CREATE OR REPLACE FUNCTION public.sync_quote_to_product_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When a quote is inserted or updated, update the product's cost_price
  IF NEW.quoted_price IS NOT NULL THEN
    UPDATE public.products
    SET 
      cost_price = NEW.quoted_price,
      updated_at = now()
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to automatically sync quotes to product cost
DROP TRIGGER IF EXISTS trigger_sync_quote_to_cost ON public.supplier_quotes;
CREATE TRIGGER trigger_sync_quote_to_cost
  AFTER INSERT OR UPDATE OF quoted_price ON public.supplier_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_quote_to_product_cost();