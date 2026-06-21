'use client';

import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit/sdk';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';
import { Networks } from '@creit.tech/stellar-wallets-kit/types';
import { FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { NETWORK_PASSPHRASE } from '@/lib/config';

let initialized = false;

export function initWalletsKit(): void {
  if (initialized || typeof window === 'undefined') return;

  StellarWalletsKit.init({
    modules: defaultModules(),
    selectedWalletId: FREIGHTER_ID,
    network: Networks.TESTNET,
  });
  initialized = true;
}

export function getNetworkPassphrase(): string {
  return NETWORK_PASSPHRASE;
}

export async function listSupportedWallets() {
  initWalletsKit();
  return StellarWalletsKit.refreshSupportedWallets();
}

export async function connectWithWallet(walletId: string): Promise<string> {
  initWalletsKit();
  StellarWalletsKit.setWallet(walletId);
  const { address } = await StellarWalletsKit.fetchAddress();
  return address;
}

export async function signWithKit(xdr: string, address: string): Promise<string> {
  initWalletsKit();
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  if (!signedTxXdr) {
    throw new Error('Wallet did not return a signed transaction.');
  }
  return signedTxXdr;
}

export async function disconnectKit(): Promise<void> {
  initWalletsKit();
  await StellarWalletsKit.disconnect();
}

export { StellarWalletsKit, FREIGHTER_ID };
