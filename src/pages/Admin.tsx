import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Shield, Users, Crown, UserPlus, Trash2, Mail, Phone, Hash, User as UserIcon, Lock, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import Reports from '@/pages/Reports';

type Role = 'admin' | 'operator';

interface Invite {
  id: string;
  email: string;
  display_name: string | null;
  operator_number: string | null;
  phone: string | null;
  role: Role;
  claimed_at: string | null;
  created_at: string;
}

interface UserRow {
  user_id: string;
  email: string;
  display_name: string;
  operator_number: string | null;
  phone: string | null;
  role: Role;
}

export default function Admin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'financeiro' | 'equipe'>('financeiro');

  const [form, setForm] = useState({ email: '', display_name: '', operator_number: '', phone: '', role: 'operator' as Role });

  const loadAll = async () => {
    setLoading(true);
    const [{ data: prof }, { data: roles }, { data: inv }] = await Promise.all([
      supabase.from('profiles').select('user_id, email, display_name, operator_number, phone'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('operator_invites').select('*').order('created_at', { ascending: false }),
    ]);
    const roleMap = new Map<string, Role>((roles || []).map((r: any) => [r.user_id, r.role]));
    setUsers(
      (prof || []).map((p: any) => ({
        user_id: p.user_id,
        email: p.email || '',
        display_name: p.display_name || '',
        operator_number: p.operator_number,
        phone: p.phone,
        role: roleMap.get(p.user_id) || 'operator',
      })),
    );
    setInvites((inv || []) as Invite[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  const nextOperatorNumber = () => {
    const used = [...invites.map((i) => i.operator_number), ...users.map((u) => u.operator_number)]
      .map((n) => parseInt((n || '').replace(/\D/g, ''), 10))
      .filter((n) => !Number.isNaN(n));
    const next = (used.length ? Math.max(...used) : 0) + 1;
    return String(next).padStart(3, '0');
  };

  const handleAddInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!email.endsWith('@gmail.com')) {
      toast.error('Somente e-mails @gmail.com são aceitos');
      return;
    }
    const { error } = await supabase.from('operator_invites').upsert(
      {
        email,
        display_name: form.display_name.trim() || email.split('@')[0],
        operator_number: form.operator_number.trim() || nextOperatorNumber(),
        phone: form.phone.trim() || null,
        role: form.role,
      },
      { onConflict: 'email' },
    );
    if (error) return toast.error(error.message);

    // If this person already signed in before, apply the role right away
    const existing = users.find((u) => u.email.toLowerCase() === email);
    if (existing && existing.role !== form.role) {
      await supabase.from('user_roles').delete().eq('user_id', existing.user_id);
      await supabase.from('user_roles').insert({ user_id: existing.user_id, role: form.role });
    }

    toast.success(
      form.role === 'operator'
        ? 'Vendedor salvo. Ele terá acesso apenas ao PDV e Carregar Tag.'
        : 'Administrador salvo.',
    );
    setForm({ email: '', display_name: '', operator_number: '', phone: '', role: 'operator' });
    loadAll();
  };

  const removeInvite = async (id: string) => {
    await supabase.from('operator_invites').delete().eq('id', id);
    loadAll();
  };

  const toggleAdmin = async (userId: string, currentRole: Role) => {
    if (currentRole === 'admin') {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
    } else {
      await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
    }
    loadAll();
  };

  if (authLoading) return <p className="text-muted-foreground font-mono animate-pulse">CARREGANDO...</p>;

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto card-surface p-8 text-center space-y-3">
        <Lock className="mx-auto text-destructive" size={32} />
        <h1 className="font-display text-xl font-bold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">Somente administradores podem acessar este painel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <Shield className="text-primary" size={24} />
        <div>
          <h1 className="font-display text-2xl font-bold">Painel ADM</h1>
          <p className="text-muted-foreground text-sm mt-1">Relatórios financeiros e controle de acesso (login via Gmail)</p>
        </div>
      </div>

      <div className="flex gap-2">
        {([
          { id: 'financeiro', label: 'Financeiro', icon: BarChart3 },
          { id: 'equipe', label: 'Equipe', icon: Users },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
              ${tab === id ? 'bg-primary/10 text-primary glow-primary' : 'bg-muted/40 text-muted-foreground hover:text-foreground'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'financeiro' && <Reports />}

      {tab === 'equipe' && (
        <div className="space-y-6">
      {/* Convidar */}
      <div className="card-surface p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus size={18} className="text-primary" />
          <h2 className="font-display font-semibold">Cadastrar vendedor (ou novo ADM)</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Basta o e-mail @gmail. Vendedores acessam apenas <strong>PDV</strong> e <strong>Carregar Tag</strong>.
          Quem entrar com Gmail sem estar nesta lista entra como ADM.
        </p>

        <form onSubmit={handleAddInvite} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="Nome (opcional)" className="w-full pl-9 pr-3 py-2.5 bg-muted/50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@gmail.com" type="email"
              className="w-full pl-9 pr-3 py-2.5 bg-muted/50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="relative">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={form.operator_number} onChange={(e) => setForm({ ...form, operator_number: e.target.value })}
              placeholder="Nº vendedor (opcional)" className="w-full pl-9 pr-3 py-2.5 bg-muted/50 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Telefone (opcional)" className="w-full pl-9 pr-3 py-2.5 bg-muted/50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="flex gap-2 md:col-span-2">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="flex-1 px-3 py-2.5 bg-muted/50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50">
              <option value="operator">Vendedor (PDV + Carregar Tag)</option>
              <option value="admin">Administrador (acesso total)</option>
            </select>
            <motion.button whileTap={{ scale: 0.97 }} type="submit"
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm glow-primary">
              Salvar
            </motion.button>
          </div>
        </form>

        {invites.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Convites ({invites.length})</p>
            {invites.map((i) => (
              <div key={i.id} className="card-surface-sm p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{i.display_name}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${i.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {i.role === 'admin' ? 'ADM' : 'OPER'}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">#{i.operator_number}</span>
                    {i.claimed_at ? (
                      <span className="text-[10px] font-mono text-secondary">ATIVO</span>
                    ) : (
                      <span className="text-[10px] font-mono text-accent">PENDENTE</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{i.email}</p>
                </div>
                <button onClick={() => removeInvite(i.id)} className="text-muted-foreground hover:text-destructive p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usuários ativos */}
      <div className="card-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-muted-foreground" />
          <h2 className="font-display font-semibold">Usuários ativos ({users.length})</h2>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-8 animate-pulse-glow font-mono">CARREGANDO...</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <motion.div key={u.user_id} layout className="card-surface-sm p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{u.display_name || u.email?.split('@')[0]}</p>
                    {u.role === 'admin' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                        <Crown size={10} /> ADM
                      </span>
                    )}
                    {u.operator_number && (
                      <span className="text-[10px] font-mono text-muted-foreground">#{u.operator_number}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => toggleAdmin(u.user_id, u.role)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all
                    ${u.role === 'admin' ? 'bg-accent/10 text-accent hover:bg-accent/20' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
                  {u.role === 'admin' ? 'Tornar vendedor' : 'Tornar ADM'}
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
          </div>
        </div>
      )}
    </div>
  );
}
