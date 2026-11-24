import type { StateResponse } from '../src/shared/api';
import {
  emptyCounts,
  isBullseye,
  median,
  score,
  toBins,
  total,
} from '../src/shared/score';
import { ROUNDS, promptsForDayNumber } from '../src/shared/prompts';

// A plausible crowd per round: clustered around a centre with a long tail.
const crowd = (n: number, centre: number, seed: number): number[] => {
  const c = emptyCounts();
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const u = rand() + rand() + rand() - 1.5;
    const v = Math.round(
      Math.min(100, Math.max(0, centre + u * 30 + (rand() < 0.08 ? -40 : 0)))
    );
    c[v] = (c[v] ?? 0) + 1;
  }
  return c;
};

const CENTRES = [62, 35, 48, 71, 55];

/** Scenarios: fresh | new | mid | played | closed | few | out */
export const buildPreviewState = (
  s: string,
  guesses: (number | null)[]
): StateResponse => {
  const number = s === 'closed' ? 2 : 3;
  const open = s !== 'closed';
  const players = s === 'few' ? 3 : 1284;
  const counts = CENTRES.map((c, r) => {
    const k = crowd(players, c, r + 7);
    const g = guesses[r];
    if (g !== null && g !== undefined) k[g] = (k[g] ?? 0) + 1;
    return k;
  });
  const complete = guesses.every((g) => g !== null);
  const results = counts.map((k, r) => {
    const g = guesses[r] ?? null;
    if (g === null && open) return null;
    const med = median(k);
    return {
      count: total(k),
      median: med,
      bins: toBins(k),
      score: g !== null && med !== null ? score(g, med) : null,
      bullseye: g !== null && med !== null ? isBullseye(g, med) : false,
    };
  });
  return {
    type: 'state',
    day: s === 'closed' ? '2026-11-25' : '2026-11-26',
    number,
    prompts: promptsForDayNumber(number),
    open,
    msToReset: 5 * 3_600_000 + 12 * 60_000,
    loggedIn: s !== 'out',
    players,
    guesses,
    results,
    total: complete ? results.reduce((a, r) => a + (r?.score ?? 0), 0) : null,
    stats:
      s === 'new'
        ? {
            streak: complete ? 1 : 0,
            bestStreak: complete ? 1 : 0,
            played: complete ? 1 : 0,
            bullseyes: 0,
            average: null,
          }
        : {
            streak: complete ? 3 : 2,
            bestStreak: 5,
            played: 9,
            bullseyes: 4,
            average: 391,
          },
    yesterday:
      s === 'new' ? null : { number: number - 1, total: 412, bullseyes: 1 },
    todayUrl: open
      ? null
      : 'https://www.reddit.com/r/middle_game/comments/abc123',
  };
};

export const initialGuesses = (s: string): (number | null)[] => {
  if (s === 'played' || s === 'closed') return [58, 40, 50, 66, 30];
  if (s === 'mid') return [58, 40, null, null, null];
  return Array.from({ length: ROUNDS }, () => null);
};
