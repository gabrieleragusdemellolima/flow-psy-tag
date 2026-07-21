
-- user_roles: remove anon policies (privilege escalation)
DROP POLICY IF EXISTS "Anon can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anon can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anon can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anon can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- products
DROP POLICY IF EXISTS "Anon can view products" ON public.products;
DROP POLICY IF EXISTS "Anon can insert products" ON public.products;
DROP POLICY IF EXISTS "Anon can update products" ON public.products;
DROP POLICY IF EXISTS "Anon can delete products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Anyone can insert products" ON public.products;
DROP POLICY IF EXISTS "Anyone can update products" ON public.products;
DROP POLICY IF EXISTS "Anyone can delete products" ON public.products;
REVOKE ALL ON public.products FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
CREATE POLICY "Auth read products" ON public.products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update products" ON public.products
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete products" ON public.products
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- tags
DROP POLICY IF EXISTS "Anon can view tags" ON public.tags;
DROP POLICY IF EXISTS "Anon can insert tags" ON public.tags;
DROP POLICY IF EXISTS "Anon can update tags" ON public.tags;
DROP POLICY IF EXISTS "Anon can delete tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can view tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can insert tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can update tags" ON public.tags;
REVOKE ALL ON public.tags FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
CREATE POLICY "Auth read tags" ON public.tags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert tags" ON public.tags
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update tags" ON public.tags
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete tags" ON public.tags
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- sale_items
DROP POLICY IF EXISTS "Anon can view sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Anon can insert sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Anyone can view sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Anyone can insert sale_items" ON public.sale_items;
REVOKE ALL ON public.sale_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
CREATE POLICY "Auth read sale_items" ON public.sale_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = sale_items.transaction_id AND (t.operator_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );
CREATE POLICY "Auth insert sale_items" ON public.sale_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = sale_items.transaction_id AND t.operator_id = auth.uid())
  );

-- transactions
DROP POLICY IF EXISTS "Anon can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anon can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anyone can insert transactions" ON public.transactions;
REVOKE ALL ON public.transactions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
CREATE POLICY "Auth read transactions" ON public.transactions
  FOR SELECT TO authenticated USING (operator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Auth insert transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (operator_id = auth.uid());

-- customers
DROP POLICY IF EXISTS "Anon can view customers" ON public.customers;
DROP POLICY IF EXISTS "Anon can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Anon can update customers" ON public.customers;
DROP POLICY IF EXISTS "Anon can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can view customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can delete customers" ON public.customers;
REVOKE ALL ON public.customers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
CREATE POLICY "Auth read customers" ON public.customers
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update customers" ON public.customers
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete customers" ON public.customers
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- profiles
DROP POLICY IF EXISTS "Anon can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
-- Existing authenticated auth.uid()-scoped policies are preserved.
