import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, CheckCircle2, Shield } from 'lucide-react';
import IdentifyCustomer, { type CustomerIdentifier } from '@/components/IdentifyCustomer';

const quickAmounts = [50, 100, 150, 200];
const roleLabels = [
  { id: 'dj', label: 'DJ' },
  { id: 'staff', label: 'Staff' },
  { id: 'artista', label: 'Artista' },
  { id: 'outro', label: 'Outro' },
];

export default function Courtesy() {
  const { tags, loadTagCourtesy, loadCustomerCourtesy, fetchTags, isDemoMode } = useStore();
  const { user, isAdmin } = useAuth();
  const [amount, setAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientRole, setRecipientRole] = useState('dj');
  const [showSuccess, setShowSuccess] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState<CustomerIdentifier | null>(null);

  useEffect(() => { if (user) fetchTags(); }, [user]);

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
    if (!identifier || isNaN(val) || val <= 0 || !user || !recipientName) return;
    setLoading(true);

    let ok = false;
    if (identifier.type === 'face' && identifier.customer) {
      ok = await loadCustomerCourtesy(identifier.customer.id, val, user.id, recipientName, recipientRole);
    } else if (identifier.type === 'tag' && identifier.tagCode) {
      ok = await loadTagCourtesy(identifier.tagCode, val, user.id, recipientName, recipientRole);
    }

    setLoading(false);
    if (ok) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setAmount('');
        setIdentifier(null);
        setRecipientName('');
      }, 2000);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto space-y-6 pb-20 md:pb-0">
        <div className="card-surface p-8 text-center">
          <Shield size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Apenas administradores podem gerenciar consumações.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Music size={24} className="text-secondary" /> Consumação
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Fichas para DJ, staff e artistas</p>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-secondary/10 backdrop-blur-sm">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="card-surface glow-secondary p-10 text-center">
              <CheckCircle2 className="text-secondary mx-auto mb-3" size={64} />
              <p className="font-display text-xl font-bold text-secondary">CONSUMAÇÃO ADICIONADA</p>
              <p className="font-mono text-2xl mt-2">R$ {parseFloat(amount).toFixed(2)}</p>
              <p className="text-muted-foreground text-sm mt-1">{recipientName}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recipient info */}
      <div className="card-surface p-5 space-y-4">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quem recebe</label>
        <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Nome (ex: DJ Fulano)"
          className="w-full bg-muted/50 px-4 py-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-secondary/50 text-foreground placeholder:text-muted-foreground" />
        <div className="grid grid-cols-4 gap-2">
          {roleLabels.map(({ id, label }) => (
            <motion.button key={id} whileTap={{ scale: 0.95 }} onClick={() => setRecipientRole(id)}
              className={`py-2 rounded-lg text-xs font-medium transition-all
                ${recipientRole === id ? 'bg-secondary/10 text-secondary glow-secondary' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}>
              {label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Identify Customer */}
      <IdentifyCustomer
        identifier={identifier}
        onIdentify={setIdentifier}
        onClear={() => setIdentifier(null)}
        tagBalance={identifier?.type === 'tag' ? tags.find(t => t.tag_code === identifier.tagCode)?.balance : undefined}
        isDemoMode={isDemoMode}
        onSimulateTag={handleSimulateScan}
        scanning={scanning}
        accentColor="secondary"
      />

      {/* Amount */}
      <div className="card-surface p-5 space-y-4">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor da Ficha (R$)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
          className="w-full bg-muted/50 text-3xl font-mono font-bold text-center py-4 rounded-lg border-none outline-none focus:ring-2 focus:ring-secondary/50 text-foreground placeholder:text-muted-foreground" />
        <div className="grid grid-cols-4 gap-2">
          {quickAmounts.map((q) => (
            <motion.button key={q} whileTap={{ scale: 0.95 }} onClick={() => setAmount(String(q))}
              className="py-2.5 bg-muted/50 hover:bg-muted rounded-lg font-mono text-sm font-medium text-foreground transition-colors">
              R$ {q}
            </motion.button>
          ))}
        </div>
      </div>

      <motion.button whileTap={{ scale: 0.97 }} onClick={handleLoad}
        disabled={!identifier || !amount || parseFloat(amount) <= 0 || !recipientName || loading}
        className="w-full py-4 bg-secondary text-secondary-foreground rounded-lg font-display font-bold text-lg glow-secondary disabled:opacity-30 disabled:shadow-none transition-all">
        {loading ? 'PROCESSANDO...' : 'CONFIRMAR CONSUMAÇÃO'}
      </motion.button>
    </div>
  );
}
