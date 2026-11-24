// Mocks /api/state and /api/guess. Pick a scenario with ?s=fresh|new|mid|played|closed|few|out
import '../src/client/index.css';
import { createRoot } from 'react-dom/client';
import { App } from '../src/client/App';
import { buildPreviewState, initialGuesses } from './scenarios';

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
