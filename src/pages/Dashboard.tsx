import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { CreditCard, TrendingUp, ShoppingCart, Users, AlertTriangle } from 'lucide-react';

function StatCard({ label, value, icon: Icon, glowClass }: {
  label: string; value: string; icon: React.ElementType; glowClass: string;
}) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} className={`card-surface p-5 ${glowClass}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon size={18} className="text-muted-foreground" />
      </div>
      <p className="font-mono text-2xl lg:text-3xl font-semibold">{value}</p>
    </motion.div>
  );
}

export default function Dashboard() {
  const { tags, transactions, products, fetchProducts, fetchTags, fetchTransactions } = useStore();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchTags();
      fetchTransactions();
    }
  }, [user]);

  const totalBalance = tags.reduce((sum, t) => sum + t.balance, 0);
  const totalSales = transactions.filter((t) => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
  const totalLoaded = transactions.filter((t) => t.type === 'load').reduce((sum, t) => sum + t.amount, 0);
  const lowStockProducts = products.filter((p) => p.stock <= p.min_stock);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold">
          TagFlow<span className="text-secondary"> Psy</span> <span className="text-muted-foreground font-normal text-lg">// Terminal</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Sistema de pagamento NFC para festivais</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Saldo Total Tags" value={`R$ ${totalBalance.toFixed(2)}`} icon={CreditCard} glowClass="glow-primary" />
        <StatCard label="Vendas Totais" value={`R$ ${totalSales.toFixed(2)}`} icon={TrendingUp} glowClass="glow-secondary" />
        <StatCard label="Total Carregado" value={`R$ ${totalLoaded.toFixed(2)}`} icon={ShoppingCart} glowClass="glow-primary" />
        <StatCard label="Tags Ativas" value={`${tags.length}`} icon={Users} glowClass="glow-secondary" />
      </div>

      {/* Low stock alert */}
      {lowStockProducts.length > 0 && (
        <div className="card-surface glow-accent p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-accent" />
            <h2 className="font-display text-lg font-semibold text-accent">Estoque Baixo</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {lowStockProducts.map((p) => (
              <div key={p.id} className="bg-muted/30 rounded-lg p-3 flex items-center gap-2">
                <span>{p.emoji}</span>
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="font-mono text-xs text-accent">{p.stock} un.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="card-surface p-5">
        <h2 className="font-display text-lg font-semibold mb-4">Tags Ativas</h2>
        <div className="space-y-2">
          {tags.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Nenhuma tag registrada</p>
          ) : tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                <span className="font-mono text-sm">{tag.tag_code}</span>
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
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">
                    {new Date(tx.created_at).toLocaleTimeString('pt-BR')}
                  </p>
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
