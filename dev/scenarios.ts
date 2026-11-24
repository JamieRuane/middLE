import type { StateResponse } from '../src/shared/api';
import { emptyCounts, isBullseye, median, percentileBeaten, score, toBins, total } from '../src/shared/score';
import { promptForDayNumber, formatValue } from '../src/shared/prompts';

// A plausible crowd: clustered around 62 with a long tail.
const crowd = (n: number): number[] => {
  const c = emptyCounts();
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const u = rand() + rand() + rand() - 1.5;
    const v = Math.round(Math.min(100, Math.max(0, 62 + u * 30 + (rand() < 0.08 ? -40 : 0))));
    c[v] = (c[v] ?? 0) + 1;
  }
  return c;
};

export const buildPreviewState = (s: string, guessed: number | null): StateResponse => {
  const number = s === 'closed' ? 2 : 3;
  const prompt = promptForDayNumber(s === 'colour' ? 2 : s === 'time' ? 5 : number);
  const preset = s === 'played' || s === 'closed' ? 58 : null;
  const guess = guessed ?? preset;
  const open = s !== 'closed';
  const counts = crowd(s === 'few' ? 3 : 1284);
  if (guess !== null && guessed !== null) counts[guess] = (counts[guess] ?? 0) + 1;
  const med = median(counts);
  const showResults = guess !== null || !open;
  return {
    type: 'state',
    day: s === 'closed' ? '2026-11-25' : '2026-11-26',
    number,
    prompt,
    open,
    msToReset: 5 * 3_600_000 + 12 * 60_000,
    loggedIn: s !== 'out',
    players: total(counts),
    guess,
    results: showResults
      ? {
          count: total(counts),
          median: med,
          bins: toBins(counts),
          score: guess !== null && med !== null ? score(guess, med) : null,
          percentile: guess !== null && med !== null ? percentileBeaten(counts, guess, med) : null,
          bullseye: guess !== null && med !== null ? isBullseye(guess, med) : false,
        }
      : null,
    stats: s === 'new'
      ? { streak: guessed === null ? 0 : 1, bestStreak: guessed === null ? 0 : 1, played: guessed === null ? 0 : 1, bullseyes: 0, average: null }
      : { streak: guess !== null ? 3 : 2, bestStreak: 5, played: 9, bullseyes: 1, average: 81 },
    yesterday: s === 'new' ? null : {
      number: 2,
      text: 'Where does blue stop and green begin?',
      median: 47,
      guessLabel: formatValue(promptForDayNumber(2), 44),
      medianLabel: formatValue(promptForDayNumber(2), 47),
      score: 94,
      count: 1102,
    },
    todayUrl: open ? null : 'https://www.reddit.com/r/middle_game/comments/abc123',
  };
};
