import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyCounts,
  isBullseye,
  median,
  percentileBeaten,
  score,
  toBins,
  clampGuess,
} from '../src/shared/score.ts';
import {
  addDays,
  dayNumber,
  msUntilNextDay,
  today,
} from '../src/shared/day.ts';
import {
  PROMPTS,
  ROUNDS,
  formatValue,
  promptsForDayNumber,
} from '../src/shared/prompts.ts';

const countsOf = (...guesses: number[]) => {
  const c = emptyCounts();
  for (const g of guesses) c[g] = (c[g] ?? 0) + 1;
  return c;
};

test('median: empty, odd and even', () => {
  assert.equal(median(emptyCounts()), null);
  assert.equal(median(countsOf(10, 50, 90)), 50);
  assert.equal(median(countsOf(10, 20, 60, 90)), 40);
  assert.equal(median(countsOf(0, 0, 100)), 0);
});

test('score: 2 points per unit, floored at 0', () => {
  assert.equal(score(50, 50), 100);
  assert.equal(score(45, 50), 90);
  assert.equal(score(0, 100), 0);
  assert.equal(score(40, 40.5), 99);
});

test('bullseye within 2', () => {
  assert.equal(isBullseye(48, 50), true);
  assert.equal(isBullseye(47, 50), false);
});

test('percentile counts only other players who were further away', () => {
  const c = countsOf(50, 40, 60, 10, 90);
  assert.equal(percentileBeaten(c, 50, 50), 100);
  assert.equal(percentileBeaten(c, 10, 50), 0);
  assert.equal(percentileBeaten(countsOf(30), 30, 30), 100);
});

test('bins hold every guess, with 100 in the last bin', () => {
  const bins = toBins(countsOf(0, 4, 5, 99, 100));
  assert.equal(bins.length, 20);
  assert.equal(bins[0], 2);
  assert.equal(bins[1], 1);
  assert.equal(bins[19], 2);
});

test('clampGuess rejects junk', () => {
  assert.equal(clampGuess(42.4), 42);
  assert.equal(clampGuess(-1), null);
  assert.equal(clampGuess(101), null);
  assert.equal(clampGuess('50'), null);
  assert.equal(clampGuess(Number.NaN), null);
});

test('day helpers', () => {
  assert.equal(dayNumber('2026-11-24'), 1);
  assert.equal(dayNumber('2026-12-08'), 15);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(today(new Date('2026-11-24T23:59:59Z')), '2026-11-24');
  assert.equal(msUntilNextDay(new Date('2026-11-24T23:00:00Z')), 3_600_000);
});

test('every prompt formats both ends and cycles', () => {
  for (const p of PROMPTS) {
    assert.ok(formatValue(p, 0).length > 0);
    assert.ok(formatValue(p, 100).length > 0);
  }
});

test('each day gets ROUNDS prompts, no repeats within a cycle, same for everyone', () => {
  const perCycle = Math.floor(PROMPTS.length / ROUNDS);
  assert.ok(perCycle >= 10, `only ${perCycle} days before prompts repeat`);
  for (const start of [1, 1 + perCycle, 1 + 5 * perCycle]) {
    const seen = new Set();
    for (let n = start; n < start + perCycle; n++) {
      const day = promptsForDayNumber(n);
      assert.equal(day.length, ROUNDS);
      for (const p of day) {
        assert.ok(!seen.has(p), `repeat on day ${n}: ${p.text}`);
        seen.add(p);
      }
    }
  }
  assert.deepEqual(promptsForDayNumber(7), promptsForDayNumber(7));
  assert.notDeepEqual(
    promptsForDayNumber(1),
    promptsForDayNumber(1 + perCycle)
  );
  assert.equal(promptsForDayNumber(0).length, ROUNDS);
});

test('value formatting', () => {
  const evening = PROMPTS.find((p) => p.unit === 'time');
  assert.ok(evening);
  assert.equal(formatValue(evening, 0), '3:00pm');
  assert.equal(formatValue(evening, 50), '6:00pm');
  const temp = PROMPTS.find((p) => p.text.startsWith('Ideal indoor'));
  assert.ok(temp);
  assert.equal(formatValue(temp, 40), '21°C');
});

test('share text is spoiler-free: score, emoji per round, optional streak', async () => {
  const { shareText, shareGrid, toneFor } =
    await import('../src/shared/share.ts');
  assert.equal(toneFor(98, true), 'bull');
  assert.equal(toneFor(85, false), 'great');
  assert.equal(toneFor(65, false), 'good');
  assert.equal(toneFor(40, false), 'meh');
  assert.equal(toneFor(39, false), 'low');
  const rounds = [
    { score: 98, bullseye: true },
    { score: 86, bullseye: false },
    { score: 8, bullseye: false },
    { score: 40, bullseye: false },
    { score: 70, bullseye: false },
  ];
  assert.equal(shareGrid(rounds), '🎯 🟩 🟥 🟧 🟨');
  assert.equal(
    shareText({
      number: 3,
      total: 302,
      maxTotal: 500,
      rounds,
      streak: 4,
      final: false,
    }),
    '**middLE #3**: 302 / 500 (so far)\n\n🎯 🟩 🟥 🟧 🟨\n\n🔥 4-day streak'
  );
  assert.equal(
    shareText({
      number: 3,
      total: 302,
      maxTotal: 500,
      rounds,
      streak: 1,
      final: true,
    }),
    '**middLE #3**: 302 / 500\n\n🎯 🟩 🟥 🟧 🟨'
  );
});

test('weighted median handles fractional warm-up counts', () => {
  const c = emptyCounts();
  c[10] = 0.5;
  c[20] = 0.5;
  assert.equal(median(c), 15);
  c[30] = 2;
  assert.equal(median(c), 30);
});

