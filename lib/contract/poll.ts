import {
  Address,
  Contract,
  rpc,
  scValToNative,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  type Transaction,
} from '@stellar/stellar-sdk';
import {
  NETWORK_PASSPHRASE,
  POLL_CONTRACT_ID,
  RPC_URL,
} from '@/lib/config';

export type PollResults = { yes: number; no: number };

export type VoteChoice = 'yes' | 'no';

function getServer() {
  return new rpc.Server(RPC_URL);
}

function getContract(): Contract {
  if (!POLL_CONTRACT_ID) {
    throw new Error(
      'Poll contract not configured. Set NEXT_PUBLIC_POLL_CONTRACT_ID in .env.local'
    );
  }
  return new Contract(POLL_CONTRACT_ID);
}

export async function readPollResults(): Promise<PollResults> {
  const server = getServer();
  const contract = getContract();
  const source = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

  const tx = new TransactionBuilder(await server.getAccount(source), {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_results'))
    .setTimeout(180)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error ?? 'Failed to read poll results.');
  }

  if (!sim.result?.retval) {
    throw new Error('No result returned from contract simulation.');
  }

  const [yes, no] = scValToNative(sim.result.retval) as [number, number];
  return { yes: Number(yes), no: Number(no) };
}

export async function buildVoteTransaction(
  publicKey: string,
  choice: VoteChoice
): Promise<Transaction> {
  const server = getServer();
  const contract = getContract();
  const account = await server.getAccount(publicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'vote',
        new Address(publicKey).toScVal(),
        xdr.ScVal.scvSymbol(choice)
      )
    )
    .setTimeout(180)
    .build();

  return server.prepareTransaction(tx);
}

export async function submitSignedTransaction(signedXdr: string): Promise<{
  hash: string;
  status: rpc.Api.GetTransactionStatus;
}> {
  const server = getServer();
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const sent = await server.sendTransaction(tx);

  if (sent.status === 'ERROR') {
    throw new Error(sent.errorResult?.toXDR('base64') ?? 'Transaction submission failed.');
  }

  const hash = sent.hash;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const result = await server.getTransaction(hash);
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return { hash, status: result.status };
    }
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed on network. Hash: ${hash}`);
    }
  }

  return { hash, status: rpc.Api.GetTransactionStatus.NOT_FOUND };
}

export { POLL_CONTRACT_ID };
