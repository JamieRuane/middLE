import type { Prompt } from './prompts';

export type RoundResult = {
  /** Number of real guesses for this round, including yours (final once the day is closed). */
  count: number;
  /** The median you're scored against: everyone else plus any remaining warm-up guesses. */
  median: number | null;
  /** Real guess counts grouped into display bars. */
  bins: number[];
  /** Warm-up guesses still counted (fades from 30 to 0 as real players arrive). */
  warmup: number;
  /** Warm-up guesses per display bar (may be fractional). */
  warmupBins: number[];
  /** Present when the current player guessed and there is a median. */
  score: number | null;
  bullseye: boolean;
};

export type Stats = {
  streak: number;
  bestStreak: number;
  played: number;
  bullseyes: number;
  /** Average daily total (0..500) over finished days, or null before the first one settles. */
  average: number | null;
};

export type Yesterday = {
  number: number;
  total: number;
  bullseyes: number;
};

export type StateResponse = {
  type: 'state';
  day: string;
  number: number;
  /** The day's prompts, one per round. */
  prompts: Prompt[];
  /** True while this post's day is today (UTC) and guesses are accepted. */
  open: boolean;
  msToReset: number;
  loggedIn: boolean;
  /** How many people have finished all rounds for this post's day. */
  players: number;
  /** The current player's guess per round (null = not played yet). */
  guesses: (number | null)[];
  /** Per round: the crowd's result once you've locked that round in (or for everyone once the day is closed). */
  results: (RoundResult | null)[];
  /** Sum of round scores (0..500), once you've finished all rounds. */
  total: number | null;
  stats: Stats;
  /** True once the player has posted today's result as a comment. */
  shared: boolean;
  yesterday: Yesterday | null;
  /** Link to today's post when this post belongs to an earlier day. */
  todayUrl: string | null;
};

export type GuessRequest = { round: number; value: number };

export type ErrorResponse = {
  type: 'error';
  message: string;
};

export type PracticeGameInfo = {
  id: number;
  title: string;
  blurb: string;
  /** The player's best total (0..500), or null if they haven't finished it. */
  best: number | null;
  /** People who have finished this practice game. */
  players: number;
};

export type PracticeListResponse = {
  type: 'practice-list';
  games: PracticeGameInfo[];
};

export type PracticeGuessRequest = {
  game: number;
  round: number;
  value: number;
};

export type PracticeRoundResponse = {
  type: 'practice-round';
  result: RoundResult;
  /** Updated personal best after the last round (null otherwise, or when logged out). */
  best: number | null;
};
