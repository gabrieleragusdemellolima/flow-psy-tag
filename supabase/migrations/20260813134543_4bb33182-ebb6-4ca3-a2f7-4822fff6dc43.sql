CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','operator','caixa')
  )
$$;

-- products
DROP POLICY IF EXISTS "Staff read products" ON public.products;
CREATE POLICY "Staff read products" ON public.products
  FOR SELECT TO authenticated USING (public.is_staff());

-- tags
DROP POLICY IF EXISTS "Staff read tags" ON public.tags;
CREATE POLICY "Staff read tags" ON public.tags
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Staff insert tags" ON public.tags;
CREATE POLICY "Staff insert tags" ON public.tags
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_staff());

-- customers
DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;
CREATE POLICY "Staff can view customers" ON public.customers
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Staff insert customers" ON public.customers;
CREATE POLICY "Staff insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_staff());

DROP POLICY IF EXISTS "Staff update customers" ON public.customers;
CREATE POLICY "Staff update customers" ON public.customers
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- default role for new sign-ups is now vendedor (operator)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv public.operator_invites%ROWTYPE;
  final_role public.app_role;
BEGIN
  SELECT * INTO inv FROM public.operator_invites WHERE lower(email) = lower(NEW.email) LIMIT 1;

  final_role := COALESCE(inv.role, 'operator');

  INSERT INTO public.profiles (user_id, display_name, email, avatar_url, operator_number, phone)
  VALUES (
    NEW.id,
    COALESCE(inv.display_name, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    inv.operator_number,
    inv.phone
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, final_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF inv.id IS NOT NULL THEN
    UPDATE public.operator_invites SET claimed_at = now() WHERE id = inv.id;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;