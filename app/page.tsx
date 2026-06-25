'use client';

import { useEffect, useState } from 'react';
import WalletConnection from '@/components/WalletConnection';
import BalanceDisplay from '@/components/BalanceDisplay';
import PaymentForm from '@/components/PaymentForm';
import PollPanel from '@/components/PollPanel';
import EventFeed from '@/components/EventFeed';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useWalletKit } from '@/hooks/useWalletKit';
import { validateAppEnv } from '@/lib/env';

type Tab = 'poll' | 'payment';

export default function Home() {
  const {
    publicKey,
    status,
    error,
    errorCode,
    availableWallets,
    selectedWalletId,
    connect,
    disconnect,
    checkSufficientBalance,
    signTransaction,
  } = useWalletKit();

  const [tab, setTab] = useState<Tab>('poll');
  const [refreshKey, setRefreshKey] = useState(0);
  const [envWarnings, setEnvWarnings] = useState<string[]>([]);

  useEffect(() => {
    setEnvWarnings(validateAppEnv({
      rpcUrl: process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? '',
      horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL ?? '',
      networkPassphrase: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? '',
      pollContractId: process.env.NEXT_PUBLIC_POLL_CONTRACT_ID ?? '',
      registryContractId: process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ID ?? '',
    }));
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-3 py-6 sm:px-6 sm:py-10">
      <header className="mb-8 text-center sm:mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stellar-cyan sm:text-sm">
          Stellar Mastery · Level 3
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-4xl">
          Orange Belt Production dApp
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
          Advanced Soroban contracts with inter-contract communication, real-time event streaming,
          CI/CD-ready architecture, and production-grade error handling on testnet.
        </p>
      </header>

      {envWarnings.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">
          <p className="font-medium">Configuration notes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/80">
            {envWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-5 sm:space-y-6">
        <WalletConnection
          publicKey={publicKey}
          status={status}
          error={error}
          errorCode={errorCode}
          availableWallets={availableWallets}
          selectedWalletId={selectedWalletId}
          onConnect={connect}
          onDisconnect={disconnect}
        />

        {publicKey && status === 'connected' && (
          <>
            <BalanceDisplay publicKey={publicKey} refreshKey={refreshKey} />

            <nav
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-stellar-dark/40 p-1 sm:flex-row"
              aria-label="App sections"
            >
              <button
                type="button"
                onClick={() => setTab('poll')}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
                  tab === 'poll'
                    ? 'bg-stellar-purple text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Live Poll (Level 3)
              </button>
              <button
                type="button"
                onClick={() => setTab('payment')}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
                  tab === 'payment'
                    ? 'bg-stellar-purple text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                XLM Payment (Level 1)
              </button>
            </nav>

            <ErrorBoundary>
              {tab === 'poll' ? (
                <div className="grid gap-5 lg:grid-cols-1 lg:gap-6">
                  <PollPanel
                    publicKey={publicKey}
                    signTransaction={signTransaction}
                    checkSufficientBalance={checkSufficientBalance}
                    onVoteSuccess={() => setRefreshKey((k) => k + 1)}
                  />
                  <EventFeed refreshKey={refreshKey} />
                </div>
              ) : (
                <PaymentForm
                  publicKey={publicKey}
                  signTransaction={signTransaction}
                  onSuccess={() => setRefreshKey((k) => k + 1)}
                />
              )}
            </ErrorBoundary>
          </>
        )}

        {status === 'disconnected' && !error && (
          <section className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400 sm:p-6">
            <h2 className="font-semibold text-white">Getting started</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Install Freighter, xBull, or another supported Stellar wallet.</li>
              <li>Switch your wallet to Stellar Testnet.</li>
              <li>Pick a wallet above and approve the connection.</li>
              <li>Fund with Friendbot if your balance is 0 XLM.</li>
              <li>Vote on the live poll — cross-contract calls verify with the registry.</li>
            </ol>
          </section>
        )}
      </div>

      <footer className="mt-10 text-center text-xs text-slate-500 sm:mt-12">
        Stellar Mastery Level 3 · Testnet · Inter-contract · CI/CD · Production architecture
      </footer>
    </main>
  );
}
