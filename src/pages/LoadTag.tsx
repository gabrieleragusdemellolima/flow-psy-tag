import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Banknote, QrCode, Smartphone, CheckCircle2 } from 'lucide-react';

const paymentMethods = [
  { id: 'cash', label: 'Dinheiro', icon: Banknote },
  { id: 'pix', label: 'Pix', icon: QrCode },
  { id: 'card', label: 'Cartão', icon: CreditCard },
];

const quickAmounts = [20, 50, 100, 200];

export default function LoadTag() {
  const { tags, loadTag, addTransaction, isDemoMode } = useStore();
  const [selectedTag, setSelectedTag] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showSuccess, setShowSuccess] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleSimulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      const randomTag = tags[Math.floor(Math.random() * tags.length)] || { id: `TAG-${String(Date.now()).slice(-3)}` };
      setSelectedTag(randomTag.id);
      setScanning(false);
    }, 1200);
  };

  const handleLoad = () => {
    const val = parseFloat(amount);
    if (!selectedTag || isNaN(val) || val <= 0) return;

    loadTag(selectedTag, val);
    addTransaction({ tagId: selectedTag, amount: val, type: 'load' });
    setShowSuccess(true);

    // Play beep
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.1;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}

    setTimeout(() => {
      setShowSuccess(false);
      setAmount('');
      setSelectedTag('');
    }, 2000);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="font-display text-2xl font-bold">Carregar Tag</h1>
        <p className="text-muted-foreground text-sm mt-1">Adicionar créditos a uma tag NFC</p>
      </div>

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="card-surface glow-primary p-10 text-center"
            >
              <CheckCircle2 className="text-primary mx-auto mb-3" size={64} />
              <p className="font-display text-xl font-bold text-primary">CARGA CONFIRMADA</p>
              <p className="font-mono text-2xl mt-2">R$ {parseFloat(amount).toFixed(2)}</p>
              <p className="text-muted-foreground text-sm mt-1">{selectedTag}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan section */}
      <div className="card-surface p-5 text-center">
        <Smartphone className="mx-auto text-muted-foreground mb-3" size={32} />
        {selectedTag ? (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Tag Detectada</p>
            <p className="font-mono text-xl text-primary font-bold mt-1">{selectedTag}</p>
            <p className="font-mono text-sm text-muted-foreground mt-1">
              Saldo: R$ {(tags.find((t) => t.id === selectedTag)?.balance || 0).toFixed(2)}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              {scanning ? 'Procurando tag...' : 'Aproxime a tag do leitor'}
            </p>
            {isDemoMode && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleSimulateScan}
                disabled={scanning}
                className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm glow-secondary disabled:opacity-50"
              >
                {scanning ? (
                  <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                    ESCANEANDO...
                  </motion.span>
                ) : (
                  'SIMULAR SCAN NFC'
                )}
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Amount */}
      <div className="card-surface p-5 space-y-4">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor (R$)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-muted/50 text-3xl font-mono font-bold text-center py-4 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
        />
        <div className="grid grid-cols-4 gap-2">
          {quickAmounts.map((q) => (
            <motion.button
              key={q}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAmount(String(q))}
              className="py-2.5 bg-muted/50 hover:bg-muted rounded-lg font-mono text-sm font-medium text-foreground transition-colors"
            >
              R$ {q}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Payment method */}
      <div className="card-surface p-5 space-y-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Forma de Pagamento</label>
        <div className="grid grid-cols-3 gap-2">
          {paymentMethods.map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.96 }}
              onClick={() => setPaymentMethod(id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all text-sm font-medium
                ${paymentMethod === id
                  ? 'bg-primary/10 text-primary glow-primary'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}
            >
              <Icon size={24} />
              {label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Confirm */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleLoad}
        disabled={!selectedTag || !amount || parseFloat(amount) <= 0}
        className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-display font-bold text-lg glow-primary disabled:opacity-30 disabled:shadow-none transition-all"
      >
        CONFIRMAR CARGA
      </motion.button>
    </div>
  );
}
