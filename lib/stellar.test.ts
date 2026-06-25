import { describe, expect, it } from 'vitest';
import { formatAddress } from '@/lib/stellar';

describe('formatAddress', () => {
  it('shortens a Stellar public key for display', () => {
    const key = 'GCKFBEIYTKP6RQBSTI7ADU5G52Z5XNDN43T7NY72P4FJ7N4L2L3K3K3K';
    expect(formatAddress(key)).toBe('GCKFBE...3K3K');
  });

  it('returns empty string for empty input', () => {
    expect(formatAddress('')).toBe('');
  });
});
