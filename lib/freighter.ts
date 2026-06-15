import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  getNetworkDetails,
  signTransaction,
} from '@stellar/freighter-api';

const FREIGHTER_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms = FREIGHTER_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Freighter did not respond. Is the extension installed?')), ms)
    ),
  ]);
}

export type FreighterNetwork = 'TESTNET' | 'PUBLIC' | 'FUTURENET' | 'UNKNOWN';

export async function checkFreighterInstalled(): Promise<boolean> {
  try {
    const result = await withTimeout(isConnected());
    return result.isConnected;
  } catch {
    return false;
  }
}

export async function connectFreighter(): Promise<string> {
  const installed = await checkFreighterInstalled();
  if (!installed) {
    throw new Error(
      'Freighter wallet is not installed. Install it from https://freighter.app and switch to Testnet.'
    );
  }

  const access = await withTimeout(requestAccess());
  if (access.error) {
    throw new Error(access.error.message || 'Wallet connection was denied.');
  }
  if (!access.address) {
    throw new Error('No public key returned from Freighter.');
  }

  const network = await getFreighterNetwork();
  if (network !== 'TESTNET') {
    throw new Error(
      'Freighter must be set to Testnet. Open Freighter → Settings → Network → Testnet.'
    );
  }

  return access.address;
}

export async function getConnectedAddress(): Promise<string | null> {
  const installed = await checkFreighterInstalled();
  if (!installed) return null;

  const allowed = await withTimeout(isAllowed());
  if (!allowed.isAllowed) return null;

  const addressResult = await withTimeout(getAddress());
  if (addressResult.error || !addressResult.address) return null;

  return addressResult.address;
}

export async function getFreighterNetwork(): Promise<FreighterNetwork> {
  const details = await withTimeout(getNetworkDetails());
  if (details.error || !details.network) return 'UNKNOWN';

  const network = details.network.toUpperCase();
  if (network.includes('TEST')) return 'TESTNET';
  if (network.includes('PUBLIC') || network.includes('MAIN')) return 'PUBLIC';
  if (network.includes('FUTURE')) return 'FUTURENET';
  return 'UNKNOWN';
}

export async function signWithFreighter(
  xdr: string,
  networkPassphrase: string
): Promise<string> {
  const result = await withTimeout(
    signTransaction(xdr, {
      networkPassphrase,
      address: undefined,
    }),
    120000
  );

  if (result.error) {
    throw new Error(result.error.message || 'Transaction signing was cancelled.');
  }
  if (!result.signedTxXdr) {
    throw new Error('Freighter did not return a signed transaction.');
  }

  return result.signedTxXdr;
}

export function disconnectFreighter(): void {
  // Freighter has no on-chain disconnect; clear app-side session in the hook.
}
