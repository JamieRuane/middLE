// The daily prompts. Every prompt is answered on the same 0..100 track;
// `min`/`max`/`unit` only change how the value is shown to the player.

export type Unit = 'plain' | '%' | 'min' | 'h' | '°C' | 'yrs' | 'days' | 'time';

export type Prompt = {
  text: string;
  left: string;
  right: string;
  min: number;
  max: number;
  unit: Unit;
  /** Round the shown value to this step (default 1). */
  step?: number;
  /** Colour stops painted on the track, for colour-perception prompts. */
  gradient?: string[];
  /** Where we expect the crowd to land, in the prompt's own units (e.g. 18 * 60 for 6pm). */
  expect: number;
  /** How spread out we expect guesses to be, in track units (0..100). */
  spread: number;
};

export const PROMPTS: readonly Prompt[] = [
  {
    text: 'Pick a number from 0 to 100.',
    left: '0',
    right: '100',
    min: 0,
    max: 100,
    unit: 'plain',
    expect: 45,
    spread: 18,
  },
  {
    text: 'Where does blue stop and green begin?',
    left: 'blue',
    right: 'green',
    min: 0,
    max: 100,
    unit: '%',
    expect: 50,
    spread: 10,
    gradient: ['#1f5fd1', '#16a39a', '#2fae3c'],
  },
  {
    text: 'At what battery level do you start to worry?',
    left: 'dead',
    right: 'full',
    min: 0,
    max: 100,
    unit: '%',
    expect: 20,
    spread: 10,
  },
  {
    text: 'How many minutes late is "fashionably late"?',
    left: 'on time',
    right: 'an hour',
    min: 0,
    max: 60,
    unit: 'min',
    expect: 15,
    spread: 10,
  },
  {
    text: 'When does "evening" start?',
    left: '3pm',
    right: '9pm',
    min: 15 * 60,
    max: 21 * 60,
    unit: 'time',
    expect: 1080,
    spread: 10,
    step: 5,
  },
  {
    text: 'How ripe is the perfect banana?',
    left: 'green',
    right: 'spotty',
    min: 0,
    max: 100,
    unit: '%',
    expect: 55,
    spread: 12,
    gradient: ['#7fb83a', '#f2d43a', '#e0b02a', '#7a5320'],
  },
  {
    text: 'What age counts as "old"?',
    left: '30',
    right: '100',
    min: 30,
    max: 100,
    unit: 'yrs',
    expect: 70,
    spread: 12,
  },
  {
    text: 'How many browser tabs is too many?',
    left: '1',
    right: '100',
    min: 1,
    max: 100,
    unit: 'plain',
    expect: 30,
    spread: 15,
  },
  {
    text: 'Ideal indoor temperature?',
    left: '15°C',
    right: '30°C',
    min: 15,
    max: 30,
    unit: '°C',
    expect: 21,
    spread: 10,
    step: 0.5,
    gradient: ['#3b7dd8', '#e9e4d8', '#e0582b'],
  },
  {
    text: 'Where does orange turn into red?',
    left: 'orange',
    right: 'red',
    min: 0,
    max: 100,
    unit: '%',
    expect: 50,
    spread: 10,
    gradient: ['#f59a1b', '#d9261c'],
  },
  {
    text: 'How long is the perfect nap?',
    left: '0 min',
    right: '2 hours',
    min: 0,
    max: 120,
    unit: 'min',
    expect: 25,
    spread: 10,
  },
  {
    text: 'How full should a mug of tea be?',
    left: 'empty',
    right: 'brim',
    min: 0,
    max: 100,
    unit: '%',
    expect: 85,
    spread: 8,
  },
  {
    text: 'How many days do leftovers last in the fridge?',
    left: '0',
    right: '2 weeks',
    min: 0,
    max: 14,
    unit: 'days',
    expect: 4,
    spread: 10,
    step: 0.5,
  },
  {
    text: 'How spicy is "medium"?',
    left: 'ketchup',
    right: 'regret',
    min: 0,
    max: 100,
    unit: 'plain',
    expect: 45,
    spread: 12,
    gradient: ['#f3e3b0', '#f08a24', '#b3120f'],
  },
  {
    text: 'How much of a film can you miss and still say you’ve seen it?',
    left: 'none',
    right: 'all of it',
    min: 0,
    max: 100,
    unit: '%',
    expect: 15,
    spread: 10,
  },
  {
    text: 'Where does grey become white?',
    left: 'grey',
    right: 'white',
    min: 0,
    max: 100,
    unit: '%',
    expect: 70,
    spread: 12,
    gradient: ['#6b6b6b', '#ffffff'],
  },
  {
    text: 'How many hours of sleep is a good night?',
    left: '4h',
    right: '12h',
    min: 4,
    max: 12,
    unit: 'h',
    expect: 8,
    spread: 8,
    step: 0.25,
  },
  {
    text: 'How cold is too cold for shorts?',
    left: '-10°C',
    right: '25°C',
    min: -10,
    max: 25,
    unit: '°C',
    expect: 14,
    spread: 12,
    gradient: ['#2b5fb8', '#bcd6ec', '#f1c27a'],
  },
  {
    text: 'How long can a text sit unanswered before it’s rude?',
    left: 'instant',
    right: '2 days',
    min: 0,
    max: 48,
    unit: 'h',
    expect: 6,
    spread: 12,
    step: 0.5,
  },
  {
    text: 'Purple: more red or more blue?',
    left: 'red',
    right: 'blue',
    min: 0,
    max: 100,
    unit: '%',
    expect: 50,
    spread: 15,
    gradient: ['#d1233a', '#7b2fbf', '#2a3fd1'],
  },
  {
    text: 'How sweet should coffee be?',
    left: 'black',
    right: 'syrup',
    min: 0,
    max: 100,
    unit: 'plain',
    expect: 30,
    spread: 15,
  },
  {
    text: 'What’s the best age to be?',
    left: '0',
    right: '100',
    min: 0,
    max: 100,
    unit: 'yrs',
    expect: 30,
    spread: 12,
  },
  {
    text: 'When is it too late to say "good morning"?',
    left: '9am',
    right: '3pm',
    min: 9 * 60,
    max: 15 * 60,
    unit: 'time',
    expect: 720,
    spread: 10,
    step: 5,
  },
  {
    text: 'How long is a "long" flight?',
    left: '1h',
    right: '20h',
    min: 1,
    max: 20,
    unit: 'h',
    expect: 8,
    spread: 12,
    step: 0.5,
  },
  {
    text: 'Where does teal stop being green?',
    left: 'green',
    right: 'blue',
    min: 0,
    max: 100,
    unit: '%',
    expect: 50,
    spread: 12,
    gradient: ['#21a14a', '#11998e', '#1a6fc4'],
  },
  {
    text: 'How acceptable is pineapple on pizza?',
    left: 'crime',
    right: 'perfect',
    min: 0,
    max: 100,
    unit: 'plain',
    expect: 55,
    spread: 22,
  },
  {
    text: 'How early is too early to arrive at a party?',
    left: 'on time',
    right: '1h early',
    min: 0,
    max: 60,
    unit: 'min',
    expect: 10,
    spread: 12,
  },
  {
    text: 'How loud is your music in the car?',
    left: 'silent',
    right: 'max',
    min: 0,
    max: 100,
    unit: '%',
    expect: 45,
    spread: 12,
  },
  {
    text: 'How old is an "old" dog?',
    left: '1',
    right: '20',
    min: 1,
    max: 20,
    unit: 'yrs',
    expect: 11,
    spread: 10,
    step: 0.5,
  },
  {
    text: 'Where does pink become red?',
    left: 'pink',
    right: 'red',
    min: 0,
    max: 100,
    unit: '%',
    expect: 55,
    spread: 12,
    gradient: ['#f5a3c0', '#d11a2a'],
  },
  ...[
    p('How many close friends is "a lot"?', '1', '30', 1, 30, 'plain', 6, 10),
    p(
      'How many hours of screen time a day is too much?',
      '0h',
      '16h',
      0,
      16,
      'h',
      7,
      12,
      { step: 0.5 }
    ),
    p(
      'Where does yellow become orange?',
      'yellow',
      'orange',
      0,
      100,
      '%',
      50,
      10,
      {
        gradient: ['#f7e03c', '#f5961b'],
      }
    ),
    p('How hot should a bath be?', '30°C', '45°C', 30, 45, '°C', 39, 10, {
      step: 0.5,
      gradient: ['#8fc1e8', '#f2e6d0', '#e0582b'],
    }),
    p('How many coffees a day is too many?', '0', '10', 0, 10, 'plain', 4, 10, {
      step: 0.5,
    }),
    p(
      'How long should a good film be?',
      '1 hour',
      '4 hours',
      60,
      240,
      'min',
      120,
      8,
      {
        step: 5,
      }
    ),
    p(
      'What time is "late" for dinner?',
      '5pm',
      '11pm',
      17 * 60,
      23 * 60,
      'time',
      1230,
      10,
      { step: 5 }
    ),
    p('How long is a reasonable shower?', '0', '30 min', 0, 30, 'min', 10, 10),
    p(
      'At what age are you a proper grown-up?',
      '12',
      '40',
      12,
      40,
      'yrs',
      26,
      12
    ),
    p('Where does navy become black?', 'navy', 'black', 0, 100, '%', 70, 10, {
      gradient: ['#1f3577', '#050505'],
    }),
    p(
      'How crowded is too crowded for a beach?',
      'empty',
      'packed',
      0,
      100,
      '%',
      70,
      12
    ),
    p(
      'How many unread emails is chaos?',
      '0',
      '1,000',
      0,
      1000,
      'plain',
      150,
      12,
      {
        step: 10,
      }
    ),
    p(
      'How bright is your phone screen right now?',
      'dim',
      'max',
      0,
      100,
      '%',
      55,
      15
    ),
    p(
      'How many days can you skip washing your hair?',
      '0',
      '2 weeks',
      0,
      14,
      'days',
      3,
      10,
      {
        step: 0.5,
      }
    ),
    p(
      'When does "night" start?',
      '6pm',
      'midnight',
      18 * 60,
      24 * 60,
      'time',
      1260,
      12,
      {
        step: 5,
      }
    ),
    p(
      'How long would you wait for a table?',
      '0',
      '90 min',
      0,
      90,
      'min',
      30,
      12
    ),
    p('How many people make it a party?', '2', '50', 2, 50, 'plain', 12, 10),
    p('How warm is jumper weather?', '0°C', '25°C', 0, 25, '°C', 12, 12, {
      gradient: ['#3b7dd8', '#e9e4d8', '#f1a54a'],
    }),
    p(
      'Where does brown become orange?',
      'brown',
      'orange',
      0,
      100,
      '%',
      55,
      12,
      {
        gradient: ['#5e3519', '#e8791c'],
      }
    ),
    p(
      'How long could you last without your phone?',
      '0h',
      '2 days',
      0,
      48,
      'h',
      8,
      15
    ),
    p(
      'How many slices of pizza is a fair share?',
      '1',
      '8',
      1,
      8,
      'plain',
      3,
      10,
      {
        step: 0.5,
      }
    ),
    p('How old should you be to get a phone?', '5', '18', 5, 18, 'yrs', 12, 12),
    p(
      'How much of a plate should be vegetables?',
      'none',
      'all',
      0,
      100,
      '%',
      45,
      10
    ),
    p(
      'How long is too long for a voice note?',
      '0',
      '5 min',
      0,
      5,
      'min',
      1.5,
      10,
      {
        step: 0.25,
      }
    ),
    p(
      'How many alarms does it take to get up?',
      '1',
      '10',
      1,
      10,
      'plain',
      2,
      12
    ),
    p(
      'Where does lavender stop being blue?',
      'blue',
      'pink',
      0,
      100,
      '%',
      55,
      12,
      {
        gradient: ['#8fa6e8', '#b48be0', '#d98bcd'],
      }
    ),
    p(
      'How many years is a "long" relationship?',
      '0',
      '20',
      0,
      20,
      'yrs',
      5,
      12,
      {
        step: 0.5,
      }
    ),
    p('What’s a good tip?', '0%', '40%', 0, 40, '%', 18, 10),
    p(
      'How much of a book can you skim and still say you read it?',
      'none',
      'all',
      0,
      100,
      '%',
      30,
      12
    ),
    p(
      'How full is "full" for a phone’s storage?',
      'empty',
      '100%',
      0,
      100,
      '%',
      90,
      6
    ),
  ],
];

