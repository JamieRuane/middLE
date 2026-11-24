import { context, reddit, redis } from '@devvit/web/server';
import type {
  RoundResult,
  StateResponse,
  Stats,
  Yesterday,
} from '../../shared/api';
import {
  addDays,
  dayNumber,
  isValidDay,
  msUntilNextDay,
  today,
} from '../../shared/day';
import { ROUNDS, promptsForDayNumber } from '../../shared/prompts';
import {
  MAX_DAILY_TOTAL,
  MAX_VALUE,
  beatPercent,
  emptyCounts,
  toBins,
  total,
} from '../../shared/score';
import { outcome, warmupsForDayNumber } from '../../shared/crowd';
import { shareText } from '../../shared/share';

// Redis layout
//   d:{day}:r{round}:counts   hash  bucket(0..100) -> number of guesses
//   d:{day}:r{round}:guesses  hash  userId -> guess (one per user per round, via hSetNX)
//   d:{day}:post              str   postId of that day's post
//   d:{day}:shared            hash  userId -> commentId of their shared result
//   d:{day}:totals            str   cached JSON histogram of finishers' daily totals (60s)
//   post:{postId}             str   day a post belongs to (fallback when postData is missing)
//   u:{userId}                hash  played, streak, best, last, settled, total, scored, bull
const keys = {
  counts: (day: string, round: number) => `d:${day}:r${round}:counts`,
  guesses: (day: string, round: number) => `d:${day}:r${round}:guesses`,
  dayPost: (day: string) => `d:${day}:post`,
  shared: (day: string) => `d:${day}:shared`,
  totals: (day: string) => `d:${day}:totals`,
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

/**
 * Per-round scores for a finished day. Each round is scored against the crowd minus your own
 * guess, topped up by the fading warm-up crowd (see shared/crowd.ts).
 */
const scoreDay = (
  day: string,
  guesses: number[],
  counts: number[][],
  warmups: number[][] = warmupsForDayNumber(dayNumber(day))
) => {
  return guesses.map((g, r) => {
    const o = outcome(
      counts[r] ?? emptyCounts(),
      warmups[r] ?? emptyCounts(),
      g
    );
    return { score: o.score ?? 0, bullseye: o.bullseye };
  });
};

const TOTALS_CACHE_MS = 60_000;

/**
 * Histogram (index 0..500) of every finisher's daily total, each scored against the
 * current crowd. Cached for a minute; cleared whenever someone finishes.
 */
const dayTotals = async (day: string): Promise<number[]> => {
  const cached = await redis.get(keys.totals(day));
  if (cached) {
    try {
      const parsed: unknown = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.every((n) => typeof n === 'number')) {
        return parsed;
      }
    } catch {
      // fall through and rebuild
    }
  }
  const [maps, counts] = await Promise.all([
    Promise.all(ROUND_INDEXES.map((r) => redis.hGetAll(keys.guesses(day, r)))),
    readAllCounts(day),
  ]);
  const warmups = warmupsForDayNumber(dayNumber(day));
  const hist = new Array<number>(MAX_DAILY_TOTAL + 1).fill(0);
  for (const userId of Object.keys(maps[LAST_ROUND] ?? {})) {
    const guesses = maps.map((m) => {
      const v = m[userId];
      return v === undefined ? null : int(v);
    });
    if (!isComplete(guesses)) continue;
    const sum = scoreDay(day, guesses, counts, warmups).reduce(
      (a, r) => a + r.score,
      0
    );
    hist[sum] = (hist[sum] ?? 0) + 1;
  }
  await redis.set(keys.totals(day), JSON.stringify(hist), {
    expiration: new Date(Date.now() + TOTALS_CACHE_MS),
  });
  return hist;
};

/** Your "better than X%" for a finished day, making sure you're counted even if the cache is a moment old. */
const beatFor = async (day: string, mine: number): Promise<number | null> => {
  const hist = [...(await dayTotals(day))];
  if ((hist[mine] ?? 0) === 0) hist[mine] = 1;
  return beatPercent(hist, mine);
};

/** Total score and bullseye count for a finished day. */
const tally = (day: string, guesses: number[], counts: number[][]) => {
  const rounds = scoreDay(day, guesses, counts);
  return {
    sum: rounds.reduce((a, r) => a + r.score, 0),
    bullseyes: rounds.filter((r) => r.bullseye).length,
  };
};

export const postUrl = (postId: string): string =>
  `https://www.reddit.com/r/${context.subredditName}/comments/${postId.replace(/^t3_/, '')}`;

export const dayForPost = async (postId: string): Promise<string> => {
  const fromData = context.postData?.day;
  if (isValidDay(fromData)) return fromData;
  const stored = await redis.get(keys.postDay(postId));
  return isValidDay(stored) ? stored : today();
};

export const rememberPost = async (
  day: string,
  postId: string
): Promise<void> => {
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
  const [guesses, counts] = await Promise.all([
    readGuesses(last, userId),
    readAllCounts(last),
  ]);
  if (isComplete(guesses)) {
    const { sum, bullseyes } = tally(last, guesses, counts);
    await Promise.all([
      redis.hIncrBy(userKey, 'total', sum),
      redis.hIncrBy(userKey, 'scored', 1),
      redis.hIncrBy(userKey, 'bull', bullseyes),
    ]);
  }
  await redis.hSet(userKey, { settled: last });
};

/**
 * Reads the player's stats. `finishedToday` is their provisional result for today, if they've
 * finished it: finished days only settle into the stored totals on a later visit, so
 * without it today's bullseyes and score wouldn't show until tomorrow.
 */
