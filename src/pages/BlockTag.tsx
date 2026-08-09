import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Search, ShieldOff, ShieldCheck, Tag as TagIcon, Phone, IdCard, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  tag_id: string | null;
}

interface TagRow {
  id: string;
  tag_code: string;
  balance: number;
  active: boolean;
}

interface Result {
  customer: CustomerRow | null;
  tag: TagRow;
}

export default function BlockTag() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
    }
  }, [query]);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q || !user) return;
    setLoading(true);
    try {
      const like = `%${q}%`;
      const [{ data: customers }, { data: tagsByCode }] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name, phone, email, document, tag_id')
          .or(`name.ilike.${like},phone.ilike.${like},document.ilike.${like},email.ilike.${like}`)
          .limit(20),
        supabase.from('tags').select('id, tag_code, balance, active').ilike('tag_code', like).limit(20),
      ]);

      const tagIds = (customers || []).map((c) => c.tag_id).filter(Boolean) as string[];
      let linkedTags: TagRow[] = [];
      if (tagIds.length) {
        const { data } = await supabase.from('tags').select('id, tag_code, balance, active').in('id', tagIds);
        linkedTags = (data || []) as TagRow[];
      }

      const rows: Result[] = [];
      (customers || []).forEach((c) => {
        const t = linkedTags.find((lt) => lt.id === c.tag_id);
        if (t) rows.push({ customer: c as CustomerRow, tag: { ...t, balance: Number(t.balance) } });
      });
      (tagsByCode || []).forEach((t) => {
        if (rows.some((r) => r.tag.id === t.id)) return;
        const owner = (customers || []).find((c) => c.tag_id === t.id) as CustomerRow | undefined;
        rows.push({ customer: owner ?? null, tag: { ...t, balance: Number(t.balance) } as TagRow });
      });

      setResults(rows);
      setSearched(true);
    } catch {
      toast.error('Erro ao buscar');
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = async (tag: TagRow) => {
    setBusyId(tag.id);
    const nextActive = !tag.active;
    const { error } = await supabase.from('tags').update({ active: nextActive }).eq('id', tag.id);
    setBusyId(null);
    if (error) {
      toast.error('Não foi possível atualizar a tag');
      return;
    }
    setResults((prev) => prev.map((r) => (r.tag.id === tag.id ? { ...r, tag: { ...r.tag, active: nextActive } } : r)));
    toast.success(nextActive ? `Tag ${tag.tag_code} desbloqueada` : `Tag ${tag.tag_code} bloqueada`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-20 md:pb-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Lock className="text-accent" size={22} /> Bloquear Tag
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Perda ou roubo: busque por nome, telefone, documento ou código da tag.
        </p>
      </div>

      <div className="card-surface p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Nome, telefone, documento ou tag"
              className="w-full bg-muted/50 pl-9 pr-3 py-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSearch}
            disabled={!query.trim() || loading}
            className="px-5 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold disabled:opacity-30"
          >
            {loading ? '...' : 'Buscar'}
          </motion.button>
        </div>
      </div>

      {searched && results.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Nenhuma tag encontrada</p>
      )}

      <div className="space-y-3">
        {results.map(({ customer, tag }) => (
          <motion.div
            key={tag.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-surface p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{customer?.name ?? 'Sem cliente vinculado'}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                  <TagIcon size={12} /> {tag.tag_code}
                </span>
                {customer?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {customer.phone}
                  </span>
                )}
                {customer?.document && (
                  <span className="flex items-center gap-1">
                    <IdCard size={12} /> {customer.document}
                  </span>
                )}
                <span className="font-mono">Saldo: R$ {Number(tag.balance).toFixed(2)}</span>
              </div>
              <span
                className={`inline-block mt-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  tag.active ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'
                }`}
              >
                {tag.active ? 'Ativa' : 'Bloqueada'}
              </span>
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => toggleBlock(tag)}
              disabled={busyId === tag.id}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold disabled:opacity-40 ${
                tag.active
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {tag.active ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
              {tag.active ? 'Bloquear' : 'Desbloquear'}
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
