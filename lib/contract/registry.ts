import {
  Address,
  Contract,
  rpc,
  scValToNative,
  TransactionBuilder,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { NETWORK_PASSPHRASE, REGISTRY_CONTRACT_ID, RPC_URL } from '@/lib/config';

export type RegistryPollInfo = {
  question: string;
  active: boolean;
  totalVotes: number;
};

function getServer() {
  return new rpc.Server(RPC_URL);
}

function getContract(): Contract {
  if (!REGISTRY_CONTRACT_ID) {
    throw new Error(
      'Registry contract not configured. Set NEXT_PUBLIC_REGISTRY_CONTRACT_ID in .env.local'
    );
  }
  return new Contract(REGISTRY_CONTRACT_ID);
}

export async function readRegistryPoll(
  pollContractId: string
): Promise<RegistryPollInfo | null> {
  if (!REGISTRY_CONTRACT_ID || !pollContractId) {
    return null;
  }

  const server = getServer();
  const contract = getContract();
  const source = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

  const tx = new TransactionBuilder(await server.getAccount(source), {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call('get_poll', new Address(pollContractId).toScVal())
    )
    .setTimeout(180)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    return null;
  }

  if (!sim.result?.retval) {
    return null;
  }

  const raw = scValToNative(sim.result.retval) as Record<string, unknown>;
  return {
    question: String(raw?.question ?? ''),
    active: Boolean(raw?.active),
    totalVotes: Number(raw?.total_votes ?? 0),
  };
}
