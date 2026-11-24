import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import type { ErrorResponse, StateResponse } from '../../shared/api';
import { clampGuess } from '../../shared/score';
import { GameError, getState, submitGuess } from '../core/game';

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
  const value =
    typeof body === 'object' && body !== null && 'value' in body
      ? clampGuess(body.value)
      : null;
  if (value === null) return c.json(fail('Guess must be a whole number from 0 to 100.'), 400);

  try {
    return c.json<StateResponse>(await submitGuess(postId, value));
  } catch (error) {
    if (error instanceof GameError) return c.json(fail(error.message), 409);
    console.error(`guess failed for ${postId}:`, error);
    return c.json(fail('Couldn’t save your guess. Try again.'), 500);
  }
});
