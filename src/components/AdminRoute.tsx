import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/** Restricts a route to admins. Sellers (operators) are sent to the POS. */
export default function AdminRoute({ children, redirectTo }: { children: ReactNode; redirectTo?: string }) {
  const { isAdmin, loading, user } = useAuth();

  if (loading) {
    return <p className="text-muted-foreground font-mono animate-pulse">CARREGANDO...</p>;
  }

  if (!user) return <Navigate to="/pos" replace />;

  if (!isAdmin && redirectTo) return <Navigate to={redirectTo} replace />;

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto card-surface p-8 text-center space-y-3">
        <Lock className="mx-auto text-destructive" size={32} />
        <h1 className="font-display text-xl font-bold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Vendedores têm acesso apenas ao PDV e ao carregamento de tags.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
