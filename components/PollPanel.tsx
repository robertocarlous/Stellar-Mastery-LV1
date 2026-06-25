'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  buildVoteTransaction,
  readPollResults,
  submitSignedTransaction,
  type PollResults,
  type VoteChoice,
} from '@/lib/contract/poll';
import { readRegistryPoll } from '@/lib/contract/registry';
import { calculatePollPercentages } from '@/lib/poll-utils';
import {
  POLL_CONTRACT_ID,
  REGISTRY_CONTRACT_ID,
  EXPLORER_CONTRACT,
} from '@/lib/config';
import TransactionStatus, { type TxStatus } from '@/components/TransactionStatus';

type PollPanelProps = {
  publicKey: string;
  signTransaction: (xdr: string) => Promise<string>;
  checkSufficientBalance: (minimum?: number) => Promise<boolean>;
  onVoteSuccess?: () => void;
};

const DEFAULT_QUESTION = 'Should Stellar be your go-to chain?';

export default function PollPanel({
  publicKey,
  signTransaction,
  checkSufficientBalance,
  onVoteSuccess,
}: PollPanelProps) {
  const [results, setResults] = useState<PollResults>({ yes: 0, no: 0 });
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [pollActive, setPollActive] = useState(true);
  const [registryVotes, setRegistryVotes] = useState<number | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txMessage, setTxMessage] = useState<string>();
  const [txHash, setTxHash] = useState<string>();

  const loadResults = useCallback(async () => {
    setLoadingResults(true);
    setResultsError(null);
    try {
      const [data, registryInfo] = await Promise.all([
        readPollResults(),
        REGISTRY_CONTRACT_ID && POLL_CONTRACT_ID
          ? readRegistryPoll(POLL_CONTRACT_ID)
          : Promise.resolve(null),
      ]);
      setResults(data);
      if (registryInfo) {
        setQuestion(registryInfo.question || DEFAULT_QUESTION);
        setPollActive(registryInfo.active);
        setRegistryVotes(registryInfo.totalVotes);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load poll results.';
      setResultsError(message);
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
    const interval = setInterval(loadResults, 6000);
    return () => clearInterval(interval);
  }, [loadResults]);

  const handleVote = async (choice: VoteChoice) => {
    setTxStatus('idle');
    setTxMessage(undefined);
    setTxHash(undefined);

    if (!pollActive) {
      setTxStatus('failed');
      setTxMessage('This poll is closed by the registry admin.');
      return;
    }

    const hasBalance = await checkSufficientBalance(1);
    if (!hasBalance) {
      setTxStatus('failed');
      setTxMessage('Insufficient XLM balance for contract transaction fees.');
      return;
    }

    setVoting(true);
    setTxStatus('pending');
    setTxMessage(`Submitting ${choice.toUpperCase()} vote via inter-contract call…`);

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

  const { yesPct, noPct, total } = calculatePollPercentages(results);

  return (
    <section className="rounded-2xl border border-white/10 bg-stellar-navy/80 p-4 shadow-xl backdrop-blur sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-stellar-cyan">
            Smart Contract · Live Poll
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">{question}</h2>
        </div>
        <span
          className={`self-start rounded-full px-3 py-1 text-xs font-medium ${
            pollActive
              ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
              : 'border border-red-400/30 bg-red-400/10 text-red-200'
          }`}
        >
          {pollActive ? 'Open' : 'Closed'}
        </span>
      </div>

      {POLL_CONTRACT_ID ? (
        <div className="mt-3 space-y-1">
          <p className="break-all font-mono text-xs text-slate-500">
            Poll:{' '}
            <a
              href={EXPLORER_CONTRACT(POLL_CONTRACT_ID)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stellar-cyan hover:underline"
            >
              {POLL_CONTRACT_ID}
            </a>
          </p>
          {REGISTRY_CONTRACT_ID && (
            <p className="break-all font-mono text-xs text-slate-500">
              Registry:{' '}
              <a
                href={EXPLORER_CONTRACT(REGISTRY_CONTRACT_ID)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stellar-cyan hover:underline"
              >
                {REGISTRY_CONTRACT_ID}
              </a>
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-amber-200">
          Contract not configured — deploy and set NEXT_PUBLIC_POLL_CONTRACT_ID
        </p>
      )}

      <div className="mt-6">
        {loadingResults ? (
          <div className="h-24 animate-pulse rounded-xl bg-white/5" />
        ) : resultsError ? (
          <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4">
            <p className="text-sm text-red-200">{resultsError}</p>
            <button
              type="button"
              onClick={loadResults}
              className="mt-2 text-xs text-stellar-cyan hover:underline"
            >
              Retry
            </button>
          </div>
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
            <p className="mt-2 text-center text-xs text-slate-500">
              {total} on-chain votes
              {registryVotes !== null && ` · ${registryVotes} registry-confirmed`}
            </p>
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleVote('yes')}
          disabled={voting || !POLL_CONTRACT_ID || !pollActive}
          className="rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {voting ? 'Voting…' : 'Vote Yes'}
        </button>
        <button
          type="button"
          onClick={() => handleVote('no')}
          disabled={voting || !POLL_CONTRACT_ID || !pollActive}
          className="rounded-xl bg-red-600/90 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          {voting ? 'Voting…' : 'Vote No'}
        </button>
      </div>

      <div className="mt-4">
        <TransactionStatus status={txStatus} message={txMessage} hash={txHash} />
      </div>
    </section>
  );
}
