import { useEffect, useRef, useState, useCallback } from 'react';

export interface NfcBridgeState {
  connected: boolean;
  lastUid: string | null;
  error: string | null;
}

/**
 * Hook that connects to a local WebSocket NFC bridge (e.g. Mifare Classic Tool relay)
 * running on ws://localhost:8888.
 */
export function useNfcBridge(
  onTagRead?: (uid: string) => void,
  autoConnect = false,
) {
  const [state, setState] = useState<NfcBridgeState>({
    connected: false,
    lastUid: null,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTagReadRef = useRef(onTagRead);
  onTagReadRef.current = onTagRead;

  const cleanup = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();
    setState((s) => ({ ...s, error: null }));

    try {
      const ws = new WebSocket('ws://localhost:8888');

      ws.onopen = () => {
        setState((s) => ({ ...s, connected: true, error: null }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const uid: string = data.uid || data.tagCode || data.id || '';
          if (uid) {
            setState((s) => ({ ...s, lastUid: uid }));
            onTagReadRef.current?.(uid);
          }
        } catch {
          // raw text UID
          const uid = event.data?.toString().trim();
          if (uid) {
            setState((s) => ({ ...s, lastUid: uid }));
            onTagReadRef.current?.(uid);
          }
        }
      };

      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }));
        // auto-reconnect after 3s
        reconnectTimer.current = setTimeout(() => {
          if (wsRef.current === ws) connect();
        }, 3000);
      };

      ws.onerror = () => {
        setState((s) => ({
          ...s,
          connected: false,
          error: 'Não foi possível conectar ao bridge NFC em localhost:8888',
        }));
      };

      wsRef.current = ws;
    } catch (err) {
      setState((s) => ({
        ...s,
        connected: false,
        error: 'WebSocket não suportado ou erro de conexão',
      }));
    }
  }, [cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
    setState({ connected: false, lastUid: null, error: null });
  }, [cleanup]);

  useEffect(() => {
    if (autoConnect) connect();
    return cleanup;
  }, [autoConnect, connect, cleanup]);

  return { ...state, connect, disconnect };
}
