import { reddit } from '@devvit/web/server';
import { dayNumber, today } from '../../shared/day';
import { promptsForDayNumber } from '../../shared/prompts';
import { postIdForDay, rememberPost } from './game';

const isPostId = (id: string): id is `t3_${string}` => id.startsWith('t3_');

/**
 * True if the post still exists and is visible. A deleted, removed or spammed post
 * (or one Reddit can't find) shouldn't block today's game from being posted again.
 */
const isLive = async (id: string): Promise<boolean> => {
  if (!isPostId(id)) return false;
  try {
    const post = await reddit.getPostById(id);
    return (
      !post.removed &&
      !post.spam &&
      post.authorName !== '[deleted]' &&
      post.removedByCategory === undefined
    );
  } catch (error) {
    console.warn(`daily post ${id} not found, will repost: ${error}`);
    return false;
  }
};

/** Creates today's middLE post, or returns the existing one so a day never gets two live posts. */
export const ensureDailyPost = async (): Promise<{
  id: string;
  created: boolean;
}> => {
  const day = today();
  const existing = await postIdForDay(day);
  if (existing && (await isLive(existing))) {
    return { id: existing, created: false };
  }

  const n = dayNumber(day);
  const [first] = promptsForDayNumber(n);
  const post = await reddit.submitCustomPost({
    title: `middLE #${n}: ${first?.text ?? 'Read the crowd'} (+4 more)`,
    postData: { day },
  });
  await rememberPost(day, post.id);
  return { id: post.id, created: true };
};
