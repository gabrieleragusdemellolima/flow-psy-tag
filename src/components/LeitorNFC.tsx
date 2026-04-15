import { useNfcBridge } from '@/hooks/useNfcBridge';
import { Wifi, WifiOff } from 'lucide-react';

interface LeitorNFCProps {
  onTagRead?: (uid: string) => void;
  autoConnect?: boolean;
}

export default function LeitorNFC({ onTagRead, autoConnect = true }: LeitorNFCProps) {
  const { connected, lastUid, error, connect, disconnect } = useNfcBridge(onTagRead, autoConnect);

  return (
    <div className="card-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {connected ? (
            <Wifi className="text-primary" size={20} />
          ) : (
            <WifiOff className="text-muted-foreground" size={20} />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">NFC Bridge</p>
            <p className="text-xs text-muted-foreground">
              {connected ? '🟢 Conectado' : '🔴 Desconectado'}
            </p>
          </div>
        </div>
        <button
          onClick={connected ? disconnect : connect}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            connected
              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
              : 'bg-primary/10 text-primary hover:bg-primary/20 glow-primary'
          }`}
        >
          {connected ? 'Desconectar' : 'Conectar'}
        </button>
      </div>

      <p className="text-sm text-muted-foreground font-mono">
        UID da Tag: {lastUid || 'Nenhuma tag detectada'}
      </p>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
