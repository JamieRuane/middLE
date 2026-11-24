// Mocks /api/state and /api/guess. Pick a scenario with ?s=fresh|new|mid|played|closed|few|out
import '../src/client/index.css';
import { createRoot } from 'react-dom/client';
import { App } from '../src/client/App';
import { buildPreviewState, initialGuesses } from './scenarios';

const scenario = new URLSearchParams(location.search).get('s') ?? 'fresh';
const guesses = initialGuesses(scenario);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  await new Promise((r) => setTimeout(r, 200));
  if (String(input).endsWith('/api/guess')) {
    const body: unknown = JSON.parse(String(init?.body ?? '{}'));
    if (typeof body === 'object' && body !== null && 'round' in body && 'value' in body) {
      guesses[Number(body.round)] = Number(body.value);
    }
  }
  const state = buildPreviewState(scenario, guesses);
  return new Response(JSON.stringify(state), { headers: { 'Content-Type': 'application/json' } });
};

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
