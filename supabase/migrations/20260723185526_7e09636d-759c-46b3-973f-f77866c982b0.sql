
-- Profile extras
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS operator_number text,
  ADD COLUMN IF NOT EXISTS phone text;

-- Invites table
CREATE TABLE IF NOT EXISTS public.operator_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  operator_number text NOT NULL,
  phone text,
  role public.app_role NOT NULL DEFAULT 'operator',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operator_invites TO authenticated;
GRANT ALL ON public.operator_invites TO service_role;

ALTER TABLE public.operator_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage invites"
  ON public.operator_invites FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_operator_invites_updated
  BEFORE UPDATE ON public.operator_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Updated new user handler: seed profile + apply invite role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv public.operator_invites%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM public.operator_invites WHERE lower(email) = lower(NEW.email) LIMIT 1;

  INSERT INTO public.profiles (user_id, display_name, email, avatar_url, operator_number, phone)
  VALUES (
    NEW.id,
    COALESCE(inv.display_name, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    inv.operator_number,
    inv.phone
  );

  IF NEW.email IN ('psilocybinproject@gmail.com', 'jonatantioxico@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF inv.id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, inv.role)
      ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.operator_invites SET claimed_at = now() WHERE id = inv.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
