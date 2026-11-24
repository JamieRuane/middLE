import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { navigateTo } from '@devvit/web/client';
import type {
  ErrorResponse,
  PracticeGameInfo,
  PracticeListResponse,
  PracticeRoundResponse,
  RoundResult,
  StateResponse,
  Stats,
} from '../shared/api';
import { ROUNDS, formatValue } from '../shared/prompts';
import type { Prompt } from '../shared/prompts';
import { BIN_COUNT, MAX_VALUE } from '../shared/score';
import { shareGrid, toneFor } from '../shared/share';
import { WARMUP_SIZE } from '../shared/crowd';
import { PRACTICE_GAMES } from '../shared/practice';
import type { PracticeGame } from '../shared/practice';
import type { Tone } from '../shared/share';

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

const request = async (
  path: string,
  init?: RequestInit
): Promise<StateResponse> => {
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
          if (isCurrent())
            setLoad({ kind: 'ready', state, loadedAt: Date.now() });
        },
        (e: unknown) => {
          if (isCurrent())
            setLoad({
              kind: 'error',
              message: e instanceof Error ? e.message : 'Couldn’t load.',
            });
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

  /** Resolves true when the guess was saved. */
  const guess = useCallback(
    async (round: number, value: number): Promise<boolean> => {
      setSubmitting(true);
      setNotice(null);
      try {
        const state = await request('/api/guess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ round, value }),
        });
        setLoad({ kind: 'ready', state, loadedAt: Date.now() });
        return true;
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Couldn’t save your guess.');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const share = useCallback(async () => {
    setSubmitting(true);
    setNotice(null);
    try {
      const state = await request('/api/share', { method: 'POST' });
      setLoad({ kind: 'ready', state, loadedAt: Date.now() });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Couldn’t post your comment.');
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { load, submitting, notice, guess, share, refresh };
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
        aria-valuetext={
          value === null ? 'No pin placed' : formatValue(prompt, value)
        }
        aria-disabled={!live}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
      >
        <div
          className={`bar${gradient ? ' has-gradient' : ''}`}
          style={gradient}
        >
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
const GHOST = [
  2, 3, 4, 6, 9, 13, 18, 24, 31, 38, 44, 48, 46, 40, 32, 24, 16, 10, 6, 3,
];

const HiddenCrowd = ({ players, note }: { players: number; note?: string }) => (
  <div className="hist is-hidden">
    {GHOST.map((h, i) => (
      <div key={i} className="hist-bar" style={{ height: `${h * 2}%` }} />
    ))}
    <p className="hidden-note">
      {note ??
        (players === 0
          ? 'Nobody’s finished yet. Be the first.'
          : `${plural(players, 'player')} in · revealed after round ${ROUNDS}`)}
    </p>
  </div>
);

const Histogram = ({
  result,
  guess,
  prompt,
  animate = false,
}: {
  result: RoundResult;
  guess: number | null;
  prompt: Prompt;
  /** Staged entrance: bars grow, then the median drops in, then the gap to your pin stretches. */
  animate?: boolean;
}) => {
  const stacked = result.bins.map((c, i) => c + (result.warmupBins[i] ?? 0));
  const max = Math.max(1, ...stacked);
  const width = MAX_VALUE / BIN_COUNT;
  const mineBin =
    guess === null ? -1 : Math.min(BIN_COUNT - 1, Math.floor(guess / width));
  const med = result.median;
  return (
    <div className={`hist${animate ? ' is-animated' : ''}`} aria-hidden="true">
      {result.bins.map((real, i) => {
        const warm = result.warmupBins[i] ?? 0;
        const all = real + warm;
        return (
          // Each bar stacks real guesses (solid) under warm-up guesses (striped).
          <div
            key={i}
            className={`hist-bar is-stack${i === mineBin ? ' is-mine' : ''}`}
            style={{
              height: `${all < 0.05 ? 3 : Math.max(8, (all / max) * 100)}%`,
              animationDelay: `${i * 28}ms`,
            }}
          >
            {warm >= 0.05 && (
              <span className="hist-warm" style={{ flexGrow: warm }} />
            )}
            {(real > 0 || all < 0.05) && (
              <span
                className="hist-real"
                style={{ flexGrow: real > 0 ? real : 1 }}
              />
            )}
          </div>
        );
      })}
      {med !== null && (
        <div className="median-line" style={{ left: `${med}%` }}>
          <span>median {formatValue(prompt, med)}</span>
        </div>
      )}
      {animate &&
        med !== null &&
        guess !== null &&
        Math.abs(guess - med) >= 1 && (
          <div
            className={`gap ${guess < med ? 'from-left' : 'from-right'}`}
            style={{
              left: `${Math.min(guess, med)}%`,
              width: `${Math.abs(guess - med)}%`,
            }}
          />
        )}
    </div>
  );
};

// ---------- round reveal ----------

const REVEAL_START = 1100; // ms: score starts counting once the crowd has drawn in
const REVEAL_COUNT = 900; // ms: count-up duration

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const useCountUp = (target: number, delay: number, duration: number) => {
  const [reduce] = useState(prefersReducedMotion);
  const [value, setValue] = useState(reduce ? target : 0);
  const [landed, setLanded] = useState(reduce);

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / duration));
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setLanded(true);
    };
    raf = requestAnimationFrame(tick);
    // rAF pauses in background tabs; make sure the final score always lands.
    const fallback = window.setTimeout(
      () => {
        setValue(target);
        setLanded(true);
      },
      delay + duration + 80
    );
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
    };
  }, [target, delay, duration, reduce]);

  return { value, landed };
};

