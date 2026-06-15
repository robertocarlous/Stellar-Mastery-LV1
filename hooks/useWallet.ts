'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  checkFreighterInstalled,
  connectFreighter,
  disconnectFreighter,
  getConnectedAddress,
  getFreighterNetwork,
} from '@/lib/freighter';

export type WalletStatus = 'idle' | 'checking' | 'disconnected' | 'connected' | 'error';

export function useWallet() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>('checking');
  const [isInstalled, setIsInstalled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setStatus('checking');
    setError(null);

    const installed = await checkFreighterInstalled();
    setIsInstalled(installed);

    if (!installed) {
      setPublicKey(null);
      setStatus('disconnected');
      return;
    }

    const address = await getConnectedAddress();
    if (address) {
      const network = await getFreighterNetwork();
      if (network !== 'TESTNET') {
        setPublicKey(null);
        setStatus('error');
        setError('Freighter is not on Testnet. Switch to Testnet in Freighter settings.');
        return;
      }
      setPublicKey(address);
      setStatus('connected');
      return;
    }

    setPublicKey(null);
    setStatus('disconnected');
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const connect = useCallback(async (): Promise<void> => {
    setError(null);
    setStatus('checking');
    try {
      const address = await connectFreighter();
      setPublicKey(address);
      setIsInstalled(true);
      setStatus('connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet.';
      setError(message);
      setPublicKey(null);
      setStatus('error');
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectFreighter();
    setPublicKey(null);
    setError(null);
    setStatus('disconnected');
  }, []);

  return {
    publicKey,
    status,
    isInstalled,
    isConnected: status === 'connected' && !!publicKey,
    error,
    connect,
    disconnect,
    refreshSession,
  };
}
