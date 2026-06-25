'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchVoteEvents, type VoteEventItem } from '@/lib/contract/events';

export type StreamStatus = 'connecting' | 'live' | 'error' | 'paused';

type UseEventStreamOptions = {
  refreshKey?: number;
  pollIntervalMs?: number;
  limit?: number;
};

export function useEventStream({
  refreshKey = 0,
  pollIntervalMs = 3000,
  limit = 20,
}: UseEventStreamOptions = {}) {
  const [events, setEvents] = useState<VoteEventItem[]>([]);
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | undefined>();
  const seenIdsRef = useRef<Set<string>>(new Set());

  const mergeEvents = useCallback((incoming: VoteEventItem[]) => {
    if (incoming.length === 0) return;

    setEvents((prev) => {
      const merged = new Map<string, VoteEventItem>();
      for (const item of prev) merged.set(item.id, item);
      for (const item of incoming) {
        if (!seenIdsRef.current.has(item.id)) {
          seenIdsRef.current.add(item.id);
        }
        merged.set(item.id, item);
      }
      return Array.from(merged.values())
        .sort((a, b) => b.ledger - a.ledger)
        .slice(0, limit);
    });
  }, [limit]);

  const poll = useCallback(async () => {
    try {
      const { events: latest, cursor } = await fetchVoteEvents({
        cursor: cursorRef.current,
        limit,
      });

      if (cursor) {
        cursorRef.current = cursor;
      }

      mergeEvents(latest);
      setStatus('live');
      setError(null);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Event stream failed.');
    }
  }, [limit, mergeEvents]);

  useEffect(() => {
    seenIdsRef.current.clear();
    cursorRef.current = undefined;
    setEvents([]);
    setStatus('connecting');

    let active = true;
    let interval: ReturnType<typeof setInterval>;

    const run = async () => {
      if (!active) return;
      await poll();
    };

    run();
    interval = setInterval(run, pollIntervalMs);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [poll, pollIntervalMs, refreshKey]);

  const retry = useCallback(() => {
    setStatus('connecting');
    setError(null);
    void poll();
  }, [poll]);

  return { events, status, error, retry };
}
