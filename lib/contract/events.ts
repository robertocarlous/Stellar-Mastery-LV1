import { rpc, scValToNative } from '@stellar/stellar-sdk';
import { NETWORK_PASSPHRASE, POLL_CONTRACT_ID, RPC_URL } from '@/lib/config';

export type VoteEventItem = {
  id: string;
  voter: string;
  choice: 'yes' | 'no';
  yesTotal: number;
  noTotal: number;
  ledger: number;
  txHash?: string;
};

function getServer() {
  return new rpc.Server(RPC_URL);
}

function parseChoice(value: unknown): 'yes' | 'no' {
  if (typeof value === 'string') {
    return value === 'no' ? 'no' : 'yes';
  }
  return 'yes';
}

function decodeVoteEvent(event: rpc.Api.EventResponse): VoteEventItem | null {
  try {
    const topics = event.topic ?? [];
    if (topics.length === 0) return null;

    const voterVal = topics.length > 1 ? topics[1] : topics[0];
    const voter = scValToNative(voterVal) as string;
    const payload = scValToNative(event.value) as Record<string, unknown>;

    return {
      id: event.id ?? `${event.ledger}-${event.txHash ?? 'event'}`,
      voter,
      choice: parseChoice(payload?.choice),
      yesTotal: Number(payload?.yes_total ?? 0),
      noTotal: Number(payload?.no_total ?? 0),
      ledger: event.ledger,
      txHash: event.txHash,
    };
  } catch {
    return null;
  }
}

export async function fetchVoteEvents(options?: {
  cursor?: string;
  limit?: number;
}): Promise<{ events: VoteEventItem[]; cursor?: string }> {
  if (!POLL_CONTRACT_ID) {
    return { events: [] };
  }

  const server = getServer();
  const latest = await server.getLatestLedger();
  const startLedger = Math.max(1, latest.sequence - 1000);

  const response = await server.getEvents({
    startLedger,
    limit: options?.limit ?? 20,
    filters: [
      {
        type: 'contract',
        contractIds: [POLL_CONTRACT_ID],
      },
    ],
  });

  const events = response.events
    .map(decodeVoteEvent)
    .filter((e): e is VoteEventItem => e !== null)
    .reverse();

  return {
    events,
    cursor: response.cursor,
  };
}

export async function pollUntilLedgerUpdate(
  lastLedger: number,
  timeoutMs = 60000
): Promise<number> {
  const server = getServer();
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const latest = await server.getLatestLedger();
    if (latest.sequence > lastLedger) {
      return latest.sequence;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  return lastLedger;
}

export { NETWORK_PASSPHRASE, POLL_CONTRACT_ID, RPC_URL };
