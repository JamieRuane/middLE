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
};

export const PROMPTS: readonly Prompt[] = [
  {
    text: 'Pick a number from 0 to 100.',
    left: '0',
    right: '100',
    min: 0,
    max: 100,
    unit: 'plain',
  },
  {
    text: 'Where does blue stop and green begin?',
    left: 'blue',
    right: 'green',
    min: 0,
    max: 100,
    unit: '%',
    gradient: ['#1f5fd1', '#16a39a', '#2fae3c'],
  },
  {
    text: 'At what battery level do you start to worry?',
    left: 'dead',
    right: 'full',
    min: 0,
    max: 100,
    unit: '%',
  },
  {
    text: 'How many minutes late is "fashionably late"?',
    left: 'on time',
    right: 'an hour',
    min: 0,
    max: 60,
    unit: 'min',
  },
  {
    text: 'When does "evening" start?',
    left: '3pm',
    right: '9pm',
    min: 15 * 60,
    max: 21 * 60,
    unit: 'time',
    step: 5,
  },
  {
    text: 'How ripe is the perfect banana?',
    left: 'green',
    right: 'spotty',
    min: 0,
    max: 100,
    unit: '%',
    gradient: ['#7fb83a', '#f2d43a', '#e0b02a', '#7a5320'],
  },
  {
    text: 'What age counts as "old"?',
    left: '30',
    right: '100',
    min: 30,
    max: 100,
    unit: 'yrs',
  },
  {
    text: 'How many browser tabs is too many?',
    left: '1',
    right: '100',
    min: 1,
    max: 100,
    unit: 'plain',
  },
  {
    text: 'Ideal indoor temperature?',
    left: '15°C',
    right: '30°C',
    min: 15,
    max: 30,
    unit: '°C',
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
    gradient: ['#f59a1b', '#d9261c'],
  },
  {
    text: 'How long is the perfect nap?',
    left: '0 min',
    right: '2 hours',
    min: 0,
    max: 120,
    unit: 'min',
  },
  {
    text: 'How full should a mug of tea be?',
    left: 'empty',
    right: 'brim',
    min: 0,
    max: 100,
    unit: '%',
  },
  {
    text: 'How many days do leftovers last in the fridge?',
    left: '0',
    right: '2 weeks',
    min: 0,
    max: 14,
    unit: 'days',
    step: 0.5,
  },
  {
    text: 'How spicy is "medium"?',
    left: 'ketchup',
    right: 'regret',
    min: 0,
    max: 100,
    unit: 'plain',
    gradient: ['#f3e3b0', '#f08a24', '#b3120f'],
  },
  {
    text: 'How much of a film can you miss and still say you’ve seen it?',
    left: 'none',
    right: 'all of it',
    min: 0,
    max: 100,
    unit: '%',
  },
  {
    text: 'Where does grey become white?',
    left: 'grey',
    right: 'white',
    min: 0,
    max: 100,
    unit: '%',
    gradient: ['#6b6b6b', '#ffffff'],
  },
  {
    text: 'How many hours of sleep is a good night?',
    left: '4h',
    right: '12h',
    min: 4,
    max: 12,
    unit: 'h',
    step: 0.25,
  },
  {
    text: 'How cold is too cold for shorts?',
    left: '-10°C',
    right: '25°C',
    min: -10,
    max: 25,
    unit: '°C',
    gradient: ['#2b5fb8', '#bcd6ec', '#f1c27a'],
  },
  {
    text: 'How long can a text sit unanswered before it’s rude?',
    left: 'instant',
    right: '2 days',
    min: 0,
    max: 48,
    unit: 'h',
    step: 0.5,
  },
  {
    text: 'Purple: more red or more blue?',
    left: 'red',
    right: 'blue',
    min: 0,
    max: 100,
    unit: '%',
    gradient: ['#d1233a', '#7b2fbf', '#2a3fd1'],
  },
  {
    text: 'How sweet should coffee be?',
    left: 'black',
    right: 'syrup',
    min: 0,
    max: 100,
    unit: 'plain',
  },
  {
    text: 'What’s the best age to be?',
    left: '0',
    right: '100',
    min: 0,
    max: 100,
    unit: 'yrs',
  },
  {
    text: 'When is it too late to say "good morning"?',
    left: '9am',
    right: '3pm',
    min: 9 * 60,
    max: 15 * 60,
    unit: 'time',
    step: 5,
  },
  {
    text: 'How long is a "long" flight?',
    left: '1h',
    right: '20h',
    min: 1,
    max: 20,
    unit: 'h',
    step: 0.5,
  },
  {
    text: 'Where does teal stop being green?',
    left: 'green',
    right: 'blue',
    min: 0,
    max: 100,
    unit: '%',
    gradient: ['#21a14a', '#11998e', '#1a6fc4'],
  },
  {
    text: 'How acceptable is pineapple on pizza?',
    left: 'crime',
    right: 'perfect',
    min: 0,
    max: 100,
    unit: 'plain',
  },
  {
    text: 'How early is too early to arrive at a party?',
    left: 'on time',
    right: '1h early',
    min: 0,
    max: 60,
    unit: 'min',
  },
  {
    text: 'How loud is your music in the car?',
    left: 'silent',
    right: 'max',
    min: 0,
    max: 100,
    unit: '%',
  },
  {
    text: 'How old is an "old" dog?',
    left: '1',
    right: '20',
    min: 1,
    max: 20,
    unit: 'yrs',
    step: 0.5,
  },
  {
    text: 'Where does pink become red?',
    left: 'pink',
    right: 'red',
    min: 0,
    max: 100,
    unit: '%',
    gradient: ['#f5a3c0', '#d11a2a'],
  },
];

export const promptForDayNumber = (n: number): Prompt => {
  const i = (((n - 1) % PROMPTS.length) + PROMPTS.length) % PROMPTS.length;
  // PROMPTS is non-empty, so the index is always in range.
  return PROMPTS[i] ?? PROMPTS[0]!;
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
