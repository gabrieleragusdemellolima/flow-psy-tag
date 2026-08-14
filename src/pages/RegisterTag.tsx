import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { useNfcBridge } from '@/hooks/useNfcBridge';
import { motion } from 'framer-motion';
import { Tag, Phone, Mail, IdCard, Wifi, WifiOff, Search, CheckCircle2, User } from 'lucide-react';
import { toast } from 'sonner';

interface RegisteredTag {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  tag_code: string | null;
}

export default function RegisterTag() {
  const { user } = useAuth();
  const { fetchTags } = useStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [tagCode, setTagCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [list, setList] = useState<RegisteredTag[]>([]);

  const handleTagRead = useCallback((uid: string) => {
    setTagCode(uid.toUpperCase());
    toast.success(`Tag lida: ${uid}`);
  }, []);

  const nfc = useNfcBridge(handleTagRead, undefined, false);

  const fetchList = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, email, document, tag_id, tags(tag_code)')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      setList(
        (data as any[]).map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          document: c.document,
          tag_code: c.tags?.tag_code ?? null,
        })),
      );
    }
  };

  useEffect(() => {
    if (user) fetchList();
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error('Informe o nome');
    if (!phone.trim()) return toast.error('Informe o telefone (WhatsApp para recibo)');
    if (!document.trim()) return toast.error('Informe o documento');
    if (!tagCode.trim()) return toast.error('Leia a tag no leitor ou digite o número da tag');

    setLoading(true);
    try {
      const code = tagCode.trim().toUpperCase();
      const { data: existing } = await supabase
        .from('tags')
        .select('id')
        .ilike('tag_code', code)
        .maybeSingle();

      let tagId = existing?.id ?? null;
      if (!tagId) {
        const { data: newTag, error: tagErr } = await supabase
          .from('tags')
          .insert({ tag_code: code, created_by: user.id })
          .select('id')
          .single();
        if (tagErr) throw tagErr;
        tagId = newTag.id;
      }

      const { error } = await supabase.from('customers').insert({
        name: name.trim(),
        phone: phone.trim(),
        document: document.trim(),
        email: email.trim() || null,
        tag_id: tagId,
        created_by: user.id,
      } as never);
      if (error) throw error;

      toast.success('Tag cadastrada com sucesso!');
      setName(''); setPhone(''); setDocument(''); setEmail(''); setTagCode('');
      fetchList();
      fetchTags();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao cadastrar tag');
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? list.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.phone || '').includes(search) ||
          (c.document || '').includes(search) ||
          (c.tag_code || '').toLowerCase().includes(q)
        );
      })
    : list;

  const inputCls =
    'w-full bg-muted/50 px-4 py-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground';

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Tag size={22} className="text-primary" /> Cadastrar Tag
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vincule a tag aos dados do cliente para localizar e bloquear quando necessário
        </p>
      </div>

      {/* NFC bridge */}
      <div className="card-surface p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {nfc.connected ? <Wifi className="text-primary shrink-0" size={20} /> : <WifiOff className="text-muted-foreground shrink-0" size={20} />}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">NFC Bridge</p>
            <p className="text-xs text-muted-foreground">
              {nfc.connected ? '🟢 Conectado — encoste a tag no leitor' : 'Desconectado — você pode digitar o número da tag'}
            </p>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={nfc.connected ? nfc.disconnect : nfc.connect}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            nfc.connected ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-primary/10 text-primary hover:bg-primary/20 glow-primary'
          }`}>
          {nfc.connected ? 'Desconectar' : 'Conectar'}
        </motion.button>
      </div>

      <div className="card-surface p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Nome do cliente" className={`mt-1 ${inputCls}`} />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Telefone / WhatsApp *</label>
          <div className="relative mt-1">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="(11) 99999-9999" className={`${inputCls} pl-10`} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Documento (CPF/RG) *</label>
          <div className="relative mt-1">
            <IdCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={document} onChange={(e) => setDocument(e.target.value)} maxLength={30} placeholder="000.000.000-00" className={`${inputCls} pl-10`} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">E-mail (opcional)</label>
          <div className="relative mt-1">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} placeholder="cliente@email.com" className={`${inputCls} pl-10`} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Tag size={12} /> Número da Tag *
          </label>
          <input
            value={tagCode}
            onChange={(e) => setTagCode(e.target.value.toUpperCase())}
            placeholder="Encoste a tag no leitor ou digite o número"
            className={`mt-1 font-mono ${inputCls} ${tagCode ? 'ring-2 ring-primary/40' : ''}`}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Sem leitor ou leitor com defeito? Digite o número da tag manualmente.
          </p>
        </div>

        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={loading}
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-lg font-display font-bold text-sm glow-primary disabled:opacity-30 transition-all">
          {loading ? 'CADASTRANDO...' : 'CADASTRAR TAG'}
        </motion.button>
      </div>

      {/* List */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, telefone, documento ou tag..."
            className={`${inputCls} pl-10 bg-muted/30`} />
        </div>

        {filtered.length === 0 ? (
          <div className="card-surface p-8 text-center">
            <Tag size={28} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma tag cadastrada</p>
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="card-surface-sm p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0">
                <User size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.phone || 'sem telefone'} {c.document ? `• ${c.document}` : ''}
                </p>
              </div>
              {c.tag_code ? (
                <span className="font-mono text-[11px] text-primary bg-primary/10 px-2 py-1 rounded flex items-center gap-1">
                  <CheckCircle2 size={12} /> {c.tag_code}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">sem tag</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
