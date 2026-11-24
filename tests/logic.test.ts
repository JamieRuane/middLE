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
import { addDays, dayNumber, msUntilNextDay, today } from '../src/shared/day.ts';
import { PROMPTS, ROUNDS, formatValue, promptsForDayNumber } from '../src/shared/prompts.ts';

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
  assert.notDeepEqual(promptsForDayNumber(1), promptsForDayNumber(1 + perCycle));
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
