DROP POLICY IF EXISTS "Admins can view customers" ON public.customers;

CREATE POLICY "Staff can view customers" ON public.customers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'operator') OR public.has_role(auth.uid(),'admin'));