const TIER_LABELS: Record<Tone, string> = {
  bull: 'Bullseye!',
  great: 'So close',
  good: 'Solid read',
  meh: 'Off the pace',
  low: 'Lone wolf',
};

const tierFor = (
  score: number,
  bullseye: boolean
): { label: string; tone: Tone } => {
  const tone = toneFor(score, bullseye);
  return { label: TIER_LABELS[tone], tone };
};

const BURST_COLOURS = [
  'var(--accent)',
  'var(--sun)',
  'var(--mint)',
  'var(--grape)',
  'var(--sky)',
];

/** A small confetti pop around the score for great rounds. */
const Burst = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const anims = Array.from(el.children).map((child, i) => {
      const angle = (i / el.children.length) * 360 + (i % 2) * 12;
      const dist = 38 + (i % 3) * 14;
      return child.animate(
        [
          {
            transform: `rotate(${angle}deg) translateY(0) scale(1)`,
            opacity: 1,
          },
          {
            transform: `rotate(${angle}deg) translateY(-${dist}px) scale(0.4)`,
            opacity: 0,
          },
        ],
        {
          duration: 700,
          easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)',
          fill: 'forwards',
        }
      );
    });
    return () => anims.forEach((a) => a.cancel());
  }, []);
  return (
    <div className="burst" ref={ref} aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          style={{ background: BURST_COLOURS[i % BURST_COLOURS.length] }}
        />
      ))}
    </div>
  );
};

type RevealViewProps = {
  /** Header row (daily header or practice header). */
  top: ReactNode;
  round: number;
  prompt: Prompt;
  result: RoundResult;
  guess: number;
  runningTotal: number;
  onNext: () => void;
};

/** The animated per-round reveal, shared by daily and practice games. */
const RevealView = ({
  top,
  round,
  prompt,
  result,
  guess,
  runningTotal,
  onNext,
}: RevealViewProps) => {
  const target = result.score ?? 0;
  const { value, landed } = useCountUp(target, REVEAL_START, REVEAL_COUNT);
  const tier = tierFor(target, result.bullseye);
  const last = round === ROUNDS - 1;

  return (
    <main className="app reveal">
      {top}
      <RoundDots current={round} done={round + 1} />
      <h1 className="prompt is-small">{prompt.text}</h1>

      <div className="field">
        <Histogram result={result} guess={guess} prompt={prompt} animate />
        <Track prompt={prompt} value={guess} onChange={null} />
      </div>

      <section
        className={`reveal-score tone-${tier.tone}${landed ? ' is-landed' : ''}`}
        aria-live="polite"
      >
        <div className="reveal-num-wrap">
          {landed && target >= 85 && <Burst />}
          <span className="score-num">{value}</span>
          <span className="score-of">/ 100</span>
        </div>
        <div className="reveal-meta">
          <span className="tier">{landed ? tier.label : ' '}</span>
          <span className="muted small">
            median{' '}
            {result.median === null ? '–' : formatValue(prompt, result.median)}{' '}
            · you {formatValue(prompt, guess)}
            {result.warmup > 0 && ` · +${result.warmup} warm-up`}
          </span>
          <span className={`running${landed ? ' is-shown' : ''}`}>
            Total <strong>{runningTotal}</strong> / {MAX_TOTAL}
          </span>
        </div>
      </section>

      <button type="button" className="lock reveal-next" onClick={onNext}>
        {last ? 'See your total →' : 'Next round →'}
      </button>
    </main>
  );
};

