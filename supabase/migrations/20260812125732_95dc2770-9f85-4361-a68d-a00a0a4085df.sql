-- CUSTOMERS: writes limited to staff (operator/admin)
DROP POLICY IF EXISTS "Auth insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Auth update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;

CREATE POLICY "Staff insert customers" ON public.customers FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (public.has_role(auth.uid(),'operator') OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "Staff update customers" ON public.customers FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'operator') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'operator') OR public.has_role(auth.uid(),'admin'));

-- PRODUCTS: read limited to staff, cost_price limited to admins
DROP POLICY IF EXISTS "Auth read products" ON public.products;
CREATE POLICY "Staff read products" ON public.products FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'operator') OR public.has_role(auth.uid(),'admin'));

REVOKE SELECT ON public.products FROM authenticated;
GRANT SELECT (id, name, price, category, emoji, stock, min_stock, active, created_by, created_at, updated_at)
  ON public.products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

CREATE OR REPLACE FUNCTION public.admin_product_costs()
RETURNS TABLE(id uuid, cost_price numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.cost_price
  FROM public.products p
  WHERE public.has_role(auth.uid(), 'admin')
$$;

REVOKE ALL ON FUNCTION public.admin_product_costs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_product_costs() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_product_costs() TO authenticated;

-- TAGS: read/insert limited to staff
DROP POLICY IF EXISTS "Auth read tags" ON public.tags;
DROP POLICY IF EXISTS "Auth insert tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated can insert tags" ON public.tags;

CREATE POLICY "Staff read tags" ON public.tags FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'operator') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Staff insert tags" ON public.tags FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (public.has_role(auth.uid(),'operator') OR public.has_role(auth.uid(),'admin')));