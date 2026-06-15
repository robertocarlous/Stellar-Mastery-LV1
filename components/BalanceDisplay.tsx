'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchXlmBalance, getFriendbotUrl } from '@/lib/stellar';

type BalanceDisplayProps = {
  publicKey: string;
  refreshKey?: number;
};

export default function BalanceDisplay({ publicKey, refreshKey = 0 }: BalanceDisplayProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const xlm = await fetchXlmBalance(publicKey);
      setBalance(xlm);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load balance.';
      setError(message);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance, refreshKey]);

  const isUnfunded = balance === '0';

  return (
    <section className="rounded-2xl border border-white/10 bg-stellar-navy/80 p-6 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-stellar-cyan">
            Account Balance
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">XLM Balance</h2>
        </div>
        <button
          type="button"
          onClick={loadBalance}
          disabled={loading}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="h-12 w-40 animate-pulse rounded-lg bg-white/10" />
        ) : error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : (
          <p className="text-4xl font-bold tracking-tight text-white">
            {balance}{' '}
            <span className="text-2xl font-semibold text-stellar-cyan">XLM</span>
          </p>
        )}
      </div>

      {isUnfunded && !loading && !error && (
        <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">
          <p className="font-medium">Your testnet account has no XLM yet.</p>
          <p className="mt-1 text-amber-200/80">
            Fund it with Friendbot, then refresh your balance.
          </p>
          <a
            href={getFriendbotUrl(publicKey)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-stellar-dark hover:bg-amber-300"
          >
            Fund with Friendbot
          </a>
        </div>
      )}
    </section>
  );
}
