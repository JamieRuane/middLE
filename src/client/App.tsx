import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { navigateTo } from '@devvit/web/client';
import type { ErrorResponse, Results, StateResponse, Stats } from '../shared/api';
import { formatValue } from '../shared/prompts';
import type { Prompt } from '../shared/prompts';
import { BIN_COUNT, MAX_VALUE } from '../shared/score';

// ---------- data ----------

type Load =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; state: StateResponse; loadedAt: number };

const hasType = (x: unknown, type: string): boolean =>
  typeof x === 'object' && x !== null && 'type' in x && x.type === type;
const isState = (x: unknown): x is StateResponse => hasType(x, 'state');
const isError = (x: unknown): x is ErrorResponse => hasType(x, 'error');

const request = async (path: string, init?: RequestInit): Promise<StateResponse> => {
  const res = await fetch(path, init);
  const data: unknown = await res.json().catch(() => null);
  if (isState(data)) return data;
  if (isError(data)) throw new Error(data.message);
  throw new Error('Something went wrong. Try again.');
};

const useGame = () => {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadState = useCallback(
    (isCurrent: () => boolean) =>
      request('/api/state').then(
        (state) => {
          if (isCurrent()) setLoad({ kind: 'ready', state, loadedAt: Date.now() });
        },
        (e: unknown) => {
          if (isCurrent())
            setLoad({ kind: 'error', message: e instanceof Error ? e.message : 'Couldn’t load.' });
        }
      ),
    []
  );

  useEffect(() => {
    let current = true;
    void loadState(() => current);
    return () => {
      current = false;
    };
  }, [loadState]);

  const refresh = useCallback(() => {
    setLoad({ kind: 'loading' });
    void loadState(() => true);
  }, [loadState]);

  const guess = useCallback(async (value: number) => {
    setSubmitting(true);
    setNotice(null);
    try {
      const state = await request('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      setLoad({ kind: 'ready', state, loadedAt: Date.now() });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Couldn’t save your guess.');
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { load, submitting, notice, guess, refresh };
};

const useCountdown = (msToReset: number, loadedAt: number): string => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const left = Math.max(0, msToReset - (now - loadedAt));
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const shortDate = (day: string): string =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

const plural = (n: number, word: string): string =>
  `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

// ---------- pieces ----------

const Wordmark = () => (
  <span className="wordmark" aria-label="middLE">
    midd<span className="wordmark-le">LE</span>
  </span>
);

type TrackProps = {
  prompt: Prompt;
  value: number | null;
  onChange: ((v: number) => void) | null;
};

const clamp = (v: number) => Math.min(MAX_VALUE, Math.max(0, v));

const Track = ({ prompt, value, onChange }: TrackProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const live = onChange !== null;

  const fromX = (clientX: number): number => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width === 0) return 50;
    return Math.round(clamp(((clientX - r.left) / r.width) * MAX_VALUE));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!onChange) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(fromX(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!onChange || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    onChange(fromX(e.clientX));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onChange) return;
    const cur = value ?? 50;
    const step = e.shiftKey ? 10 : 1;
    const next: Record<string, number> = {
      ArrowLeft: cur - step,
      ArrowDown: cur - step,
      ArrowRight: cur + step,
      ArrowUp: cur + step,
      PageDown: cur - 10,
      PageUp: cur + 10,
      Home: 0,
      End: MAX_VALUE,
    };
    const v = next[e.key];
    if (v === undefined) return;
    e.preventDefault();
    onChange(clamp(v));
  };

  const gradient = prompt.gradient
    ? { background: `linear-gradient(90deg, ${prompt.gradient.join(', ')})` }
    : undefined;

  return (
    <div className="track-block">
      <div
        ref={ref}
        className={`track${live ? ' is-live' : ''}`}
        role="slider"
        tabIndex={live ? 0 : -1}
        aria-label={prompt.text}
        aria-valuemin={0}
        aria-valuemax={MAX_VALUE}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value === null ? 'No pin placed' : formatValue(prompt, value)}
        aria-disabled={!live}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
      >
        <div className={`bar${gradient ? ' has-gradient' : ''}`} style={gradient}>
          {[25, 50, 75].map((t) => (
            <span key={t} className="tick" style={{ left: `${t}%` }} />
          ))}
        </div>
        {value !== null && (
          <div className="pin" style={{ left: `${value}%` }}>
            <span className="pin-label">{formatValue(prompt, value)}</span>
            <span className="pin-stem" />
          </div>
        )}
      </div>
      <div className="track-ends">
        <span>{prompt.left}</span>
        <span>{prompt.right}</span>
      </div>
    </div>
  );
};

// Before you guess: the crowd is there, but its shape is hidden.
const GHOST = [2, 3, 4, 6, 9, 13, 18, 24, 31, 38, 44, 48, 46, 40, 32, 24, 16, 10, 6, 3];

const HiddenCrowd = ({ players }: { players: number }) => (
  <div className="hist is-hidden">
    {GHOST.map((h, i) => (
      <div key={i} className="hist-bar" style={{ height: `${h * 2}%` }} />
    ))}
    <p className="hidden-note">
      {players === 0
        ? 'Nobody’s in yet. Be the first pin.'
        : `${plural(players, 'pin')} hidden until you lock in`}
    </p>
  </div>
);

const Histogram = ({
  results,
  guess,
  prompt,
}: {
  results: Results;
  guess: number | null;
  prompt: Prompt;
}) => {
  const max = Math.max(1, ...results.bins);
  const width = MAX_VALUE / BIN_COUNT;
  const mineBin = guess === null ? -1 : Math.min(BIN_COUNT - 1, Math.floor(guess / width));
  return (
    <div className="hist" aria-hidden="true">
      {results.bins.map((count, i) => (
        <div
          key={i}
          className={`hist-bar${i === mineBin ? ' is-mine' : ''}`}
          style={{ height: `${count === 0 ? 3 : Math.max(8, (count / max) * 100)}%` }}
        />
      ))}
      {results.median !== null && (
        <div className="median-line" style={{ left: `${results.median}%` }}>
          <span>median {formatValue(prompt, results.median)}</span>
        </div>
      )}
    </div>
  );
};

const StatsRow = ({ stats }: { stats: Stats }) => (
  <dl className="stats">
    <div>
      <dt>Streak</dt>
      <dd>{stats.streak}</dd>
    </div>
    <div>
      <dt>Best</dt>
      <dd>{stats.bestStreak}</dd>
    </div>
    <div>
      <dt>Bullseyes</dt>
      <dd>{stats.bullseyes}</dd>
    </div>
    <div>
      <dt>Avg</dt>
      <dd>{stats.average ?? '–'}</dd>
    </div>
  </dl>
);

const ResultCard = ({
  state,
  countdown,
}: {
  state: StateResponse;
  countdown: string;
}) => {
  const { results, prompt, guess, open } = state;
  if (!results) return null;
  const { median, count, score, percentile, bullseye } = results;
  const settling = open && count < 5;

  return (
    <section className="result" aria-live="polite">
      {score !== null ? (
        <div className="score">
          <span className="score-num">{score}</span>
          <span className="score-unit">{open ? 'pts so far' : 'pts'}</span>
          {bullseye && <span className="badge">Bullseye</span>}
        </div>
      ) : (
        <div className="score">
          <span className="score-unit">{open ? 'Not played yet' : 'You sat this one out'}</span>
        </div>
      )}
      <div className="result-lines">
        {median !== null && (
          <p>
            <span className="label">{open ? 'Live median' : 'Final median'}</span>{' '}
            <strong>{formatValue(prompt, median)}</strong>
          </p>
        )}
        {guess !== null && (
          <p>
            <span className="label">You said</span> <strong>{formatValue(prompt, guess)}</strong>
            {percentile !== null && count > 1 && <> · closer than {percentile}%</>}
          </p>
        )}
        <p className="muted">
          {settling
            ? `Only ${plural(count, 'guess')} so far. The median will move.`
            : plural(count, 'player')}
          {open ? ` · final in ${countdown}` : ''}
        </p>
      </div>
    </section>
  );
};

// ---------- screens ----------

const Game = ({
  state,
  loadedAt,
  submitting,
  notice,
  onGuess,
}: {
  state: StateResponse;
  loadedAt: number;
  submitting: boolean;
  notice: string | null;
  onGuess: (v: number) => void;
}) => {
  const [draft, setDraft] = useState<number | null>(null);
  const countdown = useCountdown(state.msToReset, loadedAt);
  const canPlay = state.open && state.loggedIn && state.guess === null;
  const firstTime = state.stats.played === 0;
  const shown = state.guess ?? draft;

  return (
    <main className="app">
      <header className="top">
        <Wordmark />
        <span className="meta-chip">
          #{state.number} · {shortDate(state.day)}
        </span>
        {state.stats.streak > 0 && (
          <span className="streak" title="Days in a row">
            {state.stats.streak}-day streak
          </span>
        )}
      </header>

      {canPlay && state.yesterday && (
        <p className="yesterday">
          Yesterday: median {state.yesterday.medianLabel}, you said {state.yesterday.guessLabel} ·{' '}
          <strong>{state.yesterday.score} pts</strong>
        </p>
      )}

      <h1 className="prompt">{state.prompt.text}</h1>

      {canPlay && (
        <p className="hint">
          {firstTime
            ? 'Don’t give your answer. Pin where you think most people will land.'
            : 'Guess the crowd, not the answer.'}
        </p>
      )}

      <div className="field">
        {state.results ? (
          <Histogram results={state.results} guess={state.guess} prompt={state.prompt} />
        ) : (
          state.open && <HiddenCrowd players={state.players} />
        )}
        <Track
          prompt={state.prompt}
          value={shown}
          onChange={canPlay && !submitting ? setDraft : null}
        />
      </div>

      {canPlay ? (
        <div className="actions">
          <button
            type="button"
            className="lock"
            disabled={draft === null || submitting}
            onClick={() => draft !== null && onGuess(draft)}
          >
            {submitting
              ? 'Locking in…'
              : draft === null
                ? 'Tap the line to place your pin'
                : `Lock in ${formatValue(state.prompt, draft)}`}
          </button>
          {notice && <p className="notice">{notice}</p>}
        </div>
      ) : (
        <>
          <ResultCard state={state} countdown={countdown} />
          {!state.loggedIn && state.open && (
            <p className="notice">Log in to Reddit to play today’s middLE.</p>
          )}
          <footer className="after">
            <StatsRow stats={state.stats} />
            {state.todayUrl ? (
              <button type="button" className="next" onClick={() => navigateTo(state.todayUrl ?? '')}>
                Play today’s middLE →
              </button>
            ) : (
              <p className="discuss">Think the crowd got it wrong? Say so in the comments.</p>
            )}
          </footer>
        </>
      )}
    </main>
  );
};

export const App = () => {
  const { load, submitting, notice, guess, refresh } = useGame();

  if (load.kind === 'loading') {
    return (
      <main className="app center">
        <Wordmark />
        <p className="muted">Finding the middle…</p>
      </main>
    );
  }
  if (load.kind === 'error') {
    return (
      <main className="app center">
        <Wordmark />
        <p className="notice">{load.message}</p>
        <button type="button" className="next" onClick={refresh}>
          Try again
        </button>
      </main>
    );
  }
  return (
    <Game
      key={`${load.state.day}-${load.state.guess ?? 'none'}`}
      state={load.state}
      loadedAt={load.loadedAt}
      submitting={submitting}
      notice={notice}
      onGuess={(v) => void guess(v)}
    />
  );
};