const readStats = async (
  userId: string | undefined,
  now: string,
  finishedToday: { sum: number; bullseyes: number } | null = null
): Promise<Stats> => {
  if (!userId)
    return { streak: 0, bestStreak: 0, played: 0, bullseyes: 0, average: null };
  const u = await redis.hGetAll(keys.user(userId));
  const alive = u.last === now || u.last === addDays(now, -1);
  const pending = finishedToday && u.settled !== now ? finishedToday : null;
  const scored = int(u.scored) + (pending ? 1 : 0);
  const totalScore = int(u.total) + (pending?.sum ?? 0);
  return {
    streak: alive ? int(u.streak) : 0,
    bestStreak: int(u.best),
    played: int(u.played),
    bullseyes: int(u.bull) + (pending?.bullseyes ?? 0),
    average: scored > 0 ? Math.round(totalScore / scored) : null,
  };
};

const buildRound = (
  counts: number[],
  warmup: number[],
  guess: number | null
): RoundResult => {
  const o = outcome(counts, warmup, guess);
  return {
    count: total(counts),
    median: o.median,
    bins: toBins(counts),
    score: o.score,
    bullseye: o.bullseye,
    warmup: o.warmup,
    warmupBins: o.warmupBins,
  };
};

const readYesterday = async (
  userId: string,
  now: string
): Promise<Yesterday | null> => {
  const day = addDays(now, -1);
  const guesses = await readGuesses(day, userId);
  if (!isComplete(guesses)) return null;
  const { sum, bullseyes } = tally(day, guesses, await readAllCounts(day));
  return { number: dayNumber(day), total: sum, bullseyes };
};

export const getState = async (postId: string): Promise<StateResponse> => {
  const userId = context.userId;
  const now = today();
  const day = await dayForPost(postId);
  const open = day === now;
  const number = dayNumber(day);
  const warmups = warmupsForDayNumber(number);

  if (userId) await settle(userId, now);

  const guesses: (number | null)[] = userId
    ? await readGuesses(day, userId)
    : ROUND_INDEXES.map(() => null);
  const complete = isComplete(guesses);
  // A round's crowd is revealed as soon as you've locked it in (or for everyone once the day closes).
  const revealed = ROUND_INDEXES.map((r) => guesses[r] !== null || !open);

  const [counts, yesterday, todayPostId, players, sharedId] = await Promise.all(
    [
      Promise.all(
        ROUND_INDEXES.map((r) =>
          revealed[r] ? readCounts(day, r) : Promise.resolve(null)
        )
      ),
      userId && open ? readYesterday(userId, now) : Promise.resolve(null),
      open ? Promise.resolve(null) : postIdForDay(now),
      redis.hLen(keys.guesses(day, LAST_ROUND)),
      userId
        ? redis.hGet(keys.shared(day), userId)
        : Promise.resolve(undefined),
    ]
  );

  const dayTally = complete
    ? tally(
        day,
        guesses,
        counts.map((c) => c ?? emptyCounts())
      )
    : null;
  // Today's finished game counts toward stats straight away.
  const [stats, beat] = await Promise.all([
    readStats(userId, now, open ? dayTally : null),
    dayTally ? beatFor(day, dayTally.sum) : Promise.resolve(null),
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
    results: counts.map((c, r) =>
      c ? buildRound(c, warmups[r] ?? emptyCounts(), guesses[r] ?? null) : null
    ),
    total: dayTally?.sum ?? null,
    beat,
    stats,
    shared: Boolean(sharedId),
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

  const fresh = await redis.hSetNX(
    keys.guesses(day, round),
    userId,
    String(value)
  );
  if (fresh === 0) throw new GameError('That round is already locked in.');
  await redis.hIncrBy(keys.counts(day, round), String(value), 1);

  if (round === LAST_ROUND) {
    await redis.del(keys.totals(day));
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

/**
 * Posts the player's spoiler-free result as a comment on the post, from their own account.
 * The text is built here from stored guesses, so it can't be faked; one share per player per day.
 */
export const shareResult = async (
  postId: NonNullable<typeof context.postId>
): Promise<StateResponse> => {
  const userId = context.userId;
  if (!userId) throw new GameError('Log in to share.');
  const day = await dayForPost(postId);
  if (day !== today()) throw new GameError('Share on today’s middLE instead.');

  if (await redis.hGet(keys.shared(day), userId)) {
    throw new GameError('You’ve already shared today’s result.');
  }

  const guesses = await readGuesses(day, userId);
  if (!isComplete(guesses))
    throw new GameError('Finish all five rounds first.');

  const counts = await readAllCounts(day);
  const rounds = scoreDay(day, guesses, counts);
  const sum = rounds.reduce((a, r) => a + r.score, 0);
  const [stats, beat] = await Promise.all([
    readStats(userId, today()),
    beatFor(day, sum),
  ]);
  const text = shareText({
    number: dayNumber(day),
    total: sum,
    maxTotal: ROUNDS * 100,
    rounds,
    streak: stats.streak,
    beat,
    final: false,
  });

  // Claim the share slot first so a double tap can't post twice.
  const claimed = await redis.hSetNX(keys.shared(day), userId, 'pending');
  if (claimed === 0)
    throw new GameError('You’ve already shared today’s result.');
  try {
    const comment = await reddit.submitComment({
      id: postId,
      text,
      runAs: 'USER',
    });
    await redis.hSet(keys.shared(day), { [userId]: comment.id });
  } catch (error) {
    await redis.hDel(keys.shared(day), [userId]);
    throw error;
  }

  return getState(postId);
};
