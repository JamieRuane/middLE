// Mocks /api/state and /api/guess. Pick a scenario with ?s=fresh|new|played|closed|few|out
import '../src/client/index.css';
import { createRoot } from 'react-dom/client';
import { App } from '../src/client/App';
import type { StateResponse } from '../src/shared/api';
import { buildPreviewState } from './scenarios';

const scenario = new URLSearchParams(location.search).get('s') ?? 'fresh';
let state: StateResponse = buildPreviewState(scenario, null);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  await new Promise((r) => setTimeout(r, 250));
  if (url.endsWith('/api/guess')) {
    const body: unknown = JSON.parse(String(init?.body ?? '{}'));
    const value = typeof body === 'object' && body !== null && 'value' in body ? Number(body.value) : 50;
    state = buildPreviewState(scenario, value);
  }
  return new Response(JSON.stringify(state), { headers: { 'Content-Type': 'application/json' } });
};

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
