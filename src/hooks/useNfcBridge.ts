import { useEffect, useRef, useState, useCallback } from 'react';

export interface NfcBridgeState {
  connected: boolean;
  lastUid: string | null;
  lastBalance: number | null;
  error: string | null;
}

export interface NfcBridgeActions {
  connect: () => void;
  disconnect: () => void;
  readBalance: () => void;
  writeBalance: (value: number) => void;
  readBlock: (block: number) => void;
  writeBlock: (block: number, hexData: string) => void;
}

/**
 * Hook that connects to local NFC Bridge (Mifare Classic 1K)
 * running on ws://localhost:8888.
 */
export function useNfcBridge(
  onTagRead?: (uid: string, balance?: number | null) => void,
  onResponse?: (data: any) => void,
  autoConnect = false,
): NfcBridgeState & NfcBridgeActions {
  const [state, setState] = useState<NfcBridgeState>({
    connected: false,
    lastUid: null,
    lastBalance: null,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTagReadRef = useRef(onTagRead);
  const onResponseRef = useRef(onResponse);
  onTagReadRef.current = onTagRead;
  onResponseRef.current = onResponse;

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

  const sendCommand = useCallback((cmd: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
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

          // Tag detected (broadcast from server)
          if (data.uid && !data.action) {
            setState((s) => ({
              ...s,
              lastUid: data.uid,
              lastBalance: data.balance ?? s.lastBalance,
            }));
            onTagReadRef.current?.(data.uid, data.balance);
          }

          // Command response
          if (data.action) {
            if (data.action === 'read_balance' || data.action === 'write_balance') {
              setState((s) => ({ ...s, lastBalance: data.balance ?? s.lastBalance }));
            }
            onResponseRef.current?.(data);
          }
        } catch {
          const uid = event.data?.toString().trim();
          if (uid) {
            setState((s) => ({ ...s, lastUid: uid }));
            onTagReadRef.current?.(uid);
          }
        }
      };

      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }));
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
    } catch {
      setState((s) => ({
        ...s,
        connected: false,
        error: 'WebSocket não suportado ou erro de conexão',
      }));
    }
  }, [cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
    setState({ connected: false, lastUid: null, lastBalance: null, error: null });
  }, [cleanup]);

  const readBalance = useCallback(() => sendCommand({ action: 'read_balance' }), [sendCommand]);
  const writeBalance = useCallback((value: number) => sendCommand({ action: 'write_balance', value }), [sendCommand]);
  const readBlock = useCallback((block: number) => sendCommand({ action: 'read', block }), [sendCommand]);
  const writeBlock = useCallback((block: number, hexData: string) => sendCommand({ action: 'write', block, data: hexData }), [sendCommand]);

  useEffect(() => {
    if (autoConnect) connect();
    return cleanup;
  }, [autoConnect, connect, cleanup]);

  return { ...state, connect, disconnect, readBalance, writeBalance, readBlock, writeBlock };
}
