import { context, redis } from '@devvit/web/server';
import type { Results, StateResponse, Stats, Yesterday } from '../../shared/api';
import { addDays, dayNumber, isValidDay, msUntilNextDay, today } from '../../shared/day';
import { formatValue, promptForDayNumber } from '../../shared/prompts';
import {
  MAX_VALUE,
  emptyCounts,
  isBullseye,
  median,
  percentileBeaten,
  score,
  toBins,
  total,
} from '../../shared/score';

// Redis layout
//   d:{day}:counts   hash  bucket(0..100) -> number of guesses
//   d:{day}:guesses  hash  userId -> guess (one per user, enforced with hSetNX)
//   d:{day}:post     str   postId of that day's post
//   post:{postId}    str   day a post belongs to (fallback when postData is missing)
//   u:{userId}       hash  played, streak, best, last, settled, total, scored, bull
const keys = {
  counts: (day: string) => `d:${day}:counts`,
  guesses: (day: string) => `d:${day}:guesses`,
  dayPost: (day: string) => `d:${day}:post`,
  postDay: (postId: string) => `post:${postId}`,
  user: (userId: string) => `u:${userId}`,
};

export class GameError extends Error {}

const int = (s: string | null | undefined): number => {
  const n = s ? parseInt(s, 10) : 0;
  return Number.isFinite(n) ? n : 0;
};

const readCounts = async (day: string): Promise<number[]> => {
  const raw = await redis.hGetAll(keys.counts(day));
  const counts = emptyCounts();
  for (const [bucket, count] of Object.entries(raw)) {
    const v = int(bucket);
    if (v >= 0 && v <= MAX_VALUE) counts[v] = int(count);
  }
  return counts;
};

const readGuess = async (day: string, userId: string): Promise<number | null> => {
  const g = await redis.hGet(keys.guesses(day), userId);
  return g === undefined || g === null ? null : int(g);
};

export const postUrl = (postId: string): string =>
  `https://www.reddit.com/r/${context.subredditName}/comments/${postId.replace(/^t3_/, '')}`;

export const dayForPost = async (postId: string): Promise<string> => {
  const fromData = context.postData?.day;
  if (isValidDay(fromData)) return fromData;
  const stored = await redis.get(keys.postDay(postId));
  return isValidDay(stored) ? stored : today();
};

export const rememberPost = async (day: string, postId: string): Promise<void> => {
  await Promise.all([
    redis.set(keys.dayPost(day), postId),
    redis.set(keys.postDay(postId), day),
  ]);
};

export const postIdForDay = async (day: string): Promise<string | null> =>
  (await redis.get(keys.dayPost(day))) ?? null;

/**
 * Folds the user's last finished day into their totals (score, bullseyes).
 * Runs lazily on their next visit, so there's no nightly batch job over every player.
 */
const settle = async (userId: string, now: string): Promise<void> => {
  const u = await redis.hGetAll(keys.user(userId));
  const last = u.last;
  if (!last || last >= now || u.settled === last) return;
  const [guess, counts] = await Promise.all([readGuess(last, userId), readCounts(last)]);
  const med = median(counts);
  if (guess !== null && med !== null) {
    await Promise.all([
      redis.hIncrBy(keys.user(userId), 'total', score(guess, med)),
      redis.hIncrBy(keys.user(userId), 'scored', 1),
      isBullseye(guess, med)
        ? redis.hIncrBy(keys.user(userId), 'bull', 1)
        : Promise.resolve(0),
    ]);
  }
  await redis.hSet(keys.user(userId), { settled: last });
};

const readStats = async (userId: string | undefined, now: string): Promise<Stats> => {
  if (!userId) return { streak: 0, bestStreak: 0, played: 0, bullseyes: 0, average: null };
  const u = await redis.hGetAll(keys.user(userId));
  const alive = u.last === now || u.last === addDays(now, -1);
  const scored = int(u.scored);
  return {
    streak: alive ? int(u.streak) : 0,
    bestStreak: int(u.best),
    played: int(u.played),
    bullseyes: int(u.bull),
    average: scored > 0 ? Math.round(int(u.total) / scored) : null,
  };
};

const buildResults = (counts: number[], guess: number | null): Results => {
  const med = median(counts);
  const mine = guess !== null && med !== null;
  return {
    count: total(counts),
    median: med,
    bins: toBins(counts),
    score: mine ? score(guess, med) : null,
    percentile: mine ? percentileBeaten(counts, guess, med) : null,
    bullseye: mine ? isBullseye(guess, med) : false,
  };
};

const readYesterday = async (userId: string, now: string): Promise<Yesterday | null> => {
  const day = addDays(now, -1);
  const guess = await readGuess(day, userId);
  if (guess === null) return null;
  const counts = await readCounts(day);
  const med = median(counts);
  if (med === null) return null;
  const n = dayNumber(day);
  const prompt = promptForDayNumber(n);
  return {
    number: n,
    text: prompt.text,
    median: med,
    guessLabel: formatValue(prompt, guess),
    medianLabel: formatValue(prompt, med),
    score: score(guess, med),
    count: total(counts),
  };
};

export const getState = async (postId: string): Promise<StateResponse> => {
  const userId = context.userId;
  const now = today();
  const day = await dayForPost(postId);
  const open = day === now;
  const number = dayNumber(day);

  if (userId) await settle(userId, now);

  const guess = userId ? await readGuess(day, userId) : null;
  const showResults = guess !== null || !open;
  const [counts, stats, yesterday, todayPostId, players] = await Promise.all([
    showResults ? readCounts(day) : Promise.resolve(null),
    readStats(userId, now),
    userId && open ? readYesterday(userId, now) : Promise.resolve(null),
    open ? Promise.resolve(null) : postIdForDay(now),
    redis.hLen(keys.guesses(day)),
  ]);

  return {
    type: 'state',
    day,
    number,
    prompt: promptForDayNumber(number),
    open,
    msToReset: msUntilNextDay(),
    loggedIn: Boolean(userId),
    players,
    guess,
    results: counts ? buildResults(counts, guess) : null,
    stats,
    yesterday,
    todayUrl: todayPostId ? postUrl(todayPostId) : null,
  };
};

export const submitGuess = async (postId: string, value: number): Promise<StateResponse> => {
  const userId = context.userId;
  if (!userId) throw new GameError('Log in to play.');
  const now = today();
  const day = await dayForPost(postId);
  if (day !== now) throw new GameError('This middLE has closed. Try today’s!');

  await settle(userId, now);

  const fresh = await redis.hSetNX(keys.guesses(day), userId, String(value));
  if (fresh === 0) throw new GameError('You’ve already locked in today.');

  const userKey = keys.user(userId);
  const u = await redis.hGetAll(userKey);
  const streak = u.last === addDays(now, -1) ? int(u.streak) + 1 : 1;
  await Promise.all([
    redis.hIncrBy(keys.counts(day), String(value), 1),
    redis.hIncrBy(userKey, 'played', 1),
    redis.hSet(userKey, {
      last: now,
      streak: String(streak),
      best: String(Math.max(streak, int(u.best))),
    }),
  ]);

  return getState(postId);
};
