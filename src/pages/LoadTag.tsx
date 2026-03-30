import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Banknote, QrCode, Smartphone, CheckCircle2, Usb, Unplug, Wifi } from 'lucide-react';
import { connectACR122U, disconnectACR122U, pollForTag, isWebUSBSupported, type ACR122UReader } from '@/lib/acr122u';
import { toast } from 'sonner';

const paymentMethods = [
  { id: 'cash', label: 'Dinheiro', icon: Banknote },
  { id: 'pix', label: 'Pix', icon: QrCode },
  { id: 'card', label: 'Cartão', icon: CreditCard },
];
const quickAmounts = [20, 50, 100, 200];

export default function LoadTag() {
  const { tags, loadTag, fetchTags, isDemoMode } = useStore();
  const { user } = useAuth();
  const [tagCode, setTagCode] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showSuccess, setShowSuccess] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);

  // ACR122U state
  const [readerConnected, setReaderConnected] = useState(false);
  const [readerPolling, setReaderPolling] = useState(false);
  const readerRef = useRef<ACR122UReader | null>(null);
  const stopPollingRef = useRef<(() => void) | null>(null);
  const webUSBSupported = isWebUSBSupported();

  useEffect(() => { if (user) fetchTags(); }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPollingRef.current?.();
      if (readerRef.current) disconnectACR122U(readerRef.current);
    };
  }, []);

  const handleConnectReader = useCallback(async () => {
    try {
      const reader = await connectACR122U();
      readerRef.current = reader;
      setReaderConnected(true);
      toast.success('ACR122U conectado com sucesso!');

      // Start polling
      setReaderPolling(true);
      const stop = pollForTag(reader, (uid) => {
        setTagCode(uid);
        toast.success(`Tag detectada: ${uid}`);
        // Play beep
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
    } catch (err: any) {
      console.error('Erro ao conectar ACR122U:', err);
      toast.error('Falha ao conectar o leitor. Verifique se o ACR122U está conectado e tente novamente.');
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
      setTagCode(code);
      setScanning(false);
    }, 1200);
  };

  const handleLoad = async () => {
    const val = parseFloat(amount);
    if (!tagCode || isNaN(val) || val <= 0 || !user) return;
    setLoading(true);
    const ok = await loadTag(tagCode, val, paymentMethod, user.id);
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
      setTimeout(() => { setShowSuccess(false); setAmount(''); setTagCode(''); }, 2000);
    }
  };

  const existingTag = tags.find((t) => t.tag_code === tagCode);

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="font-display text-2xl font-bold">Carregar Tag</h1>
        <p className="text-muted-foreground text-sm mt-1">Adicionar créditos a uma tag NFC</p>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="card-surface glow-primary p-10 text-center">
              <CheckCircle2 className="text-primary mx-auto mb-3" size={64} />
              <p className="font-display text-xl font-bold text-primary">CARGA CONFIRMADA</p>
              <p className="font-mono text-2xl mt-2">R$ {parseFloat(amount).toFixed(2)}</p>
              <p className="text-muted-foreground text-sm mt-1">{tagCode}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACR122U Hardware Connection */}
      {webUSBSupported && (
        <div className="card-surface p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {readerConnected ? (
                <Usb className="text-primary" size={20} />
              ) : (
                <UsbOff className="text-muted-foreground" size={20} />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">ACR122U</p>
                <p className="text-xs text-muted-foreground">
                  {readerConnected
                    ? readerPolling ? '🟢 Lendo tags...' : 'Conectado'
                    : 'Desconectado'}
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
        </div>
      )}

      {/* Tag scan area */}
      <div className="card-surface p-5 text-center">
        <Smartphone className="mx-auto text-muted-foreground mb-3" size={32} />
        {tagCode ? (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Tag Detectada</p>
            <p className="font-mono text-xl text-primary font-bold mt-1">{tagCode}</p>
            {existingTag && <p className="font-mono text-sm text-muted-foreground mt-1">Saldo: R$ {existingTag.balance.toFixed(2)}</p>}
            <button onClick={() => setTagCode('')} className="text-xs text-muted-foreground underline mt-2">Trocar tag</button>
          </div>
        ) : (
          <div>
            {readerConnected ? (
              <div>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="flex items-center justify-center gap-2 text-primary"
                >
                  <Wifi size={20} />
                  <p className="text-sm font-medium">Aproxime a tag do leitor ACR122U...</p>
                </motion.div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-3">{scanning ? 'Procurando tag...' : 'Aproxime a tag do leitor'}</p>
                {isDemoMode && (
                  <motion.button whileTap={{ scale: 0.96 }} onClick={handleSimulateScan} disabled={scanning}
                    className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm glow-secondary disabled:opacity-50">
                    {scanning ? <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>ESCANEANDO...</motion.span> : 'SIMULAR SCAN NFC'}
                  </motion.button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

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

      <div className="card-surface p-5 space-y-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Forma de Pagamento</label>
        <div className="grid grid-cols-3 gap-2">
          {paymentMethods.map(({ id, label, icon: Icon }) => (
            <motion.button key={id} whileTap={{ scale: 0.96 }} onClick={() => setPaymentMethod(id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all text-sm font-medium
                ${paymentMethod === id ? 'bg-primary/10 text-primary glow-primary' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}>
              <Icon size={24} />{label}
            </motion.button>
          ))}
        </div>
      </div>

      <motion.button whileTap={{ scale: 0.97 }} onClick={handleLoad}
        disabled={!tagCode || !amount || parseFloat(amount) <= 0 || loading}
        className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-display font-bold text-lg glow-primary disabled:opacity-30 disabled:shadow-none transition-all">
        {loading ? 'PROCESSANDO...' : 'CONFIRMAR CARGA'}
      </motion.button>
    </div>
  );
}
