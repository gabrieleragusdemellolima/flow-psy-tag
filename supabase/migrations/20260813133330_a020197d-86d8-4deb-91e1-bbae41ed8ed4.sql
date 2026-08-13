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

  -- Default: everyone new signs in as operator (vendedor), unless invited as admin
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