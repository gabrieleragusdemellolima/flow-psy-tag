import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/** Only "caixa" (cashier) and admins can load tags. Vendedores go to the POS. */
export default function CaixaRoute({ children }: { children: ReactNode }) {
  const { canLoadTag, loading, user } = useAuth();

  if (loading) {
    return <p className="text-muted-foreground font-mono animate-pulse">CARREGANDO...</p>;
  }

  if (!user || !canLoadTag) return <Navigate to="/pos" replace />;

  return <>{children}</>;
}
