'use client';

import { useEffect, useState } from 'react';
import { useEventStream } from '@/hooks/useEventStream';
import { formatAddress } from '@/lib/stellar';
import { EXPLORER_TX } from '@/lib/config';

type EventFeedProps = {
  refreshKey?: number;
};

const STATUS_LABEL: Record<string, string> = {
  connecting: 'Connecting…',
  live: 'Live',
  error: 'Reconnecting…',
  paused: 'Paused',
};

export default function EventFeed({ refreshKey = 0 }: EventFeedProps) {
  const { events, status, error, retry } = useEventStream({
    refreshKey,
    pollIntervalMs: 3000,
    limit: 15,
  });
  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    if (events.length > 0 || status === 'error') {
      setShowSkeleton(false);
    }
  }, [events.length, status]);

  const statusColor =
    status === 'live'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
      : status === 'error'
        ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
        : 'border-slate-400/30 bg-slate-400/10 text-slate-300';

  return (
    <section className="rounded-2xl border border-white/10 bg-stellar-navy/80 p-4 shadow-xl backdrop-blur sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-stellar-cyan">
            Real-time Stream
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">Vote Event Feed</h2>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Cursor-based RPC polling with incremental updates
          </p>
        </div>
        <button
          type="button"
          onClick={retry}
          className={`flex items-center gap-1.5 self-start rounded-full border px-3 py-1 text-xs ${statusColor}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              status === 'live' ? 'animate-pulse bg-emerald-400' : 'bg-current'
            }`}
          />
          {STATUS_LABEL[status] ?? status}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {showSkeleton && events.length === 0 && (
          <div className="h-20 animate-pulse rounded-xl bg-white/5" />
        )}
        {error && (
          <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">
            {error}
          </p>
        )}
        {!showSkeleton && events.length === 0 && !error && (
          <p className="text-sm text-slate-400">No votes yet. Cast the first vote!</p>
        )}
        {events.map((event) => (
          <article
            key={event.id}
            className="rounded-xl border border-white/5 bg-stellar-dark/50 p-3 sm:p-4"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
              <p className="text-sm text-white">
                <span className="font-mono text-stellar-cyan">{formatAddress(event.voter)}</span>
                {' voted '}
                <span
                  className={
                    event.choice === 'yes'
                      ? 'font-semibold text-emerald-300'
                      : 'font-semibold text-red-300'
                  }
                >
                  {event.choice.toUpperCase()}
                </span>
              </p>
              <p className="text-xs text-slate-500">Ledger {event.ledger}</p>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Totals — Yes: {event.yesTotal} · No: {event.noTotal}
            </p>
            {event.txHash && (
              <a
                href={EXPLORER_TX(event.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-stellar-cyan hover:underline"
              >
                View tx →
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
