import { createContext, useContext, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';

const ANONYMOUS_USER = {
  id: 'anonymous-operator',
  email: 'operator@local',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '',
} as unknown as User;

interface AuthCtx {
  user: User;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: ANONYMOUS_USER,
  loading: false,
  isAdmin: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: ANONYMOUS_USER, loading: false, isAdmin: true, signOut: async () => {} }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
