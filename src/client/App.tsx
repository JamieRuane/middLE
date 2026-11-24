import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { navigateTo } from '@devvit/web/client';
import type { ErrorResponse, RoundResult, StateResponse, Stats } from '../shared/api';
import { ROUNDS, formatValue } from '../shared/prompts';
import type { Prompt } from '../shared/prompts';
import { BIN_COUNT, MAX_VALUE } from '../shared/score';

const MAX_TOTAL = ROUNDS * 100;

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

  const guess = useCallback(async (round: number, value: number) => {
    setSubmitting(true);
    setNotice(null);
    try {
      const state = await request('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round, value }),
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

const plural = (n: number, one: string, many = `${one}s`): string =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

// ---------- pieces ----------

const Wordmark = () => (
  <span className="wordmark" aria-label="middLE">
    midd<span className="wordmark-le">LE</span>
  </span>
);

const Header = ({ state }: { state: StateResponse }) => (
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
);

const RoundDots = ({ current, done }: { current: number; done: number }) => (
  <div className="rounds" aria-label={`Round ${current + 1} of ${ROUNDS}`}>
    <span className="rounds-label">
      Round {current + 1}
      <span className="muted"> / {ROUNDS}</span>
    </span>
    <span className="dots" aria-hidden="true">
      {Array.from({ length: ROUNDS }, (_, i) => (
        <span
          key={i}
          className={`dot${i < done ? ' is-done' : ''}${i === current ? ' is-current' : ''}`}
        />
      ))}
    </span>
  </div>
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

// Before you finish: the crowd is there, but its shape is hidden.
const GHOST = [2, 3, 4, 6, 9, 13, 18, 24, 31, 38, 44, 48, 46, 40, 32, 24, 16, 10, 6, 3];

const HiddenCrowd = ({ players }: { players: number }) => (
  <div className="hist is-hidden">
    {GHOST.map((h, i) => (
      <div key={i} className="hist-bar" style={{ height: `${h * 2}%` }} />
    ))}
    <p className="hidden-note">
      {players === 0
        ? 'Nobody’s finished yet. Be the first.'
        : `${plural(players, 'player')} in · revealed after round ${ROUNDS}`}
    </p>
  </div>
);

const Histogram = ({
  result,
  guess,
  prompt,
}: {
  result: RoundResult;
  guess: number | null;
  prompt: Prompt;
}) => {
  const max = Math.max(1, ...result.bins);
  const width = MAX_VALUE / BIN_COUNT;
  const mineBin = guess === null ? -1 : Math.min(BIN_COUNT - 1, Math.floor(guess / width));
  return (
    <div className="hist" aria-hidden="true">
      {result.bins.map((count, i) => (
        <div
          key={i}
          className={`hist-bar${i === mineBin ? ' is-mine' : ''}`}
          style={{ height: `${count === 0 ? 3 : Math.max(8, (count / max) * 100)}%` }}
        />
      ))}
      {result.median !== null && (
        <div className="median-line" style={{ left: `${result.median}%` }}>
          <span>median {formatValue(prompt, result.median)}</span>
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

// ---------- screens ----------

type GameProps = {
  state: StateResponse;
  loadedAt: number;
  submitting: boolean;
  notice: string | null;
  onGuess: (round: number, value: number) => void;
};

const RoundScreen = ({ state, submitting, notice, onGuess }: GameProps) => {
  const done = state.guesses.filter((g) => g !== null).length;
  const round = Math.min(done, ROUNDS - 1);
  const prompt = state.prompts[round];
  const [draft, setDraft] = useState<number | null>(null);
  const canPlay = state.open && state.loggedIn;
  if (!prompt) return null;
  const last = round === ROUNDS - 1;

  return (
    <main className="app">
      <Header state={state} />

      {round === 0 && canPlay && state.yesterday && (
        <p className="yesterday">
          Yesterday you scored <strong>{state.yesterday.total}</strong> / {MAX_TOTAL}
          {state.yesterday.bullseyes > 0 && ` with ${plural(state.yesterday.bullseyes, 'bullseye')}`}
          .
        </p>
      )}

      <RoundDots current={round} done={done} />

      <h1 className="prompt" key={round}>
        {prompt.text}
      </h1>

      {canPlay && round === 0 && (
        <p className="hint">
          {state.stats.played === 0
            ? `Don’t give your answer. Pin where you think most people will land. ${ROUNDS} rounds, then the reveal.`
            : 'Guess the crowd, not the answer.'}
        </p>
      )}

      <div className="field">
        <HiddenCrowd players={state.players} />
        <Track
          key={round}
          prompt={prompt}
          value={draft}
          onChange={canPlay && !submitting ? setDraft : null}
        />
      </div>

      {canPlay ? (
        <div className="actions">
          <button
            type="button"
            className="lock"
            disabled={draft === null || submitting}
            onClick={() => {
              if (draft === null) return;
              onGuess(round, draft);
              setDraft(null);
            }}
          >
            {submitting
              ? 'Locking in…'
              : draft === null
                ? 'Tap the line to place your pin'
                : last
                  ? `Lock in ${formatValue(prompt, draft)} & reveal`
                  : `Lock in ${formatValue(prompt, draft)}`}
          </button>
          {notice && <p className="notice">{notice}</p>}
        </div>
      ) : (
        <p className="notice">Log in to Reddit to play today’s middLE.</p>
      )}
    </main>
  );
};

const RoundDetail = ({
  state,
  round,
  onBack,
}: {
  state: StateResponse;
  round: number;
  onBack: () => void;
}) => {
  const prompt = state.prompts[round];
  const result = state.results?.[round];
  const guess = state.guesses[round] ?? null;
  if (!prompt || !result) return null;
  return (
    <main className="app">
      <header className="top">
        <button type="button" className="back" onClick={onBack}>
          ← All rounds
        </button>
        <span className="meta-chip">
          Round {round + 1} / {ROUNDS}
        </span>
      </header>
      <h1 className="prompt">{prompt.text}</h1>
      <div className="field">
        <Histogram result={result} guess={guess} prompt={prompt} />
        <Track prompt={prompt} value={guess} onChange={null} />
      </div>
      <p className="detail-line">
        {result.median !== null && (
          <>
            <span className="label">Median</span> <strong>{formatValue(prompt, result.median)}</strong>
          </>
        )}
        {guess !== null && (
          <>
            {' · '}
            <span className="label">You</span> <strong>{formatValue(prompt, guess)}</strong>
          </>
        )}
        {result.score !== null && (
          <>
            {' · '}
            <strong>{result.score} pts</strong>
            {result.bullseye && <span className="badge inline">Bullseye</span>}
          </>
        )}
      </p>
      <p className="muted small">{plural(result.count, 'guess', 'guesses')}</p>
    </main>
  );
};

const Summary = ({ state, loadedAt }: GameProps) => {
  const [selected, setSelected] = useState<number | null>(null);
  const countdown = useCountdown(state.msToReset, loadedAt);

  if (selected !== null) {
    return <RoundDetail state={state} round={selected} onBack={() => setSelected(null)} />;
  }

  const results = state.results ?? [];
  const bullseyes = results.filter((r) => r.bullseye).length;
  const few = state.open && state.players < 5;

  return (
    <main className="app">
      <Header state={state} />

      <section className="total" aria-live="polite">
        {state.total !== null ? (
          <>
            <div className="total-score">
              <span className="score-num">{state.total}</span>
              <span className="score-of">/ {MAX_TOTAL}</span>
            </div>
            <div className="total-meta">
              <span className="score-unit">{state.open ? 'Score so far' : 'Final score'}</span>
              {bullseyes > 0 && <span className="badge">{plural(bullseyes, 'bullseye')}</span>}
              <span className="muted small">
                {few
                  ? `Only ${plural(state.players, 'player')} so far. Medians will move.`
                  : plural(state.players, 'player')}
                {state.open ? ` · final in ${countdown}` : ''}
              </span>
            </div>
          </>
        ) : (
          <div className="total-meta">
            <span className="score-unit">
              {state.open ? 'Log in to play' : 'You sat this one out'}
            </span>
            <span className="muted small">{plural(state.players, 'player')} · final results</span>
          </div>
        )}
      </section>

      <ol className="round-list">
        {state.prompts.map((prompt, i) => {
          const r = results[i];
          const g = state.guesses[i] ?? null;
          return (
            <li key={i}>
              <button type="button" className="round-row" onClick={() => setSelected(i)}>
                <span className="round-num">{i + 1}</span>
                <span className="round-body">
                  <span className="round-text">{prompt.text}</span>
                  <span className="round-sub">
                    {g !== null && <>you {formatValue(prompt, g)} · </>}
                    {r?.median != null ? <>median {formatValue(prompt, r.median)}</> : 'no guesses'}
                  </span>
                </span>
                <span className={`round-score${r?.bullseye ? ' is-bull' : ''}`}>
                  {r?.score ?? '–'}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <footer className="after">
        <StatsRow stats={state.stats} />
        {state.todayUrl ? (
          <button type="button" className="next" onClick={() => navigateTo(state.todayUrl ?? '')}>
            Play today’s middLE →
          </button>
        ) : (
          <p className="discuss">Tap a round to see the crowd. Disagree? Say so in the comments.</p>
        )}
      </footer>
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

  const { state, loadedAt } = load;
  const props: GameProps = {
    state,
    loadedAt,
    submitting,
    notice,
    onGuess: (round, value) => void guess(round, value),
  };
  const playing = state.open && state.total === null && state.loggedIn;
  const loggedOutToday = state.open && !state.loggedIn;
  return playing || loggedOutToday ? (
    <RoundScreen key={`${state.day}-play`} {...props} />
  ) : (
    <Summary key={`${state.day}-summary`} {...props} />
  );
};
