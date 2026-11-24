// Days are UTC calendar dates in YYYY-MM-DD form. Every player shares the same day.

const DAY_MS = 86_400_000;

/** Day #1 of middLE. */
export const EPOCH_DAY = '2026-11-24';

export const dayOf = (date: Date): string => date.toISOString().slice(0, 10);

export const today = (now: Date = new Date()): string => dayOf(now);

export const addDays = (day: string, n: number): string =>
  dayOf(new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS));

/** 1-based puzzle number for a day. */
export const dayNumber = (day: string): number =>
  Math.round(
    (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${EPOCH_DAY}T00:00:00Z`)) /
      DAY_MS
  ) + 1;

export const msUntilNextDay = (now: Date = new Date()): number =>
  Date.parse(`${addDays(dayOf(now), 1)}T00:00:00Z`) - now.getTime();

export const isValidDay = (day: unknown): day is string =>
  typeof day === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(day) &&
  !Number.isNaN(Date.parse(`${day}T00:00:00Z`));
