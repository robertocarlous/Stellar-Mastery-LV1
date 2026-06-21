'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  buildVoteTransaction,
  readPollResults,
  submitSignedTransaction,
  type PollResults,
  type VoteChoice,
} from '@/lib/contract/poll';
import { POLL_CONTRACT_ID, EXPLORER_CONTRACT } from '@/lib/config';
import TransactionStatus, { type TxStatus } from '@/components/TransactionStatus';

type PollPanelProps = {
  publicKey: string;
  signTransaction: (xdr: string) => Promise<string>;
  checkSufficientBalance: (minimum?: number) => Promise<boolean>;
  onVoteSuccess?: () => void;
};

export default function PollPanel({
  publicKey,
  signTransaction,
  checkSufficientBalance,
  onVoteSuccess,
}: PollPanelProps) {
  const [results, setResults] = useState<PollResults>({ yes: 0, no: 0 });
  const [loadingResults, setLoadingResults] = useState(true);
  const [voting, setVoting] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txMessage, setTxMessage] = useState<string>();
  const [txHash, setTxHash] = useState<string>();

  const loadResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const data = await readPollResults();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
    const interval = setInterval(loadResults, 8000);
    return () => clearInterval(interval);
  }, [loadResults]);

  const handleVote = async (choice: VoteChoice) => {
    setTxStatus('idle');
    setTxMessage(undefined);
    setTxHash(undefined);

    const hasBalance = await checkSufficientBalance(1);
    if (!hasBalance) {
      setTxStatus('failed');
      setTxMessage('Insufficient XLM balance for contract transaction fees.');
      return;
    }

    setVoting(true);
    setTxStatus('pending');
    setTxMessage(`Submitting ${choice.toUpperCase()} vote to the smart contract…`);

    try {
      const assembled = await buildVoteTransaction(publicKey, choice);
      const signedXdr = await signTransaction(assembled.toXDR());
      const { hash } = await submitSignedTransaction(signedXdr);

      setTxStatus('success');
      setTxMessage(`Vote recorded on testnet! You voted ${choice.toUpperCase()}.`);
      setTxHash(hash);
      await loadResults();
      onVoteSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Vote transaction failed.';
      setTxStatus('failed');
      setTxMessage(message);
    } finally {
      setVoting(false);
    }
  };

  const total = results.yes + results.no;
  const yesPct = total > 0 ? Math.round((results.yes / total) * 100) : 50;
  const noPct = total > 0 ? 100 - yesPct : 50;

  return (
    <section className="rounded-2xl border border-white/10 bg-stellar-navy/80 p-6 shadow-xl backdrop-blur">
      <p className="text-sm font-medium uppercase tracking-wider text-stellar-cyan">
        Smart Contract · Live Poll
      </p>
      <h2 className="mt-1 text-xl font-semibold text-white">
        Should Stellar be your go-to chain?
      </h2>

      {POLL_CONTRACT_ID ? (
        <p className="mt-2 break-all font-mono text-xs text-slate-500">
          Contract:{' '}
          <a
            href={EXPLORER_CONTRACT(POLL_CONTRACT_ID)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stellar-cyan hover:underline"
          >
            {POLL_CONTRACT_ID}
          </a>
        </p>
      ) : (
        <p className="mt-2 text-sm text-amber-200">
          Contract not configured — deploy and set NEXT_PUBLIC_POLL_CONTRACT_ID
        </p>
      )}

      <div className="mt-6">
        {loadingResults ? (
          <div className="h-24 animate-pulse rounded-xl bg-white/5" />
        ) : (
          <>
            <div className="flex justify-between text-sm text-slate-300">
              <span>Yes — {results.yes}</span>
              <span>No — {results.no}</span>
            </div>
            <div className="mt-2 flex h-4 overflow-hidden rounded-full bg-stellar-dark">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${yesPct}%` }}
              />
              <div
                className="bg-red-500/80 transition-all duration-500"
                style={{ width: `${noPct}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">{total} total votes</p>
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleVote('yes')}
          disabled={voting || !POLL_CONTRACT_ID}
          className="rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          Vote Yes
        </button>
        <button
          type="button"
          onClick={() => handleVote('no')}
          disabled={voting || !POLL_CONTRACT_ID}
          className="rounded-xl bg-red-600/90 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          Vote No
        </button>
      </div>

      <div className="mt-4">
        <TransactionStatus status={txStatus} message={txMessage} hash={txHash} />
      </div>
    </section>
  );
}
