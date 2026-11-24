// Scoring works on a histogram of whole-number guesses 0..100 (101 buckets),
// so it stays cheap no matter how many people play.

export const MAX_VALUE = 100;
export const BULLSEYE_DISTANCE = 2;
export const BIN_COUNT = 20;

export const emptyCounts = (): number[] =>
  new Array<number>(MAX_VALUE + 1).fill(0);

export const total = (counts: readonly number[]): number =>
  counts.reduce((sum, c) => sum + c, 0);

const EPSILON = 1e-9;

/**
 * Weighted median of a histogram. Counts may be fractional (warm-up guesses fade out gradually).
 * When the cumulative weight lands exactly on half, it averages with the next value, so whole-number
 * counts behave like the usual median (x.5 for an even number of guesses). Null when the crowd is empty.
 */
export const median = (counts: readonly number[]): number | null => {
  const n = total(counts);
  if (n <= EPSILON) return null;
  const half = n / 2;
  let seen = 0;
  for (let v = 0; v < counts.length; v++) {
    const c = counts[v] ?? 0;
    if (c <= EPSILON) continue;
    seen += c;
    if (seen > half + EPSILON) return v;
    if (Math.abs(seen - half) <= EPSILON) {
      for (let w = v + 1; w < counts.length; w++) {
        if ((counts[w] ?? 0) > EPSILON) return (v + w) / 2;
      }
      return v;
    }
  }
  return MAX_VALUE;
};

/** 100 for dead centre, minus 2 points per unit away, floored at 0. */
export const score = (guess: number, med: number): number =>
  Math.max(0, Math.round(100 - 2 * Math.abs(guess - med)));

export const isBullseye = (guess: number, med: number): boolean =>
  Math.abs(guess - med) <= BULLSEYE_DISTANCE;

/** Share (0..100) of *other* players who landed further from the median than you. */
export const percentileBeaten = (
  counts: readonly number[],
  guess: number,
  med: number
): number => {
  const others = total(counts) - 1;
  if (others <= 0) return 100;
  const mine = Math.abs(guess - med);
  let further = 0;
  for (let v = 0; v < counts.length; v++) {
    if (Math.abs(v - med) > mine) further += counts[v] ?? 0;
  }
  return Math.round((further / others) * 100);
};

/** Groups the 101 buckets into BIN_COUNT display bars (the last bar also holds 100). */
export const toBins = (counts: readonly number[]): number[] => {
  const bins = new Array<number>(BIN_COUNT).fill(0);
  const width = MAX_VALUE / BIN_COUNT;
  for (let v = 0; v < counts.length; v++) {
    const i = Math.min(BIN_COUNT - 1, Math.floor(v / width));
    bins[i] = (bins[i] ?? 0) + (counts[v] ?? 0);
  }
  return bins;
};

export const clampGuess = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const v = Math.round(value);
  return v >= 0 && v <= MAX_VALUE ? v : null;
};
