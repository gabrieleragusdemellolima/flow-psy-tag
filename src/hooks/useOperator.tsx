import { useAuth } from './useAuth';

export interface Operator {
  id: string;
  name: string;
  number: string;
}

export function useOperator() {
  const { user, profile, signOut } = useAuth();
  const operator: Operator | null = user
    ? {
        id: user.id,
        name: profile?.display_name || user.email?.split('@')[0] || 'Operador',
        number: profile?.operator_number || '—',
      }
    : null;
  return { operator, clearOperator: signOut, setOperator: () => {} };
}

export function OperatorProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
