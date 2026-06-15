'use client';

import { useState } from 'react';
import WalletConnection from '@/components/WalletConnection';
import BalanceDisplay from '@/components/BalanceDisplay';
import PaymentForm from '@/components/PaymentForm';
import { useWallet } from '@/hooks/useWallet';

export default function Home() {
  const { publicKey, status, isInstalled, error, connect, disconnect } = useWallet();
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePaymentSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stellar-cyan">
          Stellar Mastery · Level 1
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          White Belt Payment dApp
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          Connect Freighter on testnet, check your XLM balance, and send payments with clear
          transaction feedback.
        </p>
      </header>

      <div className="space-y-6">
        <WalletConnection
          publicKey={publicKey}
          status={status}
          isInstalled={isInstalled}
          error={error}
          onConnect={connect}
          onDisconnect={disconnect}
        />

        {publicKey && status === 'connected' && (
          <>
            <BalanceDisplay publicKey={publicKey} refreshKey={refreshKey} />
            <PaymentForm publicKey={publicKey} onSuccess={handlePaymentSuccess} />
          </>
        )}

        {status === 'disconnected' && !error && (
          <section className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
            <h2 className="font-semibold text-white">Getting started</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Install the Freighter browser extension.</li>
              <li>Create or import a wallet and switch Freighter to Testnet.</li>
              <li>Click Connect Wallet and approve the connection.</li>
              <li>Fund your account with Friendbot if your balance is 0 XLM.</li>
              <li>Send a test payment to any valid Stellar address.</li>
            </ol>
          </section>
        )}
      </div>

      <footer className="mt-12 text-center text-xs text-slate-500">
        Built for Stellar Mastery White Belt · Testnet only · Do not use real funds
      </footer>
    </main>
  );
}
