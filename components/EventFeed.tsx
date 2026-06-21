'use client';

import { useEffect, useState } from 'react';
import { fetchVoteEvents, type VoteEventItem } from '@/lib/contract/events';
import { formatAddress } from '@/lib/stellar';
import { EXPLORER_TX } from '@/lib/config';

type EventFeedProps = {
  refreshKey?: number;
};

export default function EventFeed({ refreshKey = 0 }: EventFeedProps) {
  const [events, setEvents] = useState<VoteEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { events: latest } = await fetchVoteEvents({ limit: 15 });
        if (active) {
          setEvents(latest);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load events.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refreshKey]);

  return (
    <section className="rounded-2xl border border-white/10 bg-stellar-navy/80 p-6 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-stellar-cyan">
            Live Activity
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Vote Event Feed</h2>
          <p className="mt-1 text-sm text-slate-400">Polls contract events every 5 seconds</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Live
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {loading && events.length === 0 && (
          <div className="h-20 animate-pulse rounded-xl bg-white/5" />
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}
        {!loading && events.length === 0 && !error && (
          <p className="text-sm text-slate-400">No votes yet. Cast the first vote!</p>
        )}
        {events.map((event) => (
          <article
            key={event.id}
            className="rounded-xl border border-white/5 bg-stellar-dark/50 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-white">
                <span className="font-mono text-stellar-cyan">{formatAddress(event.voter)}</span>
                {' voted '}
                <span
                  className={
                    event.choice === 'yes' ? 'font-semibold text-emerald-300' : 'font-semibold text-red-300'
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
