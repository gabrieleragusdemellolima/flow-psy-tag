-- Tighten RLS: only allow product updates/deletes by the creator or any authenticated user (festival ops need shared access)
-- The sale_items insert WITH CHECK (true) is needed because the operator_id check is on the parent transactions table

-- For products: restrict delete to creator
DROP POLICY "Authenticated users can delete products" ON public.products;
CREATE POLICY "Creator can delete products" ON public.products FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- For products: restrict update to creator  
DROP POLICY "Authenticated users can update products" ON public.products;
CREATE POLICY "Creator can update products" ON public.products FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- For sale_items: tie insert to transaction ownership
DROP POLICY "Authenticated users can insert sale items" ON public.sale_items;
CREATE POLICY "Authenticated can insert sale items" ON public.sale_items FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.transactions t 
    WHERE t.id = transaction_id AND t.operator_id = auth.uid()
  )
);