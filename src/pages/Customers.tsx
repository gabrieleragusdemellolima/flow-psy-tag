import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Search, Phone, Users as UsersIcon, Tag, Mail, IdCard } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  tag_id: string | null;
  balance: number;
  active: boolean;
}

export default function Customers() {
  const { user } = useAuth();
  const { tags, fetchTags } = useStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [document, setDocument] = useState('');
  const [tagCode, setTagCode] = useState('');
  const [useTag, setUseTag] = useState(false);


  useEffect(() => {
    if (user) {
      fetchCustomers();
      fetchTags();
    }
  }, [user]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('active', true)
      .order('name');
    if (data) setCustomers(data as Customer[]);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !user) return;
    setLoading(true);

    try {
      let finalTagId: string | null = null;
      if (useTag && tagCode.trim()) {
        const existing = tags.find((t) => t.tag_code.toLowerCase() === tagCode.trim().toLowerCase());
        if (existing) {
          finalTagId = existing.id;
        } else {
          const { data: newTag, error: tagErr } = await supabase
            .from('tags')
            .insert({ tag_code: tagCode.trim().toUpperCase(), created_by: user.id })
            .select('id')
            .single();
          if (tagErr) throw tagErr;
          finalTagId = newTag.id;
        }
      }

      const { error } = await supabase.from('customers').insert({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        document: document.trim() || null,
        tag_id: finalTagId,
        created_by: user.id,
      } as never);

      if (error) throw error;

      toast.success('Cliente cadastrado com sucesso!');
      setName('');
      setPhone('');
      setEmail('');
      setDocument('');
      setTagCode('');
      setUseTag(false);
      setShowForm(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao cadastrar cliente');
    } finally {
      setLoading(false);
    }
  };

  const filtered = search
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.document?.includes(search)
      )
    : customers;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <UsersIcon size={24} className="text-secondary" /> Clientes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Cadastro e vinculação de Tag NFC</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm flex items-center gap-2 glow-primary"
        >
          <UserPlus size={16} /> Novo
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="card-surface p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full mt-1 bg-muted/50 px-4 py-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Telefone</label>
                <div className="relative mt-1">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-muted/50 pl-10 pr-4 py-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                <div className="relative mt-1">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full bg-muted/50 pl-10 pr-4 py-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Documento (CPF/RG)</label>
                <div className="relative mt-1">
                  <IdCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-muted/50 pl-10 pr-4 py-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setUseTag(!useTag)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      useTag ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                    }`}
                  >
                    {useTag && <span className="text-primary-foreground text-xs">✓</span>}
                  </button>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Tag size={12} /> Vincular Tag NFC (opcional)
                  </label>
                </div>
                {useTag && (
                  <input
                    type="text"
                    value={tagCode}
                    onChange={(e) => setTagCode(e.target.value.toUpperCase())}
                    placeholder="Digite o código da tag (ex: AB12CD34)"
                    className="w-full bg-muted/50 px-4 py-3 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                  />
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={!name.trim() || loading}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-lg font-display font-bold text-sm glow-primary disabled:opacity-30 disabled:shadow-none transition-all"
              >
                {loading ? 'CADASTRANDO...' : 'CADASTRAR CLIENTE'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full bg-muted/30 pl-10 pr-4 py-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card-surface p-8 text-center">
            <UsersIcon size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum cliente cadastrado</p>
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="card-surface-sm p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                <UsersIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {c.phone && <span>{c.phone}</span>}
                  {c.email && <span className="truncate">{c.email}</span>}
                  {c.document && <span>Doc: {c.document}</span>}
                  {c.tag_id && <span className="text-primary">🏷️ Tag</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold text-primary">R$ {Number(c.balance).toFixed(2)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
