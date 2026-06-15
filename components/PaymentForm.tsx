'use client';

import { useState } from 'react';
import {
  accountExists,
  buildPaymentTransaction,
  formatXlmAmount,
  getStellarErrorMessage,
  isValidStellarAddress,
  MIN_CREATE_ACCOUNT_XLM,
  NETWORK_PASSPHRASE,
  submitSignedTransaction,
} from '@/lib/stellar';
import { signWithFreighter } from '@/lib/freighter';
import TransactionResult from '@/components/TransactionResult';

type PaymentFormProps = {
  publicKey: string;
  onSuccess?: () => void;
};

type TxFeedback = {
  status: 'success' | 'error';
  message: string;
  hash?: string;
};

export default function PaymentForm({ publicKey, onSuccess }: PaymentFormProps) {
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<TxFeedback | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    const trimmedDestination = destination.trim();
    const trimmedAmount = amount.trim();

    if (!isValidStellarAddress(trimmedDestination)) {
      setFeedback({
        status: 'error',
        message: 'Enter a valid Stellar public key (starts with G).',
      });
      return;
    }

    if (trimmedDestination === publicKey) {
      setFeedback({
        status: 'error',
        message: 'You cannot send XLM to your own address.',
      });
      return;
    }

    let formattedAmount: string;
    try {
      formattedAmount = formatXlmAmount(trimmedAmount);
    } catch (err) {
      setFeedback({
        status: 'error',
        message: err instanceof Error ? err.message : 'Enter a valid amount.',
      });
      return;
    }

    const numericAmount = Number(formattedAmount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setFeedback({
        status: 'error',
        message: 'Enter a valid amount greater than 0.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const destinationFunded = await accountExists(trimmedDestination);
      if (!destinationFunded && numericAmount < Number(MIN_CREATE_ACCOUNT_XLM)) {
        setFeedback({
          status: 'error',
          message: `Recipient account is not funded on testnet. Send at least ${MIN_CREATE_ACCOUNT_XLM} XLM, or fund the address with Friendbot first.`,
        });
        return;
      }

      const transaction = await buildPaymentTransaction({
        source: publicKey,
        destination: trimmedDestination,
        amount: formattedAmount,
        memo: memo || undefined,
      });

      const signedXdr = await signWithFreighter(transaction.toXDR(), NETWORK_PASSPHRASE);
      const result = await submitSignedTransaction(signedXdr);

      if (!result.success) {
        setFeedback({
          status: 'error',
          message: 'Transaction was submitted but not successful.',
          hash: result.hash,
        });
        return;
      }

      setFeedback({
        status: 'success',
        message: 'Payment sent successfully on Stellar testnet.',
        hash: result.hash,
      });
      setDestination('');
      setAmount('');
      setMemo('');
      onSuccess?.();
    } catch (err) {
      setFeedback({ status: 'error', message: getStellarErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-stellar-navy/80 p-6 shadow-xl backdrop-blur">
      <p className="text-sm font-medium uppercase tracking-wider text-stellar-cyan">
        Send Payment
      </p>
      <h2 className="mt-1 text-xl font-semibold text-white">Send XLM on Testnet</h2>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm text-slate-300">Recipient address</span>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="G..."
            className="w-full rounded-lg border border-white/10 bg-stellar-dark px-4 py-3 font-mono text-sm text-white outline-none ring-stellar-purple focus:ring-2"
            disabled={submitting}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-slate-300">Amount (XLM)</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10"
            className="w-full rounded-lg border border-white/10 bg-stellar-dark px-4 py-3 text-sm text-white outline-none ring-stellar-purple focus:ring-2"
            disabled={submitting}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-slate-300">Memo (optional)</span>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Payment note"
            maxLength={28}
            className="w-full rounded-lg border border-white/10 bg-stellar-dark px-4 py-3 text-sm text-white outline-none ring-stellar-purple focus:ring-2"
            disabled={submitting}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-stellar-purple py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Signing & sending…' : 'Send XLM'}
        </button>
      </form>

      {feedback && (
        <div className="mt-4">
          <TransactionResult
            status={feedback.status}
            message={feedback.message}
            hash={feedback.hash}
          />
        </div>
      )}
    </section>
  );
}
