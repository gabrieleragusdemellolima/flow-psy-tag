-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bebidas', 'comidas', 'cigarros', 'doces')),
  emoji TEXT NOT NULL DEFAULT '📦',
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update products" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete products" ON public.products FOR DELETE TO authenticated USING (true);

-- Tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_code TEXT NOT NULL UNIQUE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tags" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tags" ON public.tags FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update tags" ON public.tags FOR UPDATE TO authenticated USING (true);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID REFERENCES public.tags(id),
  operator_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('load', 'purchase')),
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transactions" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = operator_id);

-- Sale items table
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sale items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sale items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default products
INSERT INTO public.products (name, price, category, emoji, stock, min_stock) VALUES
  ('Cerveja', 12, 'bebidas', '🍺', 200, 20),
  ('Água', 5, 'bebidas', '💧', 300, 30),
  ('Refrigerante', 8, 'bebidas', '🥤', 150, 15),
  ('Energético', 18, 'bebidas', '⚡', 100, 10),
  ('Caipirinha', 20, 'bebidas', '🍹', 80, 10),
  ('Shot Tequila', 15, 'bebidas', '🥃', 60, 10),
  ('X-Burger', 22, 'comidas', '🍔', 50, 10),
  ('Batata Frita', 15, 'comidas', '🍟', 60, 10),
  ('Porção Calabresa', 25, 'comidas', '🥓', 40, 8),
  ('Coxinha', 8, 'comidas', '🍗', 80, 15),
  ('Cigarro', 12, 'cigarros', '🚬', 100, 20),
  ('Chiclete', 3, 'doces', '🍬', 200, 30),
  ('Bala', 2, 'doces', '🍭', 200, 30),
  ('Chocolate', 7, 'doces', '🍫', 100, 20);