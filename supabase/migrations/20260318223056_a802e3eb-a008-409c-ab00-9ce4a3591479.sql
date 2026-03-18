ALTER TABLE public.sale_items ADD COLUMN sale_number text DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.generate_sale_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prod_category text;
  next_num integer;
  prefix text;
BEGIN
  SELECT category INTO prod_category FROM public.products WHERE id = NEW.product_id;
  
  IF prod_category IN ('ingressos', 'estacionamento') THEN
    SELECT COALESCE(MAX(
      CAST(NULLIF(regexp_replace(si.sale_number, '[^0-9]', '', 'g'), '') AS integer)
    ), 0) + 1
    INTO next_num
    FROM public.sale_items si
    JOIN public.products p ON p.id = si.product_id
    WHERE p.category = prod_category AND si.sale_number IS NOT NULL;
    
    IF prod_category = 'ingressos' THEN
      prefix := 'ING-';
    ELSE
      prefix := 'EST-';
    END IF;
    
    NEW.sale_number := prefix || LPAD(next_num::text, 3, '0');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_sale_number
  BEFORE INSERT ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_sale_number();