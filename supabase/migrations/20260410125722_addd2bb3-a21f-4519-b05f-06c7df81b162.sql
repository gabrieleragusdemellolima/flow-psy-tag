
-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  tag_id UUID REFERENCES public.tags(id) ON DELETE SET NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast tag lookup
CREATE INDEX idx_customers_tag_id ON public.customers(tag_id);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view customers"
ON public.customers FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert customers"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update customers"
ON public.customers FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete customers"
ON public.customers FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for customer photos
INSERT INTO storage.buckets (id, name, public) VALUES ('customer-photos', 'customer-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view customer photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'customer-photos');

CREATE POLICY "Authenticated users can upload customer photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'customer-photos');

CREATE POLICY "Authenticated users can update customer photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'customer-photos');
