import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { ensureDailyPost } from '../core/post';
import { postUrl } from '../core/game';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await ensureDailyPost();
    return c.json<UiResponse>(
      post.created
        ? { navigateTo: postUrl(post.id) }
        : { showToast: 'Today’s middLE is already up.', navigateTo: postUrl(post.id) },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create post' }, 400);
  }
});
