ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS operator_name text,
ADD COLUMN IF NOT EXISTS operator_number text;