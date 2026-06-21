'use client';

import { formatAddress } from '@/lib/stellar';
import type { WalletErrorCode, WalletStatus } from '@/hooks/useWalletKit';
import type { ISupportedWallet } from '@creit.tech/stellar-wallets-kit/types';

type WalletConnectionProps = {
  publicKey: string | null;
  status: WalletStatus;
  error: string | null;
  errorCode: WalletErrorCode | null;
  availableWallets: ISupportedWallet[];
  selectedWalletId: string | null;
  onConnect: (walletId: string) => Promise<void>;
  onDisconnect: () => void;
};

export default function WalletConnection({
  publicKey,
  status,
  error,
  errorCode,
  availableWallets,
  selectedWalletId,
  onConnect,
  onDisconnect,
}: WalletConnectionProps) {
  const isConnecting = status === 'checking';
  const isConnected = status === 'connected' && !!publicKey;

  const handleSelect = async (walletId: string) => {
    try {
      await onConnect(walletId);
    } catch {
      // Error handled in hook
    }
  };

  const selectedWallet = availableWallets.find((w) => w.id === selectedWalletId);

  return (
    <section className="rounded-2xl border border-white/10 bg-stellar-navy/80 p-6 shadow-xl backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-stellar-cyan">
            Multi-Wallet · StellarWalletsKit
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Connect a Wallet</h2>
          <p className="mt-1 text-sm text-slate-400">
            Freighter, xBull, Albedo, LOBSTR, Hana, and more on Testnet
          </p>
        </div>

        {isConnected && (
          <button
            type="button"
            onClick={onDisconnect}
            className="rounded-lg bg-red-500/90 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Disconnect
          </button>
        )}
      </div>

      {!isConnected && (
        <div className="mt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
            Available wallets
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {availableWallets.length === 0 ? (
              <p className="text-sm text-slate-400">
                Loading wallets… Install Freighter or another Stellar wallet extension.
              </p>
            ) : (
              availableWallets.map((wallet) => (
                <button
                  key={wallet.id}
                  type="button"
                  onClick={() => handleSelect(wallet.id)}
                  disabled={isConnecting || !wallet.isAvailable}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-stellar-dark/60 px-4 py-3 text-left transition hover:border-stellar-purple/50 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {wallet.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={wallet.icon} alt="" className="h-8 w-8 rounded-lg" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">{wallet.name}</p>
                    <p className="text-xs text-slate-400">
                      {wallet.isAvailable ? 'Available' : 'Not installed'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {isConnected && publicKey && (
        <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">
            Connected {selectedWallet ? `· ${selectedWallet.name}` : ''}
          </p>
          <p className="mt-1 font-mono text-sm text-white" title={publicKey}>
            {formatAddress(publicKey)}
          </p>
          <p className="mt-2 text-xs text-slate-400">Network: Stellar Testnet</p>
        </div>
      )}

      {error && (
        <div
          className={`mt-4 rounded-xl border p-4 text-sm ${
            errorCode === 'INSUFFICIENT_BALANCE'
              ? 'border-amber-400/30 bg-amber-400/10 text-amber-100'
              : errorCode === 'CONNECTION_REJECTED'
                ? 'border-orange-400/30 bg-orange-400/10 text-orange-100'
                : 'border-red-400/30 bg-red-400/10 text-red-200'
          }`}
        >
          <p className="font-semibold">
            {errorCode === 'WALLET_NOT_FOUND' && 'Wallet not found'}
            {errorCode === 'CONNECTION_REJECTED' && 'Connection rejected'}
            {errorCode === 'INSUFFICIENT_BALANCE' && 'Insufficient balance'}
            {errorCode === 'WRONG_NETWORK' && 'Wrong network'}
            {!errorCode || errorCode === 'UNKNOWN' ? 'Error' : ''}
          </p>
          <p className="mt-1">{error}</p>
        </div>
      )}
    </section>
  );
}
