# middLE — Devpost submission draft

Deadline: 9 Dec 2026, 02:00 GMT. Lines marked [TODO] are filled in after the build.

---

## Project name
middLE

## Elevator pitch (max 200 chars)
Daily game where being right doesn't matter—being average does. Drop your pin where you think the crowd will land, watch the votes roll in, come back tomorrow to see how well you read Reddit.

---

## Inspiration
Most daily games ask "do you know the answer?" We wanted one that asks "do you know *each other*?" A subreddit is a crowd with its own instincts, and nobody has a scoreboard for that. middLE turns the community itself into the puzzle: the only way to win is to understand the people around you.

## What it does
- **One prompt a day, one guess.** For example: "Drag the pin to where the average player will put it," "How warm is this colour, 0–100?" or "Which of these six doodles will be picked least?"
- **You're scored on distance from the crowd's median, not on being correct.**
- **After you lock in,** you see the live distribution of everyone's guesses so far, with your pin highlighted.
- **Tomorrow's post reveals the final median,** your score and your percentile. That gives you a reason to come back.
- **Streaks** for consecutive days played, plus a "bullseye" count for days you landed within 2% of the median.
- **Flair** reflects your reading of the crowd. [TODO: confirm tiers, e.g. *Outlier → Mainstream → Dead Centre*]
- **The result card points to the comments,** where the best arguments happen ("how did 40% of you think that was warm?").
- **The community can submit future prompts.** Picked submitters get credited on the day their prompt runs.

## How we built it
[TODO: update after build]
- Devvit Web interactive post, with the client built in [React + TypeScript].
- A daily scheduler job creates each day's post and closes the previous day's.
- Redis stores per-day guess buckets (a histogram), one guess per user, streaks and the prompt queue.
- The median is computed from bucket counts, so scoring stays fast at any player count.
- [Styling/animation approach]

## Challenges we ran into
[TODO, e.g. handling a cold start when few people have played yet, preventing repeat guesses, and fitting the UI in the inline post viewport on mobile]

## Accomplishments that we're proud of
[TODO]

## What we learned
[TODO]

## What's next for middLE
- Themed weeks chosen by the community
- Head-to-head "read your friend" mode
- Seasonal leaderboards with flair rewards
- Letting other subreddits install middLE with their own prompt packs

## Built with
devvit, reddit, typescript, react, redis [TODO: confirm]

---

## Links
- App listing: https://developers.reddit.com/apps/[TODO app-name]
- Test subreddit (public, under 200 members): r/[TODO]
- Demo post: [TODO]
- Public repo (optional): [TODO]
- Demo video (optional, under 1 minute, on YouTube or Vimeo): [TODO]
- Developer survey (optional, for the Feedback prize): https://forms.gle/dW45UgK6SctevE756

## Rules checklist
- [ ] README.md in the app root describes the game and how to play (required)
- [ ] Test subreddit is public with under 200 members, or has dr-admin-approve installed
- [ ] App is uploaded and playtested, **not** submitted for publishing
- [ ] All assets are original or licensed
- [ ] Register on Devpost (you must do this yourself, since it means accepting the terms)
