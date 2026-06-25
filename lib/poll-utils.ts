export type PollResults = { yes: number; no: number };

export type PollPercentages = { yesPct: number; noPct: number; total: number };

export function calculatePollPercentages(results: PollResults): PollPercentages {
  const total = results.yes + results.no;
  if (total === 0) {
    return { yesPct: 50, noPct: 50, total: 0 };
  }
  const yesPct = Math.round((results.yes / total) * 100);
  return { yesPct, noPct: 100 - yesPct, total };
}
