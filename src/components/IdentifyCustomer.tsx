import { useState } from 'react';
import { ScanFace, Smartphone, Tag, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';
import FaceScan, { type FaceScanResult } from '@/components/FaceScan';

interface CustomerIdentifier {
  type: 'tag' | 'face';
  tagCode?: string;
  customer?: FaceScanResult;
}

interface IdentifyCustomerProps {
  identifier: CustomerIdentifier | null;
  onIdentify: (id: CustomerIdentifier) => void;
  onClear: () => void;
  tagBalance?: number;
  isDemoMode?: boolean;
  onSimulateTag?: () => void;
  scanning?: boolean;
  readerConnected?: boolean;
  accentColor?: 'primary' | 'secondary';
}

export default function IdentifyCustomer({
  identifier,
  onIdentify,
  onClear,
  tagBalance,
  isDemoMode,
  onSimulateTag,
  scanning,
  readerConnected,
  accentColor = 'primary',
}: IdentifyCustomerProps) {
  const [showFaceScan, setShowFaceScan] = useState(false);
  const [mode, setMode] = useState<'tag' | 'face' | null>(null);

  const colorClass = accentColor === 'secondary' ? 'text-secondary' : 'text-primary';
  const glowClass = accentColor === 'secondary' ? 'glow-secondary' : 'glow-primary';
  const bgClass = accentColor === 'secondary' ? 'bg-secondary/10' : 'bg-primary/10';
  const ringClass = accentColor === 'secondary' ? 'focus:ring-secondary/50' : 'focus:ring-primary/50';

  const handleFaceMatch = (customer: FaceScanResult) => {
    setShowFaceScan(false);
    onIdentify({ type: 'face', customer });
  };

  if (identifier) {
    return (
      <div className="card-surface p-5 text-center">
        {identifier.type === 'face' && identifier.customer ? (
          <div className="flex flex-col items-center gap-2">
            {identifier.customer.photo_url ? (
              <img src={identifier.customer.photo_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-secondary/30" />
            ) : (
              <ScanFace size={32} className="text-secondary" />
            )}
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Cliente Identificado</p>
            <p className={`font-display text-lg font-bold ${colorClass}`}>{identifier.customer.name}</p>
            <p className="font-mono text-sm text-muted-foreground">
              Saldo: R$ {Number(identifier.customer.balance).toFixed(2)}
            </p>
            <button onClick={onClear} className="text-xs text-muted-foreground underline mt-1">Trocar</button>
          </div>
        ) : (
          <div>
            <Tag size={24} className={`mx-auto mb-2 ${colorClass}`} />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Tag Detectada</p>
            <p className={`font-mono text-xl font-bold mt-1 ${colorClass}`}>{identifier.tagCode}</p>
            {tagBalance !== undefined && (
              <p className="font-mono text-sm text-muted-foreground mt-1">Saldo: R$ {tagBalance.toFixed(2)}</p>
            )}
            <button onClick={onClear} className="text-xs text-muted-foreground underline mt-2">Trocar</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="card-surface p-5 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
          Identificar Cliente
        </p>

        {!mode ? (
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFaceScan(true)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl ${bgClass} ${colorClass} transition-all hover:opacity-80`}
            >
              <ScanFace size={28} />
              <span className="text-xs font-medium">Face Scan</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode('tag')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 text-muted-foreground transition-all hover:bg-muted/50"
            >
              <Smartphone size={28} />
              <span className="text-xs font-medium">Tag NFC</span>
            </motion.button>
          </div>
        ) : (
          <div className="text-center">
            {readerConnected ? (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`flex items-center justify-center gap-2 ${colorClass}`}
              >
                <Wifi size={20} />
                <p className="text-sm font-medium">Aproxime a tag do leitor...</p>
              </motion.div>
            ) : (
              <div>
                <Smartphone className="mx-auto text-muted-foreground mb-2" size={28} />
                <p className="text-sm text-muted-foreground mb-3">
                  {scanning ? 'Procurando tag...' : 'Aproxime a tag do leitor'}
                </p>
                {isDemoMode && onSimulateTag && (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={onSimulateTag}
                    disabled={scanning}
                    className={`px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm glow-secondary disabled:opacity-50`}
                  >
                    {scanning ? 'ESCANEANDO...' : 'SIMULAR SCAN NFC'}
                  </motion.button>
                )}
              </div>
            )}
            <button
              onClick={() => setMode(null)}
              className="text-xs text-muted-foreground underline mt-3 block mx-auto"
            >
              ← Voltar
            </button>
          </div>
        )}
      </div>

      <FaceScan
        open={showFaceScan}
        onMatch={handleFaceMatch}
        onCancel={() => setShowFaceScan(false)}
      />
    </>
  );
}

export type { CustomerIdentifier };
