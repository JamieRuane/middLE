import { context, redis } from '@devvit/web/server';
import type { PracticeGameInfo, PracticeRoundResponse } from '../../shared/api';
import { outcome } from '../../shared/crowd';
import {
  PRACTICE_GAMES,
  practiceGame,
  practiceWarmup,
} from '../../shared/practice';
import { ROUNDS } from '../../shared/prompts';
import { MAX_VALUE, emptyCounts, toBins, total } from '../../shared/score';
import { GameError } from './game';

// Practice games never change, and their crowd builds up over time from each
// player's FIRST attempt at each round. Replays are scored but don't move the crowd.
//
// Redis layout
//   p:{game}:r{round}:counts    hash  bucket(0..100) -> first-attempt guesses
//   p:{game}:r{round}:guesses   hash  userId -> first-attempt guess
//   u:{userId}:pa:{game}        hash  round -> guess in the current attempt
//   u:{userId}:practice         hash  game -> best total
const keys = {
  counts: (g: number, r: number) => `p:${g}:r${r}:counts`,
  guesses: (g: number, r: number) => `p:${g}:r${r}:guesses`,
  attempt: (userId: string, g: number) => `u:${userId}:pa:${g}`,
  best: (userId: string) => `u:${userId}:practice`,
};

const LAST_ROUND = ROUNDS - 1;

const int = (s: string | null | undefined): number | null => {
  if (s === undefined || s === null) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
};

const readCounts = async (g: number, r: number): Promise<number[]> => {
  const raw = await redis.hGetAll(keys.counts(g, r));
  const counts = emptyCounts();
  for (const [bucket, count] of Object.entries(raw)) {
    const v = int(bucket);
    if (v !== null && v >= 0 && v <= MAX_VALUE) counts[v] = int(count) ?? 0;
  }
  return counts;
};

export const listPractice = async (): Promise<PracticeGameInfo[]> => {
  const userId = context.userId;
  const bests = userId ? await redis.hGetAll(keys.best(userId)) : {};
  return Promise.all(
    PRACTICE_GAMES.map(async (g) => ({
      id: g.id,
      title: g.title,
      blurb: g.blurb,
      best: int(bests[String(g.id)]),
      players: await redis.hLen(keys.guesses(g.id, LAST_ROUND)),
    }))
  );
};

/** Scores one practice round; on the last round, also updates the player's best. */
export const practiceGuess = async (
  game: number,
  round: number,
  value: number
): Promise<PracticeRoundResponse> => {
  const g = practiceGame(game);
  if (!g || round < 0 || round >= g.prompts.length) {
    throw new GameError('Unknown practice round.');
  }
  const userId = context.userId;

  // The player's guess as it sits in the crowd (their first attempt), if any.
  let own: number | null = null;
  if (userId) {
    const first = await redis.hSetNX(
      keys.guesses(game, round),
      userId,
      String(value)
    );
    if (first === 1) {
      await redis.hIncrBy(keys.counts(game, round), String(value), 1);
      own = value;
    } else {
      own = int(await redis.hGet(keys.guesses(game, round), userId));
    }
    if (round === 0) await redis.del(keys.attempt(userId, game));
    await redis.hSet(keys.attempt(userId, game), {
      [String(round)]: String(value),
    });
  }

  const counts = await readCounts(game, round);
  const o = outcome(counts, practiceWarmup(game, round), value, own);
  const result = {
    count: total(counts),
    median: o.median,
    bins: toBins(counts),
    warmup: o.warmup,
    warmupBins: o.warmupBins,
    score: o.score,
    bullseye: o.bullseye,
  };

  let best: number | null = null;
  if (userId && round === LAST_ROUND) {
    best = await settleAttempt(userId, game);
  }
  return { type: 'practice-round', result, best };
};

/** Totals the player's current attempt (all rounds) and keeps the best. */
const settleAttempt = async (
  userId: string,
  game: number
): Promise<number | null> => {
  const attempt = await redis.hGetAll(keys.attempt(userId, game));
  let sum = 0;
  for (let r = 0; r < ROUNDS; r++) {
    const guess = int(attempt[String(r)]);
    if (guess === null) return null; // skipped rounds: not a full attempt
    const [counts, ownRaw] = await Promise.all([
      readCounts(game, r),
      redis.hGet(keys.guesses(game, r), userId),
    ]);
    sum +=
      outcome(counts, practiceWarmup(game, r), guess, int(ownRaw)).score ?? 0;
  }
  const prev = int(await redis.hGet(keys.best(userId), String(game)));
  const best = prev === null ? sum : Math.max(prev, sum);
  await redis.hSet(keys.best(userId), { [String(game)]: String(best) });
  return best;
};