const RevealScreen = ({
  state,
  round,
  onNext,
}: {
  state: StateResponse;
  round: number;
  onNext: () => void;
}) => {
  const prompt = state.prompts[round];
  const result = state.results[round];
  const guess = state.guesses[round] ?? null;
  if (!prompt || !result || guess === null) return null;
  return (
    <RevealView
      top={<Header state={state} />}
      round={round}
      prompt={prompt}
      result={result}
      guess={guess}
      runningTotal={state.results.reduce((sum, r) => sum + (r?.score ?? 0), 0)}
      onNext={onNext}
    />
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
  onShare: () => void;
  onPractice: () => void;
};

const RoundScreen = ({
  state,
  submitting,
  notice,
  onGuess,
  onPractice,
}: GameProps) => {
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
          Yesterday you scored <strong>{state.yesterday.total}</strong> /{' '}
          {MAX_TOTAL}
          {state.yesterday.bullseyes > 0 &&
            ` with ${plural(state.yesterday.bullseyes, 'bullseye')}`}
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
          {done === 0 && draft === null && (
            <button type="button" className="link-btn" onClick={onPractice}>
              New here? Try a practice game first →
            </button>
          )}
        </div>
      ) : (
        <div className="actions">
          <p className="notice">Log in to Reddit to play today’s middLE.</p>
          <button type="button" className="link-btn" onClick={onPractice}>
            Try a practice game →
          </button>
        </div>
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
  const result = state.results[round];
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
            <span className="label">Median</span>{' '}
            <strong>{formatValue(prompt, result.median)}</strong>
          </>
        )}
        {guess !== null && (
          <>
            {' · '}
            <span className="label">You</span>{' '}
            <strong>{formatValue(prompt, guess)}</strong>
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
      <p className="muted small">
        {plural(result.count, 'guess', 'guesses')}
        {result.warmup > 0 &&
          ` + ${result.warmup} warm-up (striped) until ${WARMUP_SIZE} people play`}
      </p>
    </main>
  );
};

/** Posts a spoiler-free result (score + one emoji per round) as a comment from the player's account. */
const ShareRow = ({
  state,
  busy,
  notice,
  onShare,
}: {
  state: StateResponse;
  busy: boolean;
  notice: string | null;
  onShare: () => void;
}) => {
  const grid = shareGrid(
    state.results.map((r) => ({
      score: r?.score ?? 0,
      bullseye: r?.bullseye ?? false,
    }))
  );
  return (
    <div className="share">
      <div className="share-preview" aria-label="What will be posted">
        <span className="share-title">
          #{state.number} · {state.total} / {MAX_TOTAL}
        </span>
        <span className="share-grid">{grid}</span>
      </div>
      {state.shared ? (
        <span className="share-done">Posted ✓</span>
      ) : (
        <button
          type="button"
          className="share-btn"
          disabled={busy}
          onClick={onShare}
        >
          {busy ? 'Posting…' : 'Post to comments'}
        </button>
      )}
      {notice && <p className="notice share-notice">{notice}</p>}
    </div>
  );
};

