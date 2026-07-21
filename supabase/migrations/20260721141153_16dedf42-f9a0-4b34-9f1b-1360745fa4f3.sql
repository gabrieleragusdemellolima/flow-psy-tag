
-- customers: remove broad-read policies, keep admin-only read
DROP POLICY IF EXISTS "Auth read customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
CREATE POLICY "Admins can view customers" ON public.customers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- sale_items: drop overly-permissive policy
DROP POLICY IF EXISTS "Authenticated users can view sale items" ON public.sale_items;

-- transactions: drop overly-permissive policy
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON public.transactions;

-- storage.objects: add policies scoped to customer-photos bucket, admin-only
CREATE POLICY "Admins manage customer-photos select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'customer-photos' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage customer-photos insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'customer-photos' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage customer-photos update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'customer-photos' AND has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (bucket_id = 'customer-photos' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage customer-photos delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'customer-photos' AND has_role(auth.uid(), 'admin'::app_role));
