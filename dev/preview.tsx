// Mocks /api/state and /api/guess. Pick a scenario with ?s=fresh|new|mid|played|closed|few|out
import '../src/client/index.css';
import { createRoot } from 'react-dom/client';
import { App } from '../src/client/App';
import { buildPreviewState, crowd, initialGuesses } from './scenarios';
import {
  PRACTICE_GAMES,
  practiceGame,
  practiceWarmup,
} from '../src/shared/practice';
import { expectedPosition, outcome } from '../src/shared/crowd';
import { toBins, total } from '../src/shared/score';

const scenario = new URLSearchParams(location.search).get('s') ?? 'fresh';
const guesses = initialGuesses(scenario);
let shared = false;

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  await new Promise((r) => setTimeout(r, 200));
  if (String(input).endsWith('/api/guess')) {
    const body: unknown = JSON.parse(String(init?.body ?? '{}'));
    if (
      typeof body === 'object' &&
      body !== null &&
      'round' in body &&
      'value' in body
    ) {
      guesses[Number(body.round)] = Number(body.value);
    }
  }
  const url = String(input);
  if (url.endsWith('/api/practice')) {
    const games = PRACTICE_GAMES.map((g) => ({
      id: g.id,
      title: g.title,
      blurb: g.blurb,
      best: g.id === 0 ? 412 : null,
      players: 230,
    }));
    return new Response(JSON.stringify({ type: 'practice-list', games }));
  }
  if (url.endsWith('/api/practice/guess')) {
    const b: unknown = JSON.parse(String(init?.body ?? '{}'));
    const pick = (k: string) =>
      typeof b === 'object' && b !== null && k in b
        ? Number((b as Record<string, unknown>)[k])
        : 0;
    const [game, round, value] = [pick('game'), pick('round'), pick('value')];
    const prompt = practiceGame(game)?.prompts[round];
    const counts = crowd(
      new URLSearchParams(location.search).has('emptyPractice') ? 0 : 230,
      prompt ? expectedPosition(prompt) : 50,
      game * 10 + round + 3
    );
    counts[value] = (counts[value] ?? 0) + 1;
    const o = outcome(counts, practiceWarmup(game, round), value);
    const result = {
      count: total(counts),
      median: o.median,
      bins: toBins(counts),
      warmup: o.warmup,
      warmupBins: o.warmupBins,
      score: o.score,
      bullseye: o.bullseye,
    };
    return new Response(
      JSON.stringify({
        type: 'practice-round',
        result,
        best: round === 4 ? 380 : null,
      })
    );
  }
  if (String(input).endsWith('/api/share')) {
    if (new URLSearchParams(location.search).has('shareFail')) {
      return new Response(
        JSON.stringify({
          type: 'error',
          message: 'Couldn’t post your comment. Try again.',
        }),
        { status: 500 }
      );
    }
    shared = true;
  }
  const state = buildPreviewState(scenario, guesses, shared);
  return new Response(JSON.stringify(state), {
    headers: { 'Content-Type': 'application/json' },
  });
};

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
