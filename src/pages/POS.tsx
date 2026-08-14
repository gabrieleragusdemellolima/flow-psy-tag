import { useState, useEffect, useCallback } from 'react';
import { useStore, type Product } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useOperator } from '@/hooks/useOperator';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, X, CheckCircle2, AlertTriangle, Wifi, WifiOff, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useNfcBridge } from '@/hooks/useNfcBridge';
import IdentifyCustomer, { type CustomerIdentifier } from '@/components/IdentifyCustomer';
import ReceiptDialog from '@/components/ReceiptDialog';
import type { ReceiptData } from '@/lib/receipt';
import { findTagOwner } from '@/lib/customerLookup';


const categories = [
  { id: 'all', label: 'Todos', emoji: '✨' },
  { id: 'bebidas', label: 'Bebidas', emoji: '🍺' },
  { id: 'comidas', label: 'Comidas', emoji: '🍟' },
  { id: 'cigarros', label: 'Cigarros', emoji: '🚬' },
  { id: 'doces', label: 'Doces', emoji: '🍬' },
  { id: 'ingressos', label: 'Ingressos', emoji: '🎫' },
  { id: 'estacionamento', label: 'Estacion.', emoji: '🅿️' },
] as const;

export default function POS() {
  const {
    products, cart, addToCart, removeFromCart, updateQuantity,
    clearCart, cartTotal, tags, activeTag, setActiveTag,
    processPayment, processPaymentCustomer, fetchProducts, fetchTags,
  } = useStore();
  const { user, profile } = useAuth();
  const { operator } = useOperator();

  const [filter, setFilter] = useState<string>('all');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [identifier, setIdentifier] = useState<CustomerIdentifier | null>(null);
  const [showBridge, setShowBridge] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const handleTagRead = useCallback((uid: string) => {
    setIdentifier({ type: 'tag', tagCode: uid });
    const tag = useStore.getState().tags.find((t) => t.tag_code === uid);
    if (tag) setActiveTag(tag);
    toast.success(`Tag detectada: ${uid}`);
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 1200; gain.gain.value = 0.08;
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }, [setActiveTag]);

  const nfc = useNfcBridge(handleTagRead, undefined, false);

  useEffect(() => { if (user) { fetchProducts(); fetchTags(); } }, [user]);


  const filtered = filter === 'all' ? products : products.filter((p) => p.category === filter);
  const total = cartTotal();

  const currentBalance = identifier?.type === 'tag'
    ? (tags.find(t => t.tag_code === identifier.tagCode)?.balance || activeTag?.balance || 0)
    : 0;

  const handleIdentify = (id: CustomerIdentifier) => {
    setIdentifier(id);
    if (id.type === 'tag' && id.tagCode) {
      const tag = tags.find(t => t.tag_code === id.tagCode);
      if (tag) setActiveTag(tag);
    }
  };

  const handlePay = async () => {
    if (!identifier || cart.length === 0 || !user) return;
    if (total > currentBalance) {
      setShowError(`SALDO INSUFICIENTE // R$ ${currentBalance.toFixed(2)} disponível`);
      setTimeout(() => setShowError(''), 3000);
      return;
    }
    setProcessing(true);

    const soldItems = cart.map((i) => ({ name: i.product.name, quantity: i.quantity, unit_price: i.product.price }));
    const paidTotal = total;
    const tagCode = identifier.tagCode ?? null;

    let ok = false;
    if (identifier.type === 'tag' && activeTag) {
      ok = await processPayment(user.id, operator?.name, operator?.number);
    }

    setProcessing(false);

    if (ok) {
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

      const owner = await findTagOwner(tagCode);
      const remaining = useStore.getState().tags.find((t) => t.tag_code === tagCode)?.balance ?? null;

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIdentifier(null);
        setActiveTag(null);
        setReceipt({
          type: 'sale',
          tagCode,
          customerName: owner?.name ?? null,
          customerPhone: owner?.phone ?? null,
          operatorName: operator?.name || profile?.display_name || profile?.email || 'Operador',
          operatorNumber: operator?.number || profile?.operator_number || null,
          amount: paidTotal,
          balanceAfter: remaining,
          items: soldItems,
          date: new Date(),
        });
      }, 1500);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] pb-16 md:pb-0">
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
      <div className="flex-[2] lg:flex-1 flex flex-col min-h-[55vh] lg:min-h-0">
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map((c) => (
            <motion.button key={c.id} whileTap={{ scale: 0.95 }} onClick={() => setFilter(c.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border
                ${filter === c.id
                  ? 'bg-secondary/20 text-secondary border-secondary/50 glow-secondary'
                  : 'bg-muted/20 text-muted-foreground border-transparent hover:bg-muted/40'}`}>
              <span className="text-base leading-none">{c.emoji}</span> {c.label}
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 overflow-y-auto flex-1 pr-1 pb-2 content-start">
          {filtered.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground text-sm py-10">Nenhum produto nesta categoria</p>
          ) : filtered.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={addToCart} />
          ))}
        </div>
      </div>

      {/* Cart sidebar */}
      <div className="w-full lg:w-80 flex flex-col gap-3">
        {/* NFC Bridge WebSocket */}
        <div className="card-surface p-3 space-y-3">
          <button onClick={() => setShowBridge((v) => !v)} className="w-full flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 min-w-0">
              {nfc.connected ? <Wifi className="text-primary shrink-0" size={18} /> : <WifiOff className="text-muted-foreground shrink-0" size={18} />}
              <span className="text-xs font-medium text-foreground truncate">
                NFC Bridge — {nfc.connected ? '🟢 Conectado' : 'Desconectado'}
              </span>
            </span>
            <ChevronDown size={16} className={`text-muted-foreground shrink-0 transition-transform ${showBridge ? 'rotate-180' : ''}`} />
          </button>

          {showBridge && (
            <div className="space-y-3">
              {nfc.connected ? (
                <motion.button whileTap={{ scale: 0.95 }} onClick={nfc.disconnect}
                  className="w-full px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors">
                  Desconectar
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.95 }} onClick={nfc.connect}
                  className="w-full px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors glow-primary">
                  Conectar
                </motion.button>
              )}
              {nfc.error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-muted-foreground">{nfc.error}</p>
                  </div>
                  <ol className="space-y-1 pl-4 text-[11px] text-muted-foreground list-decimal">
                    <li>Verifique se o servidor NFC Bridge está rodando na porta 8888</li>
                    <li>Execute o script nfc-bridge antes de conectar</li>
                    <li>Certifique-se que o leitor ACR122U está conectado ao PC</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        <IdentifyCustomer
          identifier={identifier}
          onIdentify={handleIdentify}
          onClear={() => { setIdentifier(null); setActiveTag(null); }}
          tagBalance={activeTag?.balance}
          readerConnected={nfc.connected}
        />


        <div className="card-surface p-4 flex flex-col flex-1">
          <h3 className="font-display font-semibold text-sm mb-3">Carrinho</h3>

          <div className="flex-1 overflow-y-auto space-y-2 min-h-0 max-h-40 lg:max-h-none">
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-6">Selecione produtos</p>
            ) : cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product.emoji} {item.product.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">R$ {item.product.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-7 h-7 flex items-center justify-center bg-muted/50 rounded text-foreground"><Minus size={12} /></button>
                  <span className="font-mono text-sm w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center bg-muted/50 rounded text-foreground"><Plus size={12} /></button>
                  <button onClick={() => removeFromCart(item.product.id)}
                    className="w-7 h-7 flex items-center justify-center text-accent hover:bg-accent/10 rounded"><X size={12} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-mono text-3xl font-bold text-primary">R$ {total.toFixed(2)}</span>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handlePay}
              disabled={!identifier || cart.length === 0 || processing}
              className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-display font-bold text-base glow-primary disabled:opacity-30 disabled:shadow-none transition-all">
              {processing ? 'PROCESSANDO...' : identifier ? 'CONFIRMAR PAGAMENTO' : 'IDENTIFIQUE O CLIENTE'}
            </motion.button>
            {cart.length > 0 && (
              <button onClick={clearCart} className="w-full mt-2 py-2 text-xs text-muted-foreground hover:text-accent transition-colors">Limpar carrinho</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const lowStock = product.stock <= product.min_stock;
  const out = product.stock <= 0;
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={() => onAdd(product)}
      disabled={out}
      className={`card-surface-sm flex flex-col items-center justify-between gap-1 p-2.5 min-h-[110px] sm:min-h-[130px] transition-all group relative overflow-hidden
        ${out ? 'opacity-40' : 'hover:bg-muted/30 hover:border-primary/50 active:scale-[0.97]'}`}>
      {lowStock && !out && (
        <span className="absolute top-1 right-1 text-[9px] font-mono text-accent bg-accent/20 px-1.5 py-0.5 rounded-full leading-none">
          {product.stock}
        </span>
      )}
      {out && (
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-[10px] font-mono text-accent bg-accent/10 py-0.5 text-center uppercase tracking-wider">
          esgotado
        </span>
      )}
      <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform leading-none mt-1">{product.emoji}</span>
      <span className="text-[11px] sm:text-xs font-medium text-foreground text-center leading-tight line-clamp-2 px-0.5">{product.name}</span>
      <span className="font-mono text-primary font-bold text-xs sm:text-sm">R$ {product.price.toFixed(2)}</span>
    </motion.button>
  );
}
