import { reddit } from '@devvit/web/server';
import { dayNumber, today } from '../../shared/day';
import { promptForDayNumber } from '../../shared/prompts';
import { postIdForDay, rememberPost } from './game';

/** Creates today's middLE post, or returns the existing one so a day never gets two. */
export const ensureDailyPost = async (): Promise<{ id: string; created: boolean }> => {
  const day = today();
  const existing = await postIdForDay(day);
  if (existing) return { id: existing, created: false };

  const n = dayNumber(day);
  const prompt = promptForDayNumber(n);
  const post = await reddit.submitCustomPost({
    title: `middLE #${n}: ${prompt.text}`,
    postData: { day },
  });
  await rememberPost(day, post.id);
  return { id: post.id, created: true };
};
