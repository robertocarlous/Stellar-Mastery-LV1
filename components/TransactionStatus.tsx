'use client';

import { EXPLORER_TX } from '@/lib/config';

export type TxStatus = 'idle' | 'pending' | 'success' | 'failed';

type TransactionStatusProps = {
  status: TxStatus;
  message?: string;
  hash?: string;
};

export default function TransactionStatus({ status, message, hash }: TransactionStatusProps) {
  if (status === 'idle') return null;

  const styles = {
    pending: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
    success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
    failed: 'border-red-400/30 bg-red-400/10 text-red-200',
  };

  const labels = {
    pending: 'Pending',
    success: 'Success',
    failed: 'Failed',
  };

  return (
    <div
      className={`rounded-xl border p-4 ${styles[status]}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        {status === 'pending' && (
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-amber-300" />
        )}
        <p className="text-sm font-semibold">{labels[status]}</p>
      </div>
      {message && <p className="mt-1 text-sm opacity-90">{message}</p>}
      {hash && (
        <div className="mt-3 rounded-lg bg-black/20 p-3">
          <p className="text-xs uppercase tracking-wider opacity-60">Transaction hash</p>
          <p className="mt-1 break-all font-mono text-xs">{hash}</p>
          <a
            href={EXPLORER_TX(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-medium text-stellar-cyan hover:underline"
          >
            View on Stellar Expert →
          </a>
        </div>
      )}
    </div>
  );
}
