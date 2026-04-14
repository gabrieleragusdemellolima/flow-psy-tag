import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Shield, Users, Crown } from 'lucide-react';

interface UserWithRole {
  user_id: string;
  email: string;
  display_name: string;
  role: string | null;
}

export default function Admin() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('user_id, email, display_name');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');

    if (profiles) {
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      setUsers(profiles.map(p => ({
        user_id: p.user_id,
        email: p.email || '',
        display_name: p.display_name || '',
        role: roleMap.get(p.user_id) || 'operator',
      })));
    }
    setLoading(false);
  };

  const toggleAdmin = async (userId: string, currentRole: string | null) => {
    if (currentRole === 'admin') {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
    } else {
      await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
    }
    await loadUsers();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <Shield className="text-primary" size={24} />
        <div>
          <h1 className="font-display text-2xl font-bold">Administração</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerenciar operadores e permissões</p>
        </div>
      </div>

      <div className="card-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-muted-foreground" />
          <h2 className="font-display font-semibold">Operadores ({users.length})</h2>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-8 animate-pulse-glow font-mono">CARREGANDO...</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <motion.div key={u.user_id} layout
                className="card-surface-sm p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{u.display_name || u.email?.split('@')[0]}</p>
                    {u.role === 'admin' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                        <Crown size={10} /> ADM
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleAdmin(u.user_id, u.role)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all
                    ${u.role === 'admin'
                      ? 'bg-accent/10 text-accent hover:bg-accent/20'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                >
                  {u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="card-surface p-5">
        <h2 className="font-display font-semibold mb-3">Permissões Admin</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { label: 'Gerenciar Produtos', desc: 'Adicionar, editar, remover produtos e preços' },
            { label: 'Controle de Estoque', desc: 'Alterar quantidades e limites mínimos' },
            { label: 'Gerenciar Operadores', desc: 'Promover e remover administradores' },
            { label: 'Relatórios Completos', desc: 'Acesso a todos os dados e filtros' },
          ].map((p) => (
            <div key={p.label} className="bg-muted/20 rounded-lg p-3">
              <p className="text-sm font-medium text-primary">{p.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
