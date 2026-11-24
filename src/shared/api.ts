import type { Prompt } from './prompts';

export type Results = {
  /** Number of guesses so far (final once the day is closed). */
  count: number;
  median: number | null;
  /** Guess counts grouped into display bars. */
  bins: number[];
  /** Present when the current player guessed and there is a median. */
  score: number | null;
  percentile: number | null;
  bullseye: boolean;
};

export type Stats = {
  streak: number;
  bestStreak: number;
  played: number;
  bullseyes: number;
  /** Average of settled (finished) days, or null before the first one settles. */
  average: number | null;
};

export type Yesterday = {
  number: number;
  text: string;
  median: number;
  guessLabel: string;
  medianLabel: string;
  score: number;
  count: number;
};

export type StateResponse = {
  type: 'state';
  day: string;
  number: number;
  prompt: Prompt;
  /** True while this post's day is today (UTC) and guesses are accepted. */
  open: boolean;
  msToReset: number;
  loggedIn: boolean;
  /** How many people have locked in for this post's day. */
  players: number;
  guess: number | null;
  /** Shown after you guess, or to everyone once the day is closed. */
  results: Results | null;
  stats: Stats;
  yesterday: Yesterday | null;
  /** Link to today's post when this post belongs to an earlier day. */
  todayUrl: string | null;
};

export type GuessRequest = { value: number };

export type ErrorResponse = {
  type: 'error';
  message: string;
};
