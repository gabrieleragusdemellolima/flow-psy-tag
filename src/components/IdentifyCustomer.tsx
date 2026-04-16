import { useState } from 'react';
import { Smartphone, Tag, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';

export interface CustomerIdentifier {
  type: 'tag';
  tagCode?: string;
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
  const [manualCode, setManualCode] = useState('');
  const colorClass = accentColor === 'secondary' ? 'text-secondary' : 'text-primary';

  if (identifier?.type === 'tag') {
    return (
      <div className="card-surface p-5 text-center">
        <Tag size={24} className={`mx-auto mb-2 ${colorClass}`} />
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Tag Detectada</p>
        <p className={`font-mono text-xl font-bold mt-1 ${colorClass}`}>{identifier.tagCode}</p>
        {tagBalance !== undefined && (
          <p className="font-mono text-sm text-muted-foreground mt-1">Saldo: R$ {tagBalance.toFixed(2)}</p>
        )}
        <button onClick={onClear} className="text-xs text-muted-foreground underline mt-2">Trocar</button>
      </div>
    );
  }

  const handleManual = () => {
    const code = manualCode.trim().toUpperCase();
    if (code) {
      onIdentify({ type: 'tag', tagCode: code });
      setManualCode('');
    }
  };

  return (
    <div className="card-surface p-5 space-y-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
        Identificar Tag NFC
      </p>

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
              {scanning ? 'Procurando tag...' : 'Aproxime a tag do leitor ou digite o código'}
            </p>
            {isDemoMode && onSimulateTag && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onSimulateTag}
                disabled={scanning}
                className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm glow-secondary disabled:opacity-50"
              >
                {scanning ? 'ESCANEANDO...' : 'SIMULAR SCAN NFC'}
              </motion.button>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border/50 pt-4 space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Ou digite manualmente
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleManual()}
            placeholder="Código da tag"
            className="flex-1 bg-muted/50 px-3 py-2 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleManual}
            disabled={!manualCode.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-30"
          >
            OK
          </motion.button>
        </div>
      </div>
    </div>
  );
}
