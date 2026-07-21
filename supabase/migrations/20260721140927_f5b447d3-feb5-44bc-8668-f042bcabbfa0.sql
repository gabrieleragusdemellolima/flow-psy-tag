
-- Tags: consolidate update policy to owner or admin
DROP POLICY IF EXISTS "Authenticated operators can update tags" ON public.tags;
DROP POLICY IF EXISTS "Auth update tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can view tags" ON public.tags;
CREATE POLICY "Tags owner or admin update" ON public.tags
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Storage: remove permissive customer-photos policies (bucket is now private)
DROP POLICY IF EXISTS "Anyone can view customer photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload customer photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update customer photos" ON storage.objects;

-- Revoke public execute on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_sale_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
