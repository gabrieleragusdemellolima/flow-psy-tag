
-- Allow anon role to do everything (app runs without login)

-- TAGS
CREATE POLICY "Anon can view tags" ON public.tags FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert tags" ON public.tags FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update tags" ON public.tags FOR UPDATE TO anon USING (true);

-- CUSTOMERS
CREATE POLICY "Anon can view customers" ON public.customers FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert customers" ON public.customers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update customers" ON public.customers FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete customers" ON public.customers FOR DELETE TO anon USING (true);

-- PRODUCTS
CREATE POLICY "Anon can view products" ON public.products FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert products" ON public.products FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update products" ON public.products FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete products" ON public.products FOR DELETE TO anon USING (true);

-- TRANSACTIONS
CREATE POLICY "Anon can view transactions" ON public.transactions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert transactions" ON public.transactions FOR INSERT TO anon WITH CHECK (true);

-- SALE_ITEMS
CREATE POLICY "Anon can view sale_items" ON public.sale_items FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert sale_items" ON public.sale_items FOR INSERT TO anon WITH CHECK (true);

-- PROFILES
CREATE POLICY "Anon can view profiles" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert profiles" ON public.profiles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update profiles" ON public.profiles FOR UPDATE TO anon USING (true);

-- USER_ROLES
CREATE POLICY "Anon can view roles" ON public.user_roles FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert roles" ON public.user_roles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can delete roles" ON public.user_roles FOR DELETE TO anon USING (true);