function p(
  text: string,
  left: string,
  right: string,
  min: number,
  max: number,
  unit: Unit,
  expect: number,
  spread: number,
  extra: Pick<Prompt, 'step' | 'gradient'> = {}
): Prompt {
  return { text, left, right, min, max, unit, expect, spread, ...extra };
}

/** Rounds played each day. */
export const ROUNDS = 5;

/** Deterministic PRNG so every player (and the server) gets the same daily set. */
const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const shuffled = (seed: number): number[] => {
  const order = PROMPTS.map((_, i) => i);
  const rand = mulberry32(seed);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = order[i] ?? 0;
    order[i] = order[j] ?? 0;
    order[j] = a;
  }
  return order;
};

/**
 * The ROUNDS prompts for a day. The pool is reshuffled every cycle, and no prompt repeats
 * within a cycle (floor(PROMPTS.length / ROUNDS) days).
 */
export const promptsForDayNumber = (n: number): Prompt[] => {
  const perCycle = Math.floor(PROMPTS.length / ROUNDS);
  const index = n - 1;
  const cycle = Math.floor(index / perCycle);
  const slot = index - cycle * perCycle;
  return shuffled(cycle + 1)
    .slice(slot * ROUNDS, slot * ROUNDS + ROUNDS)
    .map((i) => PROMPTS[i])
    .filter((x): x is Prompt => x !== undefined);
};

const roundTo = (x: number, step: number): number =>
  Math.round(x / step) * step;

const trim = (x: number): string =>
  Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0+$/, '');

/** Turns a 0..100 track position into what the player sees, e.g. "7:35pm" or "21.5°C". */
export const formatValue = (prompt: Prompt, value: number): string => {
  const raw = prompt.min + (value / 100) * (prompt.max - prompt.min);
  const x = roundTo(raw, prompt.step ?? 1);
  switch (prompt.unit) {
    case 'time': {
      const h24 = Math.floor(x / 60) % 24;
      const m = Math.round(x % 60);
      const suffix = h24 >= 12 ? 'pm' : 'am';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      return `${h12}:${String(m).padStart(2, '0')}${suffix}`;
    }
    case '%':
      return `${trim(x)}%`;
    case 'min':
      return `${trim(x)} min`;
    case 'h':
      return `${trim(x)}h`;
    case '°C':
      return `${trim(x)}°C`;
    case 'yrs':
      return `${trim(x)} yrs`;
    case 'days':
      return `${trim(x)} ${x === 1 ? 'day' : 'days'}`;
    case 'plain':
      return trim(x);
  }
};
