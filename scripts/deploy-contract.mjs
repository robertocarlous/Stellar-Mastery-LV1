/**
 * Deploy poll_registry + live_poll to Stellar testnet with inter-contract wiring.
 *
 * Prerequisites:
 *   npm run contract:build
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
const POLL_QUESTION = 'Should Stellar be your go-to chain?';

const WASM = {
  registry: path.join(process.cwd(), 'contracts', 'poll_registry.wasm'),
  poll: path.join(process.cwd(), 'contracts', 'live_poll.wasm'),
};

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

async function uploadWasm(server, deployer, wasmPath) {
  const wasm = fs.readFileSync(wasmPath);
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
    throw new Error(`WASM upload failed: ${wasmPath}`);
  }

  const result = await waitForTx(server, sent.hash);
  if (!result.returnValue) throw new Error('Upload succeeded but no return value.');
  return extractWasmHash(result.returnValue);
}

async function deployContract(server, deployer, wasmHash) {
  let account = await server.getAccount(deployer.publicKey());
  const tx = new TransactionBuilder(account, {
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

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(deployer);
  const sent = await server.sendTransaction(prepared);
  if (sent.status === 'ERROR') {
    throw new Error('Contract deploy submission failed.');
  }

  const result = await waitForTx(server, sent.hash);
  if (!result.returnValue) throw new Error('Deploy succeeded but no return value.');
  return { contractId: extractContractId(result.returnValue), txHash: result.txHash };
}

async function invokeContract(server, deployer, contractId, method, ...args) {
  const contract = new Contract(contractId);
  let account = await server.getAccount(deployer.publicKey());
  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  let prepared = await server.prepareTransaction(tx);
  prepared.sign(deployer);
  const sent = await server.sendTransaction(prepared);
  if (sent.status === 'ERROR') {
    throw new Error(`Invoke ${method} failed.`);
  }
  return waitForTx(server, sent.hash);
}

async function main() {
  const secret = process.env.DEPLOYER_SECRET;
  if (!secret) {
    console.error(
      'Set DEPLOYER_SECRET (run: DEPLOYER_SECRET=$(stellar keys show deployer) node scripts/deploy-contract.mjs)'
    );
    process.exit(1);
  }

  for (const [name, wasmPath] of Object.entries(WASM)) {
    if (!fs.existsSync(wasmPath)) {
      console.error(`Missing ${wasmPath}. Run: npm run contract:build`);
      process.exit(1);
    }
    console.log(`Found ${name} WASM at ${wasmPath}`);
  }

  const deployer = Keypair.fromSecret(secret);
  const server = new rpc.Server(RPC_URL);
  const admin = new Address(deployer.publicKey());

  console.log('\nDeployer:', deployer.publicKey());

  console.log('\n── Step 1: Deploy poll_registry ──');
  const registryWasmHash = await uploadWasm(server, deployer, WASM.registry);
  const registry = await deployContract(server, deployer, registryWasmHash);
  console.log('Registry ID:', registry.contractId);

  console.log('\n── Step 2: Deploy live_poll ──');
  const pollWasmHash = await uploadWasm(server, deployer, WASM.poll);
  const poll = await deployContract(server, deployer, pollWasmHash);
  console.log('Poll ID:', poll.contractId);

  console.log('\n── Step 3: Initialize & wire contracts ──');
  const registryInit = await invokeContract(
    server,
    deployer,
    registry.contractId,
    'init',
    admin.toScVal()
  );
  console.log('Registry init tx:', registryInit.txHash);

  const pollInit = await invokeContract(server, deployer, poll.contractId, 'init');
  console.log('Poll init tx:', pollInit.txHash);

  const configure = await invokeContract(
    server,
    deployer,
    poll.contractId,
    'configure',
    admin.toScVal(),
    new Address(registry.contractId).toScVal()
  );
  console.log('Poll configure tx:', configure.txHash);

  const register = await invokeContract(
    server,
    deployer,
    registry.contractId,
    'register_poll',
    admin.toScVal(),
    new Address(poll.contractId).toScVal(),
    xdr.ScVal.scvString(POLL_QUESTION)
  );
  console.log('Registry register_poll tx:', register.txHash);

  const envContent = [
    `NEXT_PUBLIC_POLL_CONTRACT_ID=${poll.contractId}`,
    `NEXT_PUBLIC_REGISTRY_CONTRACT_ID=${registry.contractId}`,
    `NEXT_PUBLIC_STELLAR_RPC_URL=${RPC_URL}`,
    '',
  ].join('\n');

  fs.writeFileSync(ENV_PATH, envContent);

  console.log('\n✅ Level 3 deployment complete');
  console.log('Poll contract:', poll.contractId);
  console.log('Registry contract:', registry.contractId);
  console.log(`\nSaved to ${ENV_PATH}`);
  console.log('\nNext: npm run dev');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
