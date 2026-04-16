import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { UserCircle2, LogIn } from 'lucide-react';
import { useOperator } from '@/hooks/useOperator';

export default function OperatorGate({ children }: { children: ReactNode }) {
  const { operator, setOperator } = useOperator();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');

  if (operator) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const num = number.trim();
    if (!n || !num) return;
    setOperator({ name: n, number: num });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-surface glow-primary w-full max-w-sm p-7 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle2 className="text-primary" size={32} />
          </div>
          <h1 className="font-display font-bold text-2xl text-primary">
            TagFlow<span className="text-secondary"> Psy</span>
          </h1>
          <p className="text-sm text-muted-foreground">Identifique o operador para começar</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Nome do operador
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João Silva"
              className="mt-1 w-full bg-muted/50 px-4 py-3 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Número / ID do operador
            </label>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Ex: 001"
              className="mt-1 w-full bg-muted/50 px-4 py-3 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground font-mono"
            />
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={!name.trim() || !number.trim()}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-display font-bold flex items-center justify-center gap-2 glow-primary disabled:opacity-30 disabled:shadow-none transition-all"
        >
          <LogIn size={18} />
          ENTRAR
        </motion.button>

        <p className="text-[11px] text-center text-muted-foreground">
          Esta identificação será gravada em todas as vendas e cargas.
        </p>
      </motion.form>
    </div>
  );
}