test('warm-up crowd: 30 seeded guesses near the expected answer, same every time', async () => {
  const { WARMUP_SIZE, warmupCounts, warmupsForDayNumber, expectedPosition } =
    await import('../src/shared/crowd.ts');
  for (const p of PROMPTS) {
    const w = warmupCounts(p, 7);
    assert.equal(
      w.reduce((a, b) => a + b, 0),
      WARMUP_SIZE
    );
    assert.deepEqual(warmupCounts(p, 7), w, 'deterministic');
    const m = median(w);
    assert.ok(
      m !== null && Math.abs(m - expectedPosition(p)) <= p.spread,
      p.text
    );
  }
  const day = warmupsForDayNumber(4);
  assert.equal(day.length, ROUNDS);
});

test('outcome: your own guess is excluded and the warm-up fades as players arrive', async () => {
  const { outcome, warmupWeight, WARMUP_SIZE } =
    await import('../src/shared/crowd.ts');
  const warm = emptyCounts();
  warm[40] = WARMUP_SIZE; // warm-up crowd all at 40

  // First player at 90: scored against the warm-up (40), not against themselves.
  const first = outcome(countsOf(90), warm, 90);
  assert.equal(first.median, 40);
  assert.equal(first.score, 0);
  assert.equal(first.warmup, 30);

  // Same guess, but someone else also said 90: still the warm-up dominates.
  assert.equal(outcome(countsOf(90, 90), warm, 90).median, 40);

  // Fading: 15 other players leaves 15 warm-up guesses; 30 removes it entirely.
  assert.equal(warmupWeight(15), 0.5);
  assert.equal(warmupWeight(30), 0);
  assert.equal(warmupWeight(45), 0);
  const thirtyOthers = countsOf(...new Array(30).fill(70), 10);
  const late = outcome(thirtyOthers, warm, 10);
  assert.equal(late.warmup, 0);
  assert.equal(late.median, 70);

  // Spectators (no guess) see everyone plus the warm-up.
  assert.equal(outcome(countsOf(90), warm, null).score, null);
});

test('practice: 3 fixed games of 5, never in the daily pool, warm-ups are stable', async () => {
  const { PRACTICE_GAMES, practiceWarmup } =
    await import('../src/shared/practice.ts');
  const { expectedPosition } = await import('../src/shared/crowd.ts');
  assert.equal(PRACTICE_GAMES.length, 3);
  const daily = new Set(PROMPTS.map((p) => p.text));
  const seen = new Set();
  for (const g of PRACTICE_GAMES) {
    assert.equal(g.prompts.length, ROUNDS);
    for (const [r, p] of g.prompts.entries()) {
      assert.ok(
        !daily.has(p.text),
        `practice prompt also in daily pool: ${p.text}`
      );
      assert.ok(!seen.has(p.text), `duplicate practice prompt: ${p.text}`);
      seen.add(p.text);
      const pos = expectedPosition(p);
      assert.ok(pos >= 0 && pos <= 100, p.text);
      assert.ok(formatValue(p, 0).length > 0 && formatValue(p, 100).length > 0);
      assert.deepEqual(practiceWarmup(g.id, r), practiceWarmup(g.id, r));
      assert.equal(
        practiceWarmup(g.id, r).reduce((a, b) => a + b, 0),
        30
      );
    }
  }
  assert.equal(seen.size, 15);
});

test('outcome: a practice replay is scored without removing someone else’s guess', async () => {
  const { outcome } = await import('../src/shared/crowd.ts');
  const real = countsOf(...new Array(30).fill(50), 20); // 30 others at 50, my first attempt at 20
  const replay = outcome(real, emptyCounts(), 80, 20); // now guessing 80; my stored guess is 20
  assert.equal(replay.median, 50);
  assert.equal(replay.score, 40);
});

test('beatPercent: share of other finishers with a lower total', async () => {
  const { beatPercent, MAX_DAILY_TOTAL } =
    await import('../src/shared/score.ts');
  const hist = (...totals: number[]) => {
    const h = new Array(MAX_DAILY_TOTAL + 1).fill(0);
    for (const t of totals) h[t] += 1;
    return h;
  };
  assert.equal(beatPercent(hist(300), 300), null); // only you
  assert.equal(beatPercent(hist(100, 200, 300, 400, 500), 300), 50); // 2 of 4 others lower
  assert.equal(beatPercent(hist(100, 300, 300), 300), 50); // ties don't count as beaten
  assert.equal(beatPercent(hist(450, 100, 200), 450), 100);
  assert.equal(beatPercent(hist(0, 100, 200), 0), 0);
});

test('share text includes "better than" when known', async () => {
  const { shareText } = await import('../src/shared/share.ts');
  const rounds = [
    { score: 98, bullseye: true },
    { score: 86, bullseye: false },
    { score: 8, bullseye: false },
    { score: 40, bullseye: false },
    { score: 70, bullseye: false },
  ];
  assert.equal(
    shareText({
      number: 3,
      total: 302,
      maxTotal: 500,
      rounds,
      streak: 4,
      beat: 72,
      final: false,
    }),
    '**middLE #3**: 302 / 500 (so far)\n\n🎯 🟩 🟥 🟧 🟨\n\n📊 Better than 72% of players today · 🔥 4-day streak'
  );
  assert.equal(
    shareText({
      number: 3,
      total: 302,
      maxTotal: 500,
      rounds,
      streak: 1,
      beat: null,
      final: false,
    }),
    '**middLE #3**: 302 / 500 (so far)\n\n🎯 🟩 🟥 🟧 🟨'
  );
});
