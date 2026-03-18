import { useState } from 'react';
import { useStore, type Product } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, X, CheckCircle2, AlertTriangle, Smartphone } from 'lucide-react';

const categories = [
  { id: 'all', label: 'Todos', emoji: '✨' },
  { id: 'bebidas', label: 'Bebidas', emoji: '🍺' },
  { id: 'comidas', label: 'Comidas', emoji: '🍟' },
  { id: 'cigarros', label: 'Cigarros', emoji: '🚬' },
  { id: 'doces', label: 'Doces', emoji: '🍬' },
] as const;

export default function POS() {
  const {
    products, cart, addToCart, removeFromCart, updateQuantity,
    clearCart, cartTotal, tags, activeTag, setActiveTag,
    deductFromTag, addTransaction, isDemoMode,
  } = useStore();

  const [filter, setFilter] = useState<string>('all');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState('');
  const [scanning, setScanning] = useState(false);

  const filtered = filter === 'all' ? products : products.filter((p) => p.category === filter);
  const total = cartTotal();

  const handleSimulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      const tag = tags[Math.floor(Math.random() * tags.length)];
      if (tag) setActiveTag(tag);
      setScanning(false);
    }, 1000);
  };

  const handlePay = () => {
    if (!activeTag || cart.length === 0) return;
    if (total > activeTag.balance) {
      setShowError(`SALDO INSUFICIENTE // R$ ${activeTag.balance.toFixed(2)} disponível`);
      setTimeout(() => setShowError(''), 3000);
      return;
    }
    const ok = deductFromTag(activeTag.id, total);
    if (ok) {
      addTransaction({ tagId: activeTag.id, amount: total, type: 'purchase', items: [...cart] });

      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 1200; gain.gain.value = 0.1;
        osc.start(); osc.stop(ctx.currentTime + 0.1);
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2); gain2.connect(ctx.destination);
          osc2.frequency.value = 1600; gain2.gain.value = 0.1;
          osc2.start(); osc2.stop(ctx.currentTime + 0.1);
        }, 120);
      } catch {}

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        clearCart();
        setActiveTag(null);
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] pb-16 md:pb-0">
      {/* Success/Error overlays */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="card-surface glow-primary p-10 text-center">
              <CheckCircle2 className="text-primary mx-auto mb-3" size={64} />
              <p className="font-display text-xl font-bold text-primary">TRANSAÇÃO CONFIRMADA</p>
              <p className="font-mono text-2xl mt-2">-R$ {total.toFixed(2)}</p>
            </motion.div>
          </motion.div>
        )}
        {showError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-accent/10 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card-surface glow-accent p-10 text-center">
              <AlertTriangle className="text-accent mx-auto mb-3" size={64} />
              <p className="font-display text-lg font-bold text-accent">{showError}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product grid */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Category filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {categories.map((c) => (
            <motion.button key={c.id} whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(c.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                ${filter === c.id
                  ? 'bg-secondary/20 text-secondary glow-secondary'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}
            >
              <span>{c.emoji}</span> {c.label}
            </motion.button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto flex-1 pr-1">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={addToCart} />
          ))}
        </div>
      </div>

      {/* Cart sidebar */}
      <div className="w-full lg:w-80 card-surface p-4 flex flex-col">
        {/* Tag status */}
        <div className="card-surface-sm p-3 mb-4 text-center">
          {activeTag ? (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Tag Conectada</p>
              <p className="font-mono text-sm text-primary font-bold">{activeTag.id}</p>
              <p className="font-mono text-lg text-primary">R$ {(tags.find(t => t.id === activeTag.id)?.balance ?? activeTag.balance).toFixed(2)}</p>
            </div>
          ) : (
            <div>
              <Smartphone className="mx-auto text-muted-foreground mb-1" size={20} />
              <p className="text-xs text-muted-foreground">
                {scanning ? 'Escaneando...' : 'READY TO SCAN'}
              </p>
              {isDemoMode && (
                <button onClick={handleSimulateScan} disabled={scanning}
                  className="mt-2 text-xs text-secondary underline disabled:opacity-50">
                  Simular Tag
                </button>
              )}
            </div>
          )}
        </div>

        <h3 className="font-display font-semibold text-sm mb-3">Carrinho</h3>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {cart.length === 0 ? (
            <p className="text-muted-foreground text-xs text-center py-6">Selecione produtos</p>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product.emoji} {item.product.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">R$ {item.product.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-7 h-7 flex items-center justify-center bg-muted/50 rounded text-foreground">
                    <Minus size={12} />
                  </button>
                  <span className="font-mono text-sm w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center bg-muted/50 rounded text-foreground">
                    <Plus size={12} />
                  </button>
                  <button onClick={() => removeFromCart(item.product.id)}
                    className="w-7 h-7 flex items-center justify-center text-accent hover:bg-accent/10 rounded">
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Total + pay */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-mono text-3xl font-bold text-primary">R$ {total.toFixed(2)}</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handlePay}
            disabled={!activeTag || cart.length === 0}
            className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-display font-bold text-base glow-primary disabled:opacity-30 disabled:shadow-none transition-all"
          >
            {activeTag ? 'CONFIRMAR PAGAMENTO' : 'TAP TAG TO PAY'}
          </motion.button>
          {cart.length > 0 && (
            <button onClick={clearCart} className="w-full mt-2 py-2 text-xs text-muted-foreground hover:text-accent transition-colors">
              Limpar carrinho
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={() => onAdd(product)}
      className="card-surface-sm aspect-square flex flex-col items-center justify-center gap-2 p-3 hover:bg-muted/30 transition-all group"
    >
      <span className="text-4xl group-hover:scale-110 transition-transform">{product.emoji}</span>
      <span className="text-sm font-medium text-foreground text-center leading-tight">{product.name}</span>
      <span className="font-mono text-primary font-semibold text-sm">R$ {product.price.toFixed(2)}</span>
    </motion.button>
  );
}
