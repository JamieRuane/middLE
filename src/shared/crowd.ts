// The crowd you're scored against: real players plus a fading "warm-up" crowd.
//
// Every round starts with WARMUP_SIZE seeded guesses spread around the prompt's expected
// answer, so the first players of the day aren't scored against nobody (or themselves).
// Each real player (other than you) replaces one warm-up guess; once WARMUP_SIZE real
// players are in, the warm-up crowd is gone. Your own guess never counts toward your median.

import type { Prompt } from './prompts.ts';
import { promptsForDayNumber } from './prompts.ts';
import {
  MAX_VALUE,
  emptyCounts,
  isBullseye,
  median,
  score,
  toBins,
  total,
} from './score.ts';

export const WARMUP_SIZE = 30;

/** Small deterministic PRNG so every request and every player sees the same warm-up crowd. */
const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hash = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** The prompt's expected answer as a track position (0..100). */
export const expectedPosition = (prompt: Prompt): number =>
  Math.min(
    MAX_VALUE,
    Math.max(
      0,
      ((prompt.expect - prompt.min) / (prompt.max - prompt.min)) * MAX_VALUE
    )
  );

/** WARMUP_SIZE whole-number guesses, roughly normal around the expected answer. */
export const warmupCounts = (prompt: Prompt, salt: number): number[] => {
  const counts = emptyCounts();
  const rand = mulberry32(hash(prompt.text) ^ salt);
  const centre = expectedPosition(prompt);
  for (let i = 0; i < WARMUP_SIZE; i++) {
    // Box-Muller for a normal sample.
    const u = Math.max(rand(), 1e-9);
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
    const v = Math.round(
      Math.min(MAX_VALUE, Math.max(0, centre + z * prompt.spread))
    );
    counts[v] = (counts[v] ?? 0) + 1;
  }
  return counts;
};

/** The warm-up crowd for each round of a day (varies a little from day to day). */
export const warmupsForDayNumber = (n: number): number[][] =>
  promptsForDayNumber(n).map((prompt, round) =>
    warmupCounts(prompt, n * 31 + round)
  );

/** How much of the warm-up crowd is still in play, given this many real players (0..1). */
export const warmupWeight = (realOthers: number): number =>
  Math.max(0, WARMUP_SIZE - realOthers) / WARMUP_SIZE;

export type Outcome = {
  /** Median you're scored against (others + remaining warm-up). Null only if both are empty. */
  median: number | null;
  score: number | null;
  bullseye: boolean;
  /** Warm-up guesses still counted, rounded for display. */
  warmup: number;
  /** Warm-up guesses per display bar (fractional). */
  warmupBins: number[];
};

/**
 * Scores one round. `real` holds every real guess including the player's own (`guess`),
 * which is removed before working out the median they're scored against.
 */
export const outcome = (
  real: readonly number[],
  warmup: readonly number[],
  guess: number | null,
  /** The player's guess as recorded in `real` (differs from `guess` on a practice replay). */
  own: number | null = guess
): Outcome => {
  const others = [...real];
  if (own !== null && (others[own] ?? 0) > 0)
    others[own] = (others[own] ?? 0) - 1;
  const w = warmupWeight(total(others));
  const scaledWarmup = warmup.map((c) => c * w);
  const crowd = others.map((c, v) => c + (scaledWarmup[v] ?? 0));
  const med = median(crowd);
  const mine = guess !== null && med !== null;
  return {
    median: med,
    score: mine ? score(guess, med) : null,
    bullseye: mine ? isBullseye(guess, med) : false,
    warmup: Math.round(w * WARMUP_SIZE),
    warmupBins: toBins(scaledWarmup),
  };
};
