export type AppEnv = {
  rpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
  pollContractId: string;
  registryContractId: string;
};

export function getAppEnv(): AppEnv {
  return {
    rpcUrl: process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org',
    horizonUrl:
      process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org',
    networkPassphrase:
      process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015',
    pollContractId: process.env.NEXT_PUBLIC_POLL_CONTRACT_ID ?? '',
    registryContractId: process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ID ?? '',
  };
}

export function validateAppEnv(env: AppEnv): string[] {
  const warnings: string[] = [];
  if (!env.pollContractId) {
    warnings.push('NEXT_PUBLIC_POLL_CONTRACT_ID is not set — poll features disabled.');
  }
  if (!env.registryContractId) {
    warnings.push(
      'NEXT_PUBLIC_REGISTRY_CONTRACT_ID is not set — registry metadata unavailable.'
    );
  }
  return warnings;
}
