import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useOperator } from '@/hooks/useOperator';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Banknote, QrCode, CheckCircle2, Wifi, WifiOff, AlertTriangle, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useNfcBridge } from '@/hooks/useNfcBridge';
import IdentifyCustomer, { type CustomerIdentifier } from '@/components/IdentifyCustomer';
import BlockTagPanel from '@/components/BlockTagPanel';
import ReceiptDialog from '@/components/ReceiptDialog';
import type { ReceiptData } from '@/lib/receipt';
import { findTagOwner } from '@/lib/customerLookup';

const paymentMethods = [
  { id: 'cash', label: 'Dinheiro', icon: Banknote },
  { id: 'pix', label: 'Pix', icon: QrCode },
  { id: 'card', label: 'Cartão', icon: CreditCard },
];
const quickAmounts = [20, 50, 100, 200];

export default function LoadTag() {
  const { tags, loadTag, loadCustomer, fetchTags } = useStore();
  const { user, profile } = useAuth();
  const { operator } = useOperator();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showSuccess, setShowSuccess] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState<CustomerIdentifier | null>(null);
  const [tab, setTab] = useState<'load' | 'balance' | 'block'>('load');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const handleTagRead = useCallback((uid: string) => {
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
  }, []);

  const nfc = useNfcBridge(handleTagRead, undefined, false);

  useEffect(() => { if (user) fetchTags(); }, [user, fetchTags]);

  const handleLoad = async () => {
    const val = parseFloat(amount);
    if (!identifier || Number.isNaN(val) || val <= 0 || !user) return;
    setLoading(true);

    let ok = false;
    if (identifier.type === 'tag' && identifier.tagCode) {
      ok = await loadTag(identifier.tagCode, val, paymentMethod, user.id, operator?.name, operator?.number);
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

  const tabBase = 'flex-1 py-2 rounded-md text-sm font-medium transition-colors';
  const tabActive = `${tabBase} bg-card text-foreground shadow-sm`;
  const tabInactive = `${tabBase} text-muted-foreground hover:text-foreground`;

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="font-display text-2xl font-bold">Carregar Tag</h1>
        <p className="text-muted-foreground text-sm mt-1">Carregue saldo ou bloqueie tags perdidas/roubadas</p>
      </div>

      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
        <button
          onClick={() => setTab('load')}
          className={tab === 'load' ? tabActive : tabInactive}
        >
          Carregar Saldo
        </button>
        <button
          onClick={() => setTab('balance')}
          className={tab === 'balance' ? tabActive : tabInactive}
        >
          Consultar Saldo
        </button>
        <button
          onClick={() => setTab('block')}
          className={tab === 'block' ? tabActive : tabInactive}
        >
          Bloquear Tag
        </button>
      </div>

      {tab === 'block' && <BlockTagPanel />}

      {tab === 'balance' && (
        <>
          {/* NFC Bridge WebSocket */}
          <div className="card-surface p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {nfc.connected ? (
                  <Wifi className="text-primary shrink-0" size={20} />
                ) : (
                  <WifiOff className="text-muted-foreground shrink-0" size={20} />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">NFC Bridge</p>
                  <p className="text-xs text-muted-foreground">
                    {nfc.connected ? '🟢 Conectado — aproxime a tag' : 'Desconectado'}
                  </p>
                </div>
              </div>
              {nfc.connected ? (
                <motion.button whileTap={{ scale: 0.95 }} onClick={nfc.disconnect}
                  className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors">
                  Desconectar
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.95 }} onClick={nfc.connect}
                  className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors glow-primary">
                  Conectar
                </motion.button>
              )}
            </div>
            {nfc.error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={18} />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Erro de conexão</p>
                    <p className="text-sm text-muted-foreground">{nfc.error}</p>
                  </div>
                </div>
                <ol className="space-y-1 pl-5 text-xs text-muted-foreground list-decimal">
                  <li>Verifique se o servidor NFC Bridge está rodando na porta 8888</li>
                  <li>Execute o script nfc-bridge antes de conectar</li>
                  <li>Certifique-se que o leitor ACR122U está conectado ao PC</li>
                </ol>
              </div>
            )}
          </div>

          <IdentifyCustomer
            identifier={identifier}
            onIdentify={setIdentifier}
            onClear={() => setIdentifier(null)}
            scanning={scanning}
            readerConnected={nfc.connected}
          />

          <div className="card-surface p-6 text-center space-y-3">
            <Wallet className="mx-auto text-primary" size={32} />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saldo da Tag</p>
            {identifier?.type === 'tag' ? (
              <>
                <p className="font-mono text-sm text-muted-foreground">{identifier.tagCode}</p>
                <p className="font-mono text-4xl font-bold text-foreground">
                  R$ {(existingTag?.balance ?? 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {existingTag ? 'Tag encontrada no sistema' : 'Tag não cadastrada — saldo zerado'}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aproxime a tag ou digite o código para consultar</p>
            )}
          </div>
        </>
      )}

      {tab === 'load' && (
        <>
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

          {/* NFC Bridge WebSocket */}
          <div className="card-surface p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {nfc.connected ? (
                  <Wifi className="text-primary shrink-0" size={20} />
                ) : (
                  <WifiOff className="text-muted-foreground shrink-0" size={20} />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">NFC Bridge</p>
                  <p className="text-xs text-muted-foreground">
                    {nfc.connected ? '🟢 Conectado — aguardando tags' : 'Desconectado'}
                  </p>
                </div>
              </div>
              {nfc.connected ? (
                <motion.button whileTap={{ scale: 0.95 }} onClick={nfc.disconnect}
                  className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors">
                  Desconectar
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.95 }} onClick={nfc.connect}
                  className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors glow-primary">
                  Conectar
                </motion.button>
              )}
            </div>
            {nfc.error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={18} />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Erro de conexão</p>
                    <p className="text-sm text-muted-foreground">{nfc.error}</p>
                  </div>
                </div>
                <ol className="space-y-1 pl-5 text-xs text-muted-foreground list-decimal">
                  <li>Verifique se o servidor NFC Bridge está rodando na porta 8888</li>
                  <li>Execute o script nfc-bridge antes de conectar</li>
                  <li>Certifique-se que o leitor ACR122U está conectado ao PC</li>
                </ol>
              </div>
            )}
          </div>

          {/* Identify Customer */}
          <IdentifyCustomer
            identifier={identifier}
            onIdentify={setIdentifier}
            onClear={() => setIdentifier(null)}
            tagBalance={existingTag?.balance}
            scanning={scanning}
            readerConnected={nfc.connected}
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
        </>
      )}
    </div>
  );
}
