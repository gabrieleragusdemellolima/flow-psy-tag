import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  operator_number: string | null;
  phone: string | null;
}

export type AppRole = 'admin' | 'operator' | 'caixa';

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  /** caixa or admin: can access "Carregar Tag" */
  canLoadTag: boolean;
  roles: AppRole[];
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  canLoadTag: false,
  roles: [],
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canLoadTag, setCanLoadTag] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name, email, avatar_url, operator_number, phone').eq('user_id', uid).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', uid),
    ]);
    const list = ((roleRows || []).map((r) => r.role) as AppRole[]);
    setProfile(prof as Profile | null);
    setRoles(list);
    setIsAdmin(list.includes('admin'));
    setCanLoadTag(list.includes('admin') || list.includes('caixa'));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isAdmin, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
