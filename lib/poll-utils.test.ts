import { describe, expect, it } from 'vitest';
import { calculatePollPercentages } from '@/lib/poll-utils';

describe('calculatePollPercentages', () => {
  it('returns 50/50 when no votes exist', () => {
    expect(calculatePollPercentages({ yes: 0, no: 0 })).toEqual({
      yesPct: 50,
      noPct: 50,
      total: 0,
    });
  });

  it('calculates percentages from vote totals', () => {
    expect(calculatePollPercentages({ yes: 3, no: 1 })).toEqual({
      yesPct: 75,
      noPct: 25,
      total: 4,
    });
  });

  it('rounds yes percentage and derives no from remainder', () => {
    const result = calculatePollPercentages({ yes: 1, no: 2 });
    expect(result.total).toBe(3);
    expect(result.yesPct + result.noPct).toBe(100);
  });
});
