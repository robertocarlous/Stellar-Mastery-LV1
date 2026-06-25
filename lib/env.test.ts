import { describe, expect, it } from 'vitest';
import { validateAppEnv } from '@/lib/env';

describe('validateAppEnv', () => {
  it('warns when poll contract is missing', () => {
    const warnings = validateAppEnv({
      rpcUrl: 'https://soroban-testnet.stellar.org',
      horizonUrl: 'https://horizon-testnet.stellar.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
      pollContractId: '',
      registryContractId: 'CREGISTRY123',
    });
    expect(warnings.some((w) => w.includes('POLL_CONTRACT_ID'))).toBe(true);
  });

  it('returns no warnings when fully configured', () => {
    const warnings = validateAppEnv({
      rpcUrl: 'https://soroban-testnet.stellar.org',
      horizonUrl: 'https://horizon-testnet.stellar.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
      pollContractId: 'CPOLL123',
      registryContractId: 'CREGISTRY123',
    });
    expect(warnings).toHaveLength(0);
  });
});
