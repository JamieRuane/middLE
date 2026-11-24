import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import type {
  ErrorResponse,
  PracticeListResponse,
  PracticeRoundResponse,
  StateResponse,
} from '../../shared/api';
import { clampGuess } from '../../shared/score';
import { ROUNDS } from '../../shared/prompts';
import { GameError, getState, shareResult, submitGuess } from '../core/game';
import { listPractice, practiceGuess } from '../core/practice';

export const api = new Hono();

const fail = (message: string): ErrorResponse => ({ type: 'error', message });

api.get('/state', async (c) => {
  const { postId } = context;
  if (!postId) return c.json(fail('Missing post.'), 400);
  try {
    return c.json<StateResponse>(await getState(postId));
  } catch (error) {
    console.error(`state failed for ${postId}:`, error);
    return c.json(fail('Couldn’t load today’s middLE.'), 500);
  }
});

api.post('/guess', async (c) => {
  const { postId } = context;
  if (!postId) return c.json(fail('Missing post.'), 400);

  const body: unknown = await c.req.json().catch(() => null);
  const isObj = typeof body === 'object' && body !== null;
  const value = isObj && 'value' in body ? clampGuess(body.value) : null;
  const round = isObj && 'round' in body ? body.round : null;
  if (value === null)
    return c.json(fail('Guess must be a whole number from 0 to 100.'), 400);
  if (
    typeof round !== 'number' ||
    !Number.isInteger(round) ||
    round < 0 ||
    round >= ROUNDS
  ) {
    return c.json(fail('Unknown round.'), 400);
  }

  try {
    return c.json<StateResponse>(await submitGuess(postId, round, value));
  } catch (error) {
    if (error instanceof GameError) return c.json(fail(error.message), 409);
    console.error(`guess failed for ${postId}:`, error);
    return c.json(fail('Couldn’t save your guess. Try again.'), 500);
  }
});

api.post('/share', async (c) => {
  const { postId } = context;
  if (!postId) return c.json(fail('Missing post.'), 400);
  try {
    return c.json<StateResponse>(await shareResult(postId));
  } catch (error) {
    if (error instanceof GameError) return c.json(fail(error.message), 409);
    console.error(`share failed for ${postId}:`, error);
    return c.json(fail('Couldn’t post your comment. Try again.'), 500);
  }
});

api.get('/practice', async (c) => {
  try {
    return c.json<PracticeListResponse>({
      type: 'practice-list',
      games: await listPractice(),
    });
  } catch (error) {
    console.error('practice list failed:', error);
    return c.json(fail('Couldn’t load practice games.'), 500);
  }
});

api.post('/practice/guess', async (c) => {
  const body: unknown = await c.req.json().catch(() => null);
  const isObj = typeof body === 'object' && body !== null;
  const value = isObj && 'value' in body ? clampGuess(body.value) : null;
  const game = isObj && 'game' in body ? body.game : null;
  const round = isObj && 'round' in body ? body.round : null;
  if (value === null) {
    return c.json(fail('Guess must be a whole number from 0 to 100.'), 400);
  }
  if (typeof game !== 'number' || typeof round !== 'number') {
    return c.json(fail('Unknown practice round.'), 400);
  }
  try {
    return c.json<PracticeRoundResponse>(
      await practiceGuess(game, round, value)
    );
  } catch (error) {
    if (error instanceof GameError) return c.json(fail(error.message), 400);
    console.error('practice guess failed:', error);
    return c.json(fail('Couldn’t score that round. Try again.'), 500);
  }
});
