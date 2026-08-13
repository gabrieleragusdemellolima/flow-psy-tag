REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_sale_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_product_costs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_product_costs() TO authenticated;