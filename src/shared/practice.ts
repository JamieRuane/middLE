// Three fixed practice games (15 prompts) that are the same for everyone and never change.
// They're kept out of the daily pool so practising never spoils a real day.

import type { Prompt } from './prompts.ts';
import { warmupCounts } from './crowd.ts';

export type PracticeGame = {
  id: number;
  title: string;
  blurb: string;
  prompts: Prompt[];
};

export const PRACTICE_GAMES: readonly PracticeGame[] = [
  {
    id: 0,
    title: 'Warm-up',
    blurb: 'Five easy ones to learn the ropes.',
    prompts: [
      {
        text: 'How many seconds is the five-second rule, really?',
        left: '0s',
        right: '30s',
        min: 0,
        max: 30,
        unit: 'sec',
        expect: 5,
        spread: 10,
      },
      {
        text: 'What % of people actually read the terms and conditions?',
        left: 'nobody',
        right: 'everyone',
        min: 0,
        max: 100,
        unit: '%',
        expect: 5,
        spread: 10,
      },
      {
        text: 'How many snoozes before it’s a problem?',
        left: '0',
        right: '10',
        min: 0,
        max: 10,
        unit: 'plain',
        expect: 3,
        spread: 12,
      },
      {
        text: 'At what age did you stop believing in Santa?',
        left: '3',
        right: '15',
        min: 3,
        max: 15,
        unit: 'yrs',
        expect: 8,
        spread: 12,
      },
      {
        text: 'How many slices of pizza can one person eat?',
        left: '1',
        right: '16',
        min: 1,
        max: 16,
        unit: 'plain',
        expect: 5,
        spread: 12,
      },
    ],
  },
  {
    id: 1,
    title: 'Colour Clash',
    blurb: 'Where do colours change? Your eyes vs everyone’s.',
    prompts: [
      {
        text: 'Where does sky blue become just blue?',
        left: 'sky blue',
        right: 'blue',
        min: 0,
        max: 100,
        unit: '%',
        gradient: ['#a6dcff', '#1f4fd1'],
        expect: 50,
        spread: 12,
      },
      {
        text: 'Where does green turn yellow?',
        left: 'green',
        right: 'yellow',
        min: 0,
        max: 100,
        unit: '%',
        gradient: ['#2fae3c', '#b5d82c', '#f6e03a'],
        expect: 60,
        spread: 12,
      },
      {
        text: 'Where does peach become pink?',
        left: 'peach',
        right: 'pink',
        min: 0,
        max: 100,
        unit: '%',
        gradient: ['#ffc59e', '#ff8fb3'],
        expect: 50,
        spread: 14,
      },
      {
        text: 'Where does red become maroon?',
        left: 'red',
        right: 'maroon',
        min: 0,
        max: 100,
        unit: '%',
        gradient: ['#e0202d', '#5c0b1a'],
        expect: 60,
        spread: 12,
      },
      {
        text: 'Where does turquoise turn blue?',
        left: 'turquoise',
        right: 'blue',
        min: 0,
        max: 100,
        unit: '%',
        gradient: ['#2fd8c4', '#1c66d6'],
        expect: 50,
        spread: 12,
      },
    ],
  },
  {
    id: 2,
    title: 'Hot Takes',
    blurb: 'Divisive opinions. Can you still find the middle?',
    prompts: [
      {
        text: 'How acceptable is reclining your seat on a plane?',
        left: 'never',
        right: 'always',
        min: 0,
        max: 100,
        unit: 'plain',
        expect: 45,
        spread: 22,
      },
      {
        text: 'Socks with sandals: how acceptable?',
        left: 'crime',
        right: 'iconic',
        min: 0,
        max: 100,
        unit: 'plain',
        expect: 25,
        spread: 20,
      },
      {
        text: 'How late can you be before you have to text?',
        left: '0 min',
        right: '30 min',
        min: 0,
        max: 30,
        unit: 'min',
        expect: 5,
        spread: 10,
      },
      {
        text: 'How long can dishes sit in the sink?',
        left: '0h',
        right: '3 days',
        min: 0,
        max: 72,
        unit: 'h',
        expect: 12,
        spread: 12,
      },
      {
        text: 'How many episodes before you give up on a show?',
        left: '1',
        right: '10',
        min: 1,
        max: 10,
        unit: 'plain',
        expect: 3,
        spread: 12,
      },
    ],
  },
];

export const practiceGame = (id: number): PracticeGame | undefined =>
  PRACTICE_GAMES.find((g) => g.id === id);

/** The fixed warm-up crowd for a practice round. */
export const practiceWarmup = (game: number, round: number): number[] => {
  const prompt = practiceGame(game)?.prompts[round];
  return prompt ? warmupCounts(prompt, 9000 + game * 10 + round) : [];
};
