/**
 * Deploy live_poll.wasm to Stellar testnet.
 *
 * Prerequisites:
 *   cd contracts && stellar contract build
 *   stellar keys generate deployer --network testnet
 *   curl "https://friendbot.stellar.org?addr=$(stellar keys address deployer)"
 *
 * Usage:
 *   DEPLOYER_SECRET=$(stellar keys show deployer) node scripts/deploy-contract.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  Contract,
  Address,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;
const WASM_PATH = path.join(process.cwd(), 'contracts', 'live_poll.wasm');
const ENV_PATH = path.join(process.cwd(), '.env.local');

async function waitForTx(server, hash) {
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const tx = await server.getTransaction(hash);
    if (tx.status === rpc.Api.GetTransactionStatus.SUCCESS) return tx;
    if (tx.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed: ${hash}`);
    }
  }
  throw new Error(`Transaction timeout: ${hash}`);
}

function extractWasmHash(returnValue) {
  const native = scValToNative(returnValue);
  if (Buffer.isBuffer(native)) return native;
  if (native instanceof Uint8Array) return Buffer.from(native);
  if (typeof native === 'string') return Buffer.from(native, 'hex');
  throw new Error('Unexpected wasm hash format from upload.');
}

function extractContractId(returnValue) {
  if (returnValue.switch() === xdr.ScValType.scvAddress()) {
    return Address.fromScAddress(returnValue.address()).toString();
  }
  const native = scValToNative(returnValue);
  if (typeof native === 'string' && native.startsWith('C')) return native;
  throw new Error('Unexpected contract id format from deploy.');
}

async function main() {
  const secret = process.env.DEPLOYER_SECRET;
  if (!secret) {
    console.error('Set DEPLOYER_SECRET (run: DEPLOYER_SECRET=$(stellar keys show deployer) node scripts/deploy-contract.mjs)');
    process.exit(1);
  }

  if (!fs.existsSync(WASM_PATH)) {
    console.error(`Missing ${WASM_PATH}. Run: cd contracts && stellar contract build`);
    process.exit(1);
  }

  const deployer = Keypair.fromSecret(secret);
  const server = new rpc.Server(RPC_URL);
  const wasm = fs.readFileSync(WASM_PATH);

  console.log('Deployer:', deployer.publicKey());
  console.log('Uploading WASM…');

  let account = await server.getAccount(deployer.publicKey());
  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(180)
    .build();

  let prepared = await server.prepareTransaction(tx);
  prepared.sign(deployer);
  let sent = await server.sendTransaction(prepared);
  if (sent.status === 'ERROR') {
    throw new Error('WASM upload submission failed.');
  }

  const uploadResult = await waitForTx(server, sent.hash);
  if (!uploadResult.returnValue) throw new Error('Upload succeeded but no return value.');
  const wasmHash = extractWasmHash(uploadResult.returnValue);
  console.log('WASM hash:', wasmHash.toString('hex'));

  console.log('Deploying contract…');
  account = await server.getAccount(deployer.publicKey());
  tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.createCustomContract({
        address: Address.fromString(deployer.publicKey()),
        wasmHash,
        salt: Buffer.from(Keypair.random().rawPublicKey()),
      })
    )
    .setTimeout(180)
    .build();

  prepared = await server.prepareTransaction(tx);
  prepared.sign(deployer);
  sent = await server.sendTransaction(prepared);
  if (sent.status === 'ERROR') {
    throw new Error('Contract deploy submission failed.');
  }

  const deployResult = await waitForTx(server, sent.hash);
  if (!deployResult.returnValue) throw new Error('Deploy succeeded but no return value.');
  const contractId = extractContractId(deployResult.returnValue);

  console.log('Initializing contract…');
  const contract = new Contract(contractId);
  account = await server.getAccount(deployer.publicKey());
  tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('init'))
    .setTimeout(180)
    .build();

  prepared = await server.prepareTransaction(tx);
  prepared.sign(deployer);
  sent = await server.sendTransaction(prepared);
  const initResult = await waitForTx(server, sent.hash);

  const envContent = `NEXT_PUBLIC_POLL_CONTRACT_ID=${contractId}\nNEXT_PUBLIC_STELLAR_RPC_URL=${RPC_URL}\n`;

  fs.writeFileSync(ENV_PATH, envContent);

  console.log('\n✅ Deployment complete');
  console.log('Contract ID:', contractId);
  console.log('Deploy tx:', deployResult.txHash);
  console.log('Init tx:', initResult.txHash);
  console.log(`\nSaved to ${ENV_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
