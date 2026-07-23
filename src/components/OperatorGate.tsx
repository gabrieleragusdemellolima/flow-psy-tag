import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Login from '@/pages/Login';
import { toast } from 'sonner';

export default function OperatorGate({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (user && user.email && !user.email.toLowerCase().endsWith('@gmail.com')) {
      toast.error('Acesso permitido apenas para contas @gmail.com');
      signOut();
    }
  }, [user, signOut]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-mono animate-pulse">CARREGANDO...</p>
      </div>
    );
  }

  if (!user) return <Login />;
  return <>{children}</>;
}
