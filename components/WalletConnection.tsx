'use client';

import { formatAddress } from '@/lib/stellar';
import type { WalletStatus } from '@/hooks/useWallet';

type WalletConnectionProps = {
  publicKey: string | null;
  status: WalletStatus;
  isInstalled: boolean;
  error: string | null;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
};

export default function WalletConnection({
  publicKey,
  status,
  isInstalled,
  error,
  onConnect,
  onDisconnect,
}: WalletConnectionProps) {
  const isConnecting = status === 'checking';
  const isConnected = status === 'connected' && !!publicKey;

  const handleConnect = async () => {
    try {
      await onConnect();
    } catch {
      // Error state is handled in the hook.
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-stellar-navy/80 p-6 shadow-xl backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-stellar-cyan">
            Freighter Wallet
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Wallet Connection</h2>
          <p className="mt-1 text-sm text-slate-400">
            Connect with Freighter on Stellar Testnet
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isInstalled && status !== 'checking' && (
            <a
              href="https://freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-400/20"
            >
              Install Freighter
            </a>
          )}

          {isConnected ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="rounded-lg bg-red-500/90 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="rounded-lg bg-stellar-purple px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isConnecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>

      {isConnected && publicKey && (
        <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">
            Connected
          </p>
          <p className="mt-1 font-mono text-sm text-white" title={publicKey}>
            {formatAddress(publicKey)}
          </p>
          <p className="mt-2 text-xs text-slate-400">Network: Stellar Testnet</p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}
    </section>
  );
}
