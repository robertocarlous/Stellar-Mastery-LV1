'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  connectWithWallet,
  disconnectKit,
  listSupportedWallets,
  signWithKit,
} from '@/lib/wallets-kit';
import { fetchXlmBalance } from '@/lib/stellar';
import type { ISupportedWallet } from '@creit.tech/stellar-wallets-kit/types';

export type WalletErrorCode =
  | 'WALLET_NOT_FOUND'
  | 'CONNECTION_REJECTED'
  | 'INSUFFICIENT_BALANCE'
  | 'WRONG_NETWORK'
  | 'UNKNOWN';

export type WalletStatus = 'idle' | 'checking' | 'disconnected' | 'connected' | 'error';

function mapConnectError(err: unknown): { message: string; code: WalletErrorCode } {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (
    lower.includes('not installed') ||
    lower.includes('not found') ||
    lower.includes('no wallet') ||
    lower.includes('unavailable')
  ) {
    return {
      code: 'WALLET_NOT_FOUND',
      message: 'Wallet not found. Install Freighter, xBull, Albedo, or another supported wallet.',
    };
  }

  if (
    lower.includes('denied') ||
    lower.includes('rejected') ||
    lower.includes('cancelled') ||
    lower.includes('canceled') ||
    lower.includes('declined')
  ) {
    return {
      code: 'CONNECTION_REJECTED',
      message: 'Connection rejected. You declined the wallet request.',
    };
  }

  if (lower.includes('testnet') || lower.includes('network')) {
    return {
      code: 'WRONG_NETWORK',
      message: 'Switch your wallet to Stellar Testnet and try again.',
    };
  }

  return { code: 'UNKNOWN', message: message || 'Failed to connect wallet.' };
}

export function useWalletKit() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>('checking');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<WalletErrorCode | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<ISupportedWallet[]>([]);

  const loadWallets = useCallback(async () => {
    try {
      const wallets = await listSupportedWallets();
      setAvailableWallets(wallets);
    } catch {
      setAvailableWallets([]);
    }
  }, []);

  useEffect(() => {
    loadWallets().finally(() => setStatus('disconnected'));
  }, [loadWallets]);

  const connect = useCallback(async (walletId: string): Promise<void> => {
    setError(null);
    setErrorCode(null);
    setStatus('checking');

    try {
      const address = await connectWithWallet(walletId);
      setPublicKey(address);
      setSelectedWalletId(walletId);
      setStatus('connected');
    } catch (err) {
      const mapped = mapConnectError(err);
      setError(mapped.message);
      setErrorCode(mapped.code);
      setPublicKey(null);
      setStatus('error');
      throw err;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectKit();
    setPublicKey(null);
    setSelectedWalletId(null);
    setError(null);
    setErrorCode(null);
    setStatus('disconnected');
  }, []);

  const checkSufficientBalance = useCallback(
    async (minimumXlm = 1): Promise<boolean> => {
      if (!publicKey) return false;
      const balance = Number(await fetchXlmBalance(publicKey));
      if (balance < minimumXlm) {
        setError(
          `Insufficient balance. You need at least ${minimumXlm} XLM for contract fees. Fund with Friendbot and refresh.`
        );
        setErrorCode('INSUFFICIENT_BALANCE');
        return false;
      }
      setError(null);
      setErrorCode(null);
      return true;
    },
    [publicKey]
  );

  const signTransaction = useCallback(
    async (xdr: string): Promise<string> => {
      if (!publicKey) throw new Error('Wallet not connected.');
      try {
        return await signWithKit(xdr, publicKey);
      } catch (err) {
        const mapped = mapConnectError(err);
        throw new Error(mapped.message);
      }
    },
    [publicKey]
  );

  return {
    publicKey,
    status,
    error,
    errorCode,
    selectedWalletId,
    availableWallets,
    isConnected: status === 'connected' && !!publicKey,
    connect,
    disconnect,
    checkSufficientBalance,
    signTransaction,
    loadWallets,
  };
}
