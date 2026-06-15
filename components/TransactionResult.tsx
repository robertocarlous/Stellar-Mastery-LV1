'use client';

import { getExplorerTxUrl } from '@/lib/stellar';

type TransactionResultProps = {
  status: 'success' | 'error';
  message: string;
  hash?: string;
};

export default function TransactionResult({ status, message, hash }: TransactionResultProps) {
  const isSuccess = status === 'success';

  return (
    <div
      className={`rounded-xl border p-4 ${
        isSuccess
          ? 'border-emerald-400/30 bg-emerald-400/10'
          : 'border-red-400/30 bg-red-400/10'
      }`}
      role="status"
      aria-live="polite"
    >
      <p
        className={`text-sm font-semibold ${isSuccess ? 'text-emerald-200' : 'text-red-200'}`}
      >
        {isSuccess ? 'Success' : 'Failed'}
      </p>
      <p className={`mt-1 text-sm ${isSuccess ? 'text-emerald-100/90' : 'text-red-100/90'}`}>
        {message}
      </p>

      {hash && (
        <div className="mt-3 rounded-lg bg-black/20 p-3">
          <p className="text-xs uppercase tracking-wider text-slate-400">Transaction hash</p>
          <p className="mt-1 break-all font-mono text-xs text-white">{hash}</p>
          <a
            href={getExplorerTxUrl(hash)}
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
