import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Banknote, QrCode, CheckCircle2, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useNfcBridge } from '@/hooks/useNfcBridge';
import IdentifyCustomer, { type CustomerIdentifier } from '@/components/IdentifyCustomer';

const paymentMethods = [
  { id: 'cash', label: 'Dinheiro', icon: Banknote },
  { id: 'pix', label: 'Pix', icon: QrCode },
  { id: 'card', label: 'Cartão', icon: CreditCard },
];
const quickAmounts = [20, 50, 100, 200];

export default function LoadTag() {
  const { tags, loadTag, loadCustomer, fetchTags, isDemoMode } = useStore();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showSuccess, setShowSuccess] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [readerConnected, setReaderConnected] = useState(false);
  const [readerPolling, setReaderPolling] = useState(false);
  const [readerError, setReaderError] = useState<ACR122UErrorInfo | null>(null);
  const [identifier, setIdentifier] = useState<CustomerIdentifier | null>(null);

  const readerRef = useRef<ACR122UReader | null>(null);
  const stopPollingRef = useRef<(() => void) | null>(null);
  const webUSBSupported = isWebUSBSupported();

  useEffect(() => { if (user) fetchTags(); }, [user, fetchTags]);
  useEffect(() => {
    return () => {
      stopPollingRef.current?.();
      if (readerRef.current) void disconnectACR122U(readerRef.current);
    };
  }, []);

  const handleConnectReader = useCallback(async () => {
    setReaderError(null);
    try {
      const reader = await connectACR122U();
      readerRef.current = reader;
      setReaderConnected(true);
      setReaderPolling(true);
      toast.success('ACR122U conectado com sucesso!');

      const stop = pollForTag(reader, (uid) => {
        setIdentifier({ type: 'tag', tagCode: uid });
        toast.success(`Tag detectada: ${uid}`);
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = 1200; gain.gain.value = 0.08;
          osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch {}
      }, 400);
      stopPollingRef.current = stop;
    } catch (error) {
      const info = getACR122UErrorInfo(error);
      setReaderConnected(false);
      setReaderPolling(false);
      setReaderError(info);
      toast.error(info.title, { description: info.message });
    }
  }, []);

  const handleDisconnectReader = useCallback(async () => {
    stopPollingRef.current?.();
    stopPollingRef.current = null;
    if (readerRef.current) {
      await disconnectACR122U(readerRef.current);
      readerRef.current = null;
    }
    setReaderConnected(false);
    setReaderPolling(false);
    toast.info('Leitor desconectado');
  }, []);

  const handleSimulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      const code = tags.length > 0
        ? tags[Math.floor(Math.random() * tags.length)].tag_code
        : `TAG-${String(Date.now()).slice(-4)}`;
      setIdentifier({ type: 'tag', tagCode: code });
      setScanning(false);
    }, 1200);
  };

  const handleLoad = async () => {
    const val = parseFloat(amount);
    if (!identifier || Number.isNaN(val) || val <= 0 || !user) return;
    setLoading(true);

    let ok = false;
    if (identifier.type === 'face' && identifier.customer) {
      ok = await loadCustomer(identifier.customer.id, val, paymentMethod, user.id);
    } else if (identifier.type === 'tag' && identifier.tagCode) {
      ok = await loadTag(identifier.tagCode, val, paymentMethod, user.id);
    }

    setLoading(false);
    if (ok) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; gain.gain.value = 0.1;
        osc.start(); osc.stop(ctx.currentTime + 0.15);
      } catch {}
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setAmount('');
        setIdentifier(null);
      }, 2000);
    }
  };

  const existingTag = identifier?.type === 'tag'
    ? tags.find((t) => t.tag_code === identifier.tagCode)
    : null;

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="font-display text-2xl font-bold">Carregar Saldo</h1>
        <p className="text-muted-foreground text-sm mt-1">Adicionar créditos via Tag ou Face Scan</p>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="card-surface glow-primary p-10 text-center">
              <CheckCircle2 className="text-primary mx-auto mb-3" size={64} />
              <p className="font-display text-xl font-bold text-primary">CARGA CONFIRMADA</p>
              <p className="font-mono text-2xl mt-2">R$ {parseFloat(amount).toFixed(2)}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACR122U Reader */}
      {webUSBSupported && (
        <div className="card-surface p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {readerConnected ? (
                <Usb className="text-primary shrink-0" size={20} />
              ) : (
                <Unplug className="text-muted-foreground shrink-0" size={20} />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">ACR122U</p>
                <p className="text-xs text-muted-foreground">
                  {readerConnected ? (readerPolling ? '🟢 Lendo tags' : 'Conectado') : 'Desconectado'}
                </p>
              </div>
            </div>
            {readerConnected ? (
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleDisconnectReader}
                className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors">
                Desconectar
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleConnectReader}
                className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors glow-primary">
                Conectar Leitor
              </motion.button>
            )}
          </div>
          {readerError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{readerError.title}</p>
                  <p className="text-sm text-muted-foreground">{readerError.message}</p>
                </div>
              </div>
              <ol className="space-y-1 pl-5 text-xs text-muted-foreground list-decimal">
                {readerError.steps.map((step) => (<li key={step}>{step}</li>))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Identify Customer */}
      <IdentifyCustomer
        identifier={identifier}
        onIdentify={setIdentifier}
        onClear={() => setIdentifier(null)}
        tagBalance={existingTag?.balance}
        isDemoMode={isDemoMode}
        onSimulateTag={handleSimulateScan}
        scanning={scanning}
        readerConnected={readerConnected}
      />

      {/* Amount */}
      <div className="card-surface p-5 space-y-4">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor (R$)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
          className="w-full bg-muted/50 text-3xl font-mono font-bold text-center py-4 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground" />
        <div className="grid grid-cols-4 gap-2">
          {quickAmounts.map((q) => (
            <motion.button key={q} whileTap={{ scale: 0.95 }} onClick={() => setAmount(String(q))}
              className="py-2.5 bg-muted/50 hover:bg-muted rounded-lg font-mono text-sm font-medium text-foreground transition-colors">
              R$ {q}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div className="card-surface p-5 space-y-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Forma de Pagamento</label>
        <div className="grid grid-cols-3 gap-2">
          {paymentMethods.map(({ id, label, icon: Icon }) => (
            <motion.button key={id} whileTap={{ scale: 0.96 }} onClick={() => setPaymentMethod(id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all text-sm font-medium ${paymentMethod === id ? 'bg-primary/10 text-primary glow-primary' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}>
              <Icon size={24} />
              {label}
            </motion.button>
          ))}
        </div>
      </div>

      <motion.button whileTap={{ scale: 0.97 }} onClick={handleLoad}
        disabled={!identifier || !amount || parseFloat(amount) <= 0 || loading}
        className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-display font-bold text-lg glow-primary disabled:opacity-30 disabled:shadow-none transition-all">
        {loading ? 'PROCESSANDO...' : 'CONFIRMAR CARGA'}
      </motion.button>
    </div>
  );
}
