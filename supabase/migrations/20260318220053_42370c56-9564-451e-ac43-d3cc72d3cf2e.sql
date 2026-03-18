-- Fix tags update policy - any authenticated operator can update tags (required for POS operations)
-- This is intentional for festival operations where all operators process payments
DROP POLICY "Authenticated users can update tags" ON public.tags;
CREATE POLICY "Authenticated operators can update tags" ON public.tags FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);