const Summary = ({
  state,
  loadedAt,
  submitting,
  notice,
  onShare,
  onPractice,
}: GameProps) => {
  const [selected, setSelected] = useState<number | null>(null);
  const countdown = useCountdown(state.msToReset, loadedAt);

  if (selected !== null) {
    return (
      <RoundDetail
        state={state}
        round={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  const results = state.results;
  const bullseyes = results.filter((r) => r?.bullseye).length;
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
              <span className="score-unit">
                {state.open ? 'Score so far' : 'Final score'}
              </span>
              {bullseyes > 0 && (
                <span className="badge">{plural(bullseyes, 'bullseye')}</span>
              )}
              {state.beat !== null ? (
                <span className="beat">
                  Better than <strong>{state.beat}%</strong> of players{' '}
                  {state.open ? 'today' : 'that day'}
                </span>
              ) : (
                state.open && (
                  <span className="beat">
                    <strong>First to finish</strong> today
                  </span>
                )
              )}
              <span className="muted small">
                {few
                  ? `Only ${plural(state.players, 'player')} so far`
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
            <span className="muted small">
              {plural(state.players, 'player')} · final results
            </span>
          </div>
        )}
      </section>

      <ol className="round-list">
        {state.prompts.map((prompt, i) => {
          const r = results[i];
          const g = state.guesses[i] ?? null;
          return (
            <li key={i}>
              <button
                type="button"
                className="round-row"
                onClick={() => setSelected(i)}
              >
                <span className="round-num">{i + 1}</span>
                <span className="round-body">
                  <span className="round-text">{prompt.text}</span>
                  <span className="round-sub">
                    {g !== null && <>you {formatValue(prompt, g)} · </>}
                    {r?.median != null ? (
                      <>median {formatValue(prompt, r.median)}</>
                    ) : (
                      'no guesses'
                    )}
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
        <div className="stats-row">
          <StatsRow stats={state.stats} />
          <button type="button" className="link-btn" onClick={onPractice}>
            Practice →
          </button>
        </div>
        {state.open && state.total !== null && (
          <ShareRow
            state={state}
            busy={submitting}
            notice={notice}
            onShare={onShare}
          />
        )}
        {state.todayUrl ? (
          <button
            type="button"
            className="next"
            onClick={() => navigateTo(state.todayUrl ?? '')}
          >
            Play today’s middLE →
          </button>
        ) : (
          state.total === null && (
            <p className="discuss">Tap a round to see the crowd.</p>
          )
        )}
      </footer>
    </main>
  );
};

// ---------- practice ----------

const isPracticeList = (x: unknown): x is PracticeListResponse =>
  hasType(x, 'practice-list');
const isPracticeRound = (x: unknown): x is PracticeRoundResponse =>
  hasType(x, 'practice-round');

const fetchAs = async <T,>(
  path: string,
  guard: (x: unknown) => x is T,
  init?: RequestInit
): Promise<T> => {
  const res = await fetch(path, init);
  const data: unknown = await res.json().catch(() => null);
  if (guard(data)) return data;
  if (isError(data)) throw new Error(data.message);
  throw new Error('Something went wrong. Try again.');
};

const PracticeMenu = ({
  onBack,
  onPick,
}: {
  onBack: () => void;
  onPick: (game: PracticeGame, best: number | null) => void;
}) => {
  const [info, setInfo] = useState<PracticeGameInfo[] | null>(null);

  useEffect(() => {
    let current = true;
    fetchAs('/api/practice', isPracticeList).then(
      (r) => {
        if (current) setInfo(r.games);
      },
      () => {
        // Bests are extras; the games still work without them.
      }
    );
    return () => {
      current = false;
    };
  }, []);

  return (
    <main className="app">
      <header className="top">
        <button type="button" className="back" onClick={onBack}>
          ← Today’s game
        </button>
        <Wordmark />
      </header>
      <h1 className="prompt">Practice games</h1>
      <p className="hint">
        Three fixed games, the same for everyone. Play as often as you like.
        They never touch your streak.
      </p>
      <ol className="practice-list">
        {PRACTICE_GAMES.map((game) => {
          const best = info?.find((g) => g.id === game.id)?.best ?? null;
          return (
            <li key={game.id}>
              <button
                type="button"
                className="practice-card"
                onClick={() => onPick(game, best)}
              >
                <span className="practice-num">{game.id + 1}</span>
                <span className="practice-body">
                  <span className="practice-title">{game.title}</span>
                  <span className="practice-blurb">{game.blurb}</span>
                </span>
                <span className="practice-best">
                  {best === null ? (
                    <span className="practice-play">Play</span>
                  ) : (
                    <>
                      <strong>{best}</strong>
                      <small>best</small>
                    </>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </main>
  );
};

type PracticePhase = 'play' | 'reveal' | 'done';

const PracticeScreen = ({
  game,
  initialBest,
  onExit,
  onMenu,
}: {
  game: PracticeGame;
  initialBest: number | null;
  onExit: () => void;
  onMenu: () => void;
}) => {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<PracticePhase>('play');
  const [draft, setDraft] = useState<number | null>(null);
  const [guesses, setGuesses] = useState<number[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [best, setBest] = useState<number | null>(initialBest);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prompt = game.prompts[round];
  const total = results.reduce((sum, r) => sum + (r.score ?? 0), 0);
  const top = (
    <header className="top">
      <button type="button" className="back" onClick={onMenu}>
        ← Practice
      </button>
      <span className="meta-chip practice-chip">{game.title}</span>
    </header>
  );

  const lock = async () => {
    if (draft === null) return;
    const value = draft;
    setBusy(true);
    setError(null);
    try {
      const r = await fetchAs('/api/practice/guess', isPracticeRound, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: game.id, round, value }),
      });
      setGuesses((g) => [...g.slice(0, round), value]);
      setResults((rs) => [...rs.slice(0, round), r.result]);
      if (r.best !== null) setBest(r.best);
      setDraft(null);
      setPhase('reveal');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t score that round.');
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (round >= ROUNDS - 1) {
      setPhase('done');
    } else {
      setRound(round + 1);
      setPhase('play');
    }
  };

  const restart = () => {
    setRound(0);
    setGuesses([]);
    setResults([]);
    setDraft(null);
    setPhase('play');
  };

  if (phase === 'reveal') {
    const result = results[round];
    const guess = guesses[round];
    if (prompt && result && guess !== undefined) {
      return (
        <RevealView
          key={round}
          top={top}
          round={round}
          prompt={prompt}
          result={result}
          guess={guess}
          runningTotal={total}
          onNext={next}
        />
      );
    }
  }

  if (phase === 'done') {
    const isBest = best !== null && total >= best;
    return (
      <main className="app">
        {top}
        <section className="total">
          <div className="total-score">
            <span className="score-num">{total}</span>
            <span className="score-of">/ {MAX_TOTAL}</span>
          </div>
          <div className="total-meta">
            <span className="score-unit">Practice score</span>
            {isBest ? (
              <span className="badge">Personal best</span>
            ) : (
              best !== null && (
                <span className="muted small">Your best: {best}</span>
              )
            )}
          </div>
        </section>
        <ol className="round-list">
          {game.prompts.map((p, i) => {
            const r = results[i];
            const g = guesses[i];
            return (
              <li key={i}>
                <div className="round-row is-static">
                  <span className="round-num">{i + 1}</span>
                  <span className="round-body">
                    <span className="round-text">{p.text}</span>
                    <span className="round-sub">
                      {g !== undefined && <>you {formatValue(p, g)} · </>}
                      {r?.median != null && (
                        <>median {formatValue(p, r.median)}</>
                      )}
                    </span>
                  </span>
                  <span
                    className={`round-score${r?.bullseye ? ' is-bull' : ''}`}
                  >
                    {r?.score ?? '–'}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
        <footer className="after">
          <button type="button" className="lock" onClick={onExit}>
            Back to today’s middLE →
          </button>
          <div className="practice-actions">
            <button type="button" className="back" onClick={restart}>
              Play again
            </button>
            <button type="button" className="back" onClick={onMenu}>
              Other practice games
            </button>
          </div>
        </footer>
      </main>
    );
  }

  if (!prompt) return null;
  return (
    <main className="app">
      {top}
      <RoundDots current={round} done={round} />
      <h1 className="prompt" key={round}>
        {prompt.text}
      </h1>
      {round === 0 && (
        <p className="hint">
          Practice run. Pin where you think most people will land, not your own
          answer.
        </p>
      )}
      <div className="field">
        <HiddenCrowd
          players={0}
          note="Practice crowd · revealed when you lock in"
        />
        <Track
          key={round}
          prompt={prompt}
          value={draft}
          onChange={busy ? null : setDraft}
        />
      </div>
      <div className="actions">
        <button
          type="button"
          className="lock"
          disabled={draft === null || busy}
          onClick={() => void lock()}
        >
          {busy
            ? 'Locking in…'
            : draft === null
              ? 'Tap the line to place your pin'
              : `Lock in ${formatValue(prompt, draft)}`}
        </button>
        {error && <p className="notice">{error}</p>}
      </div>
    </main>
  );
};

type Mode =
  | { kind: 'daily' }
  | { kind: 'menu' }
  | { kind: 'practice'; game: PracticeGame; best: number | null };

export const App = () => {
  const { load, submitting, notice, guess, share, refresh } = useGame();
  /** The round whose result is being revealed right after locking it in. */
  const [reveal, setReveal] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'daily' });

  if (mode.kind === 'menu') {
    return (
      <PracticeMenu
        onBack={() => setMode({ kind: 'daily' })}
        onPick={(game, best) => setMode({ kind: 'practice', game, best })}
      />
    );
  }
  if (mode.kind === 'practice') {
    return (
      <PracticeScreen
        key={mode.game.id}
        game={mode.game}
        initialBest={mode.best}
        onExit={() => setMode({ kind: 'daily' })}
        onMenu={() => setMode({ kind: 'menu' })}
      />
    );
  }

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
  if (reveal !== null && state.results[reveal]) {
    return (
      <RevealScreen
        key={`${state.day}-reveal-${reveal}`}
        state={state}
        round={reveal}
        onNext={() => setReveal(null)}
      />
    );
  }

  const props: GameProps = {
    state,
    loadedAt,
    submitting,
    notice,
    onGuess: (round, value) =>
      void guess(round, value).then((ok) => {
        if (ok) setReveal(round);
      }),
    onShare: () => void share(),
    onPractice: () => setMode({ kind: 'menu' }),
  };
  const playing = state.open && state.total === null && state.loggedIn;
  const loggedOutToday = state.open && !state.loggedIn;
  return playing || loggedOutToday ? (
    <RoundScreen key={`${state.day}-play`} {...props} />
  ) : (
    <Summary key={`${state.day}-summary`} {...props} />
  );
};
