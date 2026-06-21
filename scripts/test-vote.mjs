/** Quick vote for README verification tx hash */
import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  rpc,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const CONTRACT_ID = process.env.CONTRACT_ID ?? 'CAYIMSMU3DJRHUG5NUOJNO6BIBPQT7LMVPCO5JNOIGQRNPHBA7WWIIG7';
const secret = process.env.DEPLOYER_SECRET;

if (!secret) {
  console.error('Set DEPLOYER_SECRET');
  process.exit(1);
}

const deployer = Keypair.fromSecret(secret);
const server = new rpc.Server(RPC_URL);
const contract = new Contract(CONTRACT_ID);

async function wait(hash) {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const tx = await server.getTransaction(hash);
    if (tx.status === rpc.Api.GetTransactionStatus.SUCCESS) return tx;
    if (tx.status === rpc.Api.GetTransactionStatus.FAILED) throw new Error('failed');
  }
  throw new Error('timeout');
}

const account = await server.getAccount(deployer.publicKey());
const tx = new TransactionBuilder(account, {
  fee: BASE_FEE,
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(
    contract.call(
      'vote',
      new Address(deployer.publicKey()).toScVal(),
      xdr.ScVal.scvSymbol('yes')
    )
  )
  .setTimeout(180)
  .build();

const prepared = await server.prepareTransaction(tx);
prepared.sign(deployer);
const sent = await server.sendTransaction(prepared);
const result = await wait(sent.hash);
console.log('Vote tx hash:', result.txHash);
