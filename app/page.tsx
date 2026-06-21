'use client';

import { useState } from 'react';
import WalletConnection from '@/components/WalletConnection';
import BalanceDisplay from '@/components/BalanceDisplay';
import PaymentForm from '@/components/PaymentForm';
import PollPanel from '@/components/PollPanel';
import EventFeed from '@/components/EventFeed';
import { useWalletKit } from '@/hooks/useWalletKit';

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

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stellar-cyan">
          Stellar Mastery · Level 2
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          Yellow Belt Live Poll dApp
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-400">
          Multi-wallet integration with StellarWalletsKit, a deployed Soroban poll contract,
          real-time vote events, and transaction status tracking on testnet.
        </p>
      </header>

      <div className="space-y-6">
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

            <div className="flex gap-2 rounded-xl border border-white/10 bg-stellar-dark/40 p-1">
              <button
                type="button"
                onClick={() => setTab('poll')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  tab === 'poll'
                    ? 'bg-stellar-purple text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Live Poll (Level 2)
              </button>
              <button
                type="button"
                onClick={() => setTab('payment')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  tab === 'payment'
                    ? 'bg-stellar-purple text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                XLM Payment (Level 1)
              </button>
            </div>

            {tab === 'poll' ? (
              <>
                <PollPanel
                  publicKey={publicKey}
                  signTransaction={signTransaction}
                  checkSufficientBalance={checkSufficientBalance}
                  onVoteSuccess={() => setRefreshKey((k) => k + 1)}
                />
                <EventFeed refreshKey={refreshKey} />
              </>
            ) : (
              <PaymentForm
                publicKey={publicKey}
                signTransaction={signTransaction}
                onSuccess={() => setRefreshKey((k) => k + 1)}
              />
            )}
          </>
        )}

        {status === 'disconnected' && !error && (
          <section className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
            <h2 className="font-semibold text-white">Getting started</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Install Freighter, xBull, or another supported Stellar wallet.</li>
              <li>Switch your wallet to Stellar Testnet.</li>
              <li>Pick a wallet above and approve the connection.</li>
              <li>Fund with Friendbot if your balance is 0 XLM.</li>
              <li>Vote on the live poll — your tx is sent to the Soroban contract.</li>
            </ol>
          </section>
        )}
      </div>

      <footer className="mt-12 text-center text-xs text-slate-500">
        Stellar Mastery Level 2 · Testnet only · Multi-wallet + Soroban contract
      </footer>
    </main>
  );
}
