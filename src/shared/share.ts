// Spoiler-free result sharing: scores and a tier per round, never prompts, guesses or medians.

export type Tone = 'bull' | 'great' | 'good' | 'meh' | 'low';

export const toneFor = (score: number, bullseye: boolean): Tone => {
  if (bullseye) return 'bull';
  if (score >= 85) return 'great';
  if (score >= 65) return 'good';
  if (score >= 40) return 'meh';
  return 'low';
};

const EMOJI: Record<Tone, string> = {
  bull: '🎯',
  great: '🟩',
  good: '🟨',
  meh: '🟧',
  low: '🟥',
};

export type ShareRound = { score: number; bullseye: boolean };

export const shareGrid = (rounds: readonly ShareRound[]): string =>
  rounds.map((r) => EMOJI[toneFor(r.score, r.bullseye)]).join(' ');

/** Markdown for the Reddit comment. */
export const shareText = (opts: {
  number: number;
  total: number;
  maxTotal: number;
  rounds: readonly ShareRound[];
  streak: number;
  /** "Better than X% of players today", or null if nobody else has finished. */
  beat?: number | null;
  final: boolean;
}): string => {
  const lines = [
    `**middLE #${opts.number}**: ${opts.total} / ${opts.maxTotal}${opts.final ? '' : ' (so far)'}`,
    shareGrid(opts.rounds),
  ];
  const extras: string[] = [];
  if (opts.beat !== undefined && opts.beat !== null) {
    extras.push(`📊 Better than ${opts.beat}% of players today`);
  }
  if (opts.streak > 1) extras.push(`🔥 ${opts.streak}-day streak`);
  if (extras.length > 0) lines.push(extras.join(' · '));
  // Blank lines between parts so Reddit's Markdown keeps them on separate lines.
  return lines.join('\n\n');
};
