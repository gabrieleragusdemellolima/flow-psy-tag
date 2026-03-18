import { useStore } from '@/store/useStore';
import { motion } from 'framer-motion';
import { CreditCard, TrendingUp, ShoppingCart, Users } from 'lucide-react';

function StatCard({ label, value, icon: Icon, glowClass }: {
  label: string; value: string; icon: React.ElementType; glowClass: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`card-surface p-5 ${glowClass}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon size={18} className="text-muted-foreground" />
      </div>
      <p className="font-mono text-2xl lg:text-3xl font-semibold">{value}</p>
    </motion.div>
  );
}

export default function Dashboard() {
  const tags = useStore((s) => s.tags);
  const transactions = useStore((s) => s.transactions);
  const products = useStore((s) => s.products);

  const totalBalance = tags.reduce((sum, t) => sum + t.balance, 0);
  const totalSales = transactions
    .filter((t) => t.type === 'purchase')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalLoaded = transactions
    .filter((t) => t.type === 'load')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold">
          TagFlow<span className="text-secondary"> Psy</span> <span className="text-muted-foreground font-normal text-lg">// Terminal</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Sistema de pagamento NFC para festivais</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          label="Saldo Total Tags"
          value={`R$ ${totalBalance.toFixed(2)}`}
          icon={CreditCard}
          glowClass="glow-primary"
        />
        <StatCard
          label="Vendas Totais"
          value={`R$ ${totalSales.toFixed(2)}`}
          icon={TrendingUp}
          glowClass="glow-secondary"
        />
        <StatCard
          label="Total Carregado"
          value={`R$ ${totalLoaded.toFixed(2)}`}
          icon={ShoppingCart}
          glowClass="glow-primary"
        />
        <StatCard
          label="Tags Ativas"
          value={`${tags.filter((t) => t.active).length}`}
          icon={Users}
          glowClass="glow-secondary"
        />
      </div>

      {/* Tags list */}
      <div className="card-surface p-5">
        <h2 className="font-display text-lg font-semibold mb-4">Tags Ativas</h2>
        <div className="space-y-2">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${tag.active ? 'bg-primary animate-pulse-glow' : 'bg-destructive'}`} />
                <span className="font-mono text-sm">{tag.id}</span>
              </div>
              <span className="font-mono text-primary font-semibold">R$ {tag.balance.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card-surface p-5">
        <h2 className="font-display text-lg font-semibold mb-4">Transações Recentes</h2>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Nenhuma transação ainda</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <span className={`text-xs font-medium uppercase tracking-wider ${tx.type === 'load' ? 'text-primary' : 'text-secondary'}`}>
                    {tx.type === 'load' ? 'CARGA' : 'COMPRA'}
                  </span>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">{tx.tagId}</p>
                </div>
                <span className={`font-mono font-semibold ${tx.type === 'load' ? 'text-primary' : 'text-secondary'}`}>
                  {tx.type === 'load' ? '+' : '-'}R$ {tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
