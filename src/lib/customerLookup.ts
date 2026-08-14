import { supabase } from '@/integrations/supabase/client';

export interface TagOwner {
  name: string | null;
  phone: string | null;
}

/** Finds the customer linked to a tag code (used to fill receipts / WhatsApp). */
export async function findTagOwner(tagCode?: string | null): Promise<TagOwner | null> {
  if (!tagCode) return null;
  const code = tagCode.trim();
  const { data: tag } = await supabase
    .from('tags')
    .select('id')
    .ilike('tag_code', code)
    .maybeSingle();
  if (!tag) return null;

  const { data: customer } = await supabase
    .from('customers')
    .select('name, phone')
    .eq('tag_id', tag.id)
    .eq('active', true)
    .maybeSingle();

  if (!customer) return null;
  return { name: customer.name, phone: customer.phone };
}
