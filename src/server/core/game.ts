import { context, redis } from '@devvit/web/server';
import type { RoundResult, StateResponse, Stats, Yesterday } from '../../shared/api';
import { addDays, dayNumber, isValidDay, msUntilNextDay, today } from '../../shared/day';
import { ROUNDS, promptsForDayNumber } from '../../shared/prompts';
import { MAX_VALUE, emptyCounts, isBullseye, median, score, toBins, total } from '../../shared/score';

// Redis layout
//   d:{day}:r{round}:counts   hash  bucket(0..100) -> number of guesses
//   d:{day}:r{round}:guesses  hash  userId -> guess (one per user per round, via hSetNX)
//   d:{day}:post              str   postId of that day's post
//   post:{postId}             str   day a post belongs to (fallback when postData is missing)
//   u:{userId}                hash  played, streak, best, last, settled, total, scored, bull
const keys = {
  counts: (day: string, round: number) => `d:${day}:r${round}:counts`,
  guesses: (day: string, round: number) => `d:${day}:r${round}:guesses`,
  dayPost: (day: string) => `d:${day}:post`,
  postDay: (postId: string) => `post:${postId}`,
  user: (userId: string) => `u:${userId}`,
};

const ROUND_INDEXES = Array.from({ length: ROUNDS }, (_, i) => i);
const LAST_ROUND = ROUNDS - 1;

export class GameError extends Error {}

const int = (s: string | null | undefined): number => {
  const n = s ? parseInt(s, 10) : 0;
  return Number.isFinite(n) ? n : 0;
};

const readCounts = async (day: string, round: number): Promise<number[]> => {
  const raw = await redis.hGetAll(keys.counts(day, round));
  const counts = emptyCounts();
  for (const [bucket, count] of Object.entries(raw)) {
    const v = int(bucket);
    if (v >= 0 && v <= MAX_VALUE) counts[v] = int(count);
  }
  return counts;
};

const readAllCounts = (day: string): Promise<number[][]> =>
  Promise.all(ROUND_INDEXES.map((r) => readCounts(day, r)));

const readGuesses = (day: string, userId: string): Promise<(number | null)[]> =>
  Promise.all(
    ROUND_INDEXES.map(async (r) => {
      const g = await redis.hGet(keys.guesses(day, r), userId);
      return g === undefined || g === null ? null : int(g);
    })
  );

const isComplete = (guesses: (number | null)[]): guesses is number[] =>
  guesses.every((g) => g !== null);

/** Total score and bullseye count for a finished day. */
const tally = (guesses: number[], counts: number[][]) => {
  let sum = 0;
  let bullseyes = 0;
  guesses.forEach((g, r) => {
    const med = median(counts[r] ?? []);
    if (med === null) return;
    sum += score(g, med);
    if (isBullseye(g, med)) bullseyes++;
  });
  return { sum, bullseyes };
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
 * Folds the user's last finished day into their totals.
 * Runs lazily on their next visit, so there's no nightly batch job over every player.
 */
const settle = async (userId: string, now: string): Promise<void> => {
  const userKey = keys.user(userId);
  const u = await redis.hGetAll(userKey);
  const last = u.last;
  if (!last || last >= now || u.settled === last) return;
  const [guesses, counts] = await Promise.all([readGuesses(last, userId), readAllCounts(last)]);
  if (isComplete(guesses)) {
    const { sum, bullseyes } = tally(guesses, counts);
    await Promise.all([
      redis.hIncrBy(userKey, 'total', sum),
      redis.hIncrBy(userKey, 'scored', 1),
      redis.hIncrBy(userKey, 'bull', bullseyes),
    ]);
  }
  await redis.hSet(userKey, { settled: last });
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

const buildRound = (counts: number[], guess: number | null): RoundResult => {
  const med = median(counts);
  const mine = guess !== null && med !== null;
  return {
    count: total(counts),
    median: med,
    bins: toBins(counts),
    score: mine ? score(guess, med) : null,
    bullseye: mine ? isBullseye(guess, med) : false,
  };
};

const readYesterday = async (userId: string, now: string): Promise<Yesterday | null> => {
  const day = addDays(now, -1);
  const guesses = await readGuesses(day, userId);
  if (!isComplete(guesses)) return null;
  const { sum, bullseyes } = tally(guesses, await readAllCounts(day));
  return { number: dayNumber(day), total: sum, bullseyes };
};

export const getState = async (postId: string): Promise<StateResponse> => {
  const userId = context.userId;
  const now = today();
  const day = await dayForPost(postId);
  const open = day === now;
  const number = dayNumber(day);

  if (userId) await settle(userId, now);

  const guesses: (number | null)[] = userId
    ? await readGuesses(day, userId)
    : ROUND_INDEXES.map(() => null);
  const complete = isComplete(guesses);
  // A round's crowd is revealed as soon as you've locked it in (or for everyone once the day closes).
  const revealed = ROUND_INDEXES.map((r) => guesses[r] !== null || !open);

  const [counts, stats, yesterday, todayPostId, players] = await Promise.all([
    Promise.all(
      ROUND_INDEXES.map((r) => (revealed[r] ? readCounts(day, r) : Promise.resolve(null)))
    ),
    readStats(userId, now),
    userId && open ? readYesterday(userId, now) : Promise.resolve(null),
    open ? Promise.resolve(null) : postIdForDay(now),
    redis.hLen(keys.guesses(day, LAST_ROUND)),
  ]);

  return {
    type: 'state',
    day,
    number,
    prompts: promptsForDayNumber(number),
    open,
    msToReset: msUntilNextDay(),
    loggedIn: Boolean(userId),
    players,
    guesses,
    results: counts.map((c, r) => (c ? buildRound(c, guesses[r] ?? null) : null)),
    total: complete ? tally(guesses, counts.map((c) => c ?? emptyCounts())).sum : null,
    stats,
    yesterday,
    todayUrl: todayPostId ? postUrl(todayPostId) : null,
  };
};

export const submitGuess = async (
  postId: string,
  round: number,
  value: number
): Promise<StateResponse> => {
  const userId = context.userId;
  if (!userId) throw new GameError('Log in to play.');
  const now = today();
  const day = await dayForPost(postId);
  if (day !== now) throw new GameError('This middLE has closed. Try today’s!');

  await settle(userId, now);

  const guesses = await readGuesses(day, userId);
  const next = guesses.findIndex((g) => g === null);
  if (next === -1) throw new GameError('You’ve already played today.');
  if (round !== next) throw new GameError('That round is already locked in.');

  const fresh = await redis.hSetNX(keys.guesses(day, round), userId, String(value));
  if (fresh === 0) throw new GameError('That round is already locked in.');
  await redis.hIncrBy(keys.counts(day, round), String(value), 1);

  if (round === LAST_ROUND) {
    const userKey = keys.user(userId);
    const u = await redis.hGetAll(userKey);
    const streak = u.last === addDays(now, -1) ? int(u.streak) + 1 : 1;
    await Promise.all([
      redis.hIncrBy(userKey, 'played', 1),
      redis.hSet(userKey, {
        last: now,
        streak: String(streak),
        best: String(Math.max(streak, int(u.best))),
      }),
    ]);
  }

  return getState(postId);
};
