import * as StellarSdk from '@stellar/stellar-sdk';

export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

export async function fetchXlmBalance(publicKey: string): Promise<string> {
  try {
    const account = await server.loadAccount(publicKey);
    const native = account.balances.find((b) => b.asset_type === 'native');
    return native && 'balance' in native ? native.balance : '0';
  } catch (error: unknown) {
    if (error instanceof StellarSdk.NotFoundError) {
      return '0';
    }
    throw error;
  }
}

export async function buildPaymentTransaction(params: {
  source: string;
  destination: string;
  amount: string;
  memo?: string;
}): Promise<StellarSdk.Transaction> {
  const account = await server.loadAccount(params.source);

  const builder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  }).addOperation(
    StellarSdk.Operation.payment({
      destination: params.destination,
      asset: StellarSdk.Asset.native(),
      amount: params.amount,
    })
  );

  if (params.memo?.trim()) {
    builder.addMemo(StellarSdk.Memo.text(params.memo.trim().slice(0, 28)));
  }

  return builder.setTimeout(180).build();
}

export async function accountExists(publicKey: string): Promise<boolean> {
  try {
    await server.loadAccount(publicKey);
    return true;
  } catch (error: unknown) {
    if (error instanceof StellarSdk.NotFoundError) {
      return false;
    }
    throw error;
  }
}

/** Stellar accounts need at least ~1 XLM to be created via payment. */
export const MIN_CREATE_ACCOUNT_XLM = '1';

export function formatXlmAmount(amount: string): string {
  const normalized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('Enter a valid XLM amount (numbers only, up to 7 decimal places).');
  }

  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > 7) {
    throw new Error('XLM supports at most 7 decimal places.');
  }

  return fraction ? `${whole}.${fraction}` : whole;
}

const OPERATION_ERROR_MESSAGES: Record<string, string> = {
  op_no_destination:
    'Recipient account does not exist on testnet. Fund it with Friendbot first, or send at least 1 XLM to create the account.',
  op_underfunded:
    'Insufficient XLM in your wallet for this payment (include network fees).',
  op_line_full: 'Recipient cannot receive this payment.',
  op_low_reserve: 'Payment would leave the account below the minimum balance.',
};

const TRANSACTION_ERROR_MESSAGES: Record<string, string> = {
  tx_insufficient_balance:
    'Insufficient XLM in your wallet for this payment (include network fees).',
  tx_bad_seq: 'Account sequence changed. Refresh the page and try again.',
  tx_bad_auth: 'Freighter signed with a different account. Reconnect your wallet.',
  tx_too_late: 'Transaction expired. Try again.',
  tx_no_source_account:
    'Your account is not funded on testnet. Use Friendbot to add XLM first.',
};

export function getStellarErrorMessage(error: unknown): string {
  if (error instanceof StellarSdk.BadResponseError) {
    const data = error.response?.data as
      | { detail?: string; extras?: { result_codes?: { transaction?: string; operations?: string[] } } }
      | undefined;
    const resultCodes = data?.extras?.result_codes;

    if (resultCodes) {
      const txCode = resultCodes.transaction;
      const opCode = resultCodes.operations?.[0];

      if (opCode && OPERATION_ERROR_MESSAGES[opCode]) {
        return OPERATION_ERROR_MESSAGES[opCode];
      }
      if (txCode && TRANSACTION_ERROR_MESSAGES[txCode]) {
        return TRANSACTION_ERROR_MESSAGES[txCode];
      }

      if (opCode || txCode) {
        return `Transaction failed (${[txCode, opCode].filter(Boolean).join(' / ')}).`;
      }
    }

    const detail = data?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('status code 400')) {
      return 'Transaction rejected by the network. Common causes: unfunded recipient address, insufficient balance, or invalid amount.';
    }
    return error.message;
  }

  return 'Transaction failed. Please try again.';
}

export async function submitSignedTransaction(
  signedXdr: string
): Promise<{ hash: string; success: boolean }> {
  const transaction = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    NETWORK_PASSPHRASE
  ) as StellarSdk.Transaction;

  try {
    const result = await server.submitTransaction(transaction);
    return {
      hash: result.hash,
      success: result.successful,
    };
  } catch (error) {
    throw new Error(getStellarErrorMessage(error));
  }
}

export function isValidStellarAddress(address: string): boolean {
  try {
    StellarSdk.StrKey.decodeEd25519PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function formatAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function getExplorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function getFriendbotUrl(publicKey: string): string {
  return `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;
}
