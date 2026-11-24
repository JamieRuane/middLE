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
- **Five rounds a day, one pin each.** For example: "Where does blue stop and green begin?", "How many minutes late is fashionably late?" or "When does evening start?"
- **You're scored on distance from the crowd's median, not on being correct.** Each round is worth up to 100 points, for a daily total out of 500.
- **Every round reveals the moment you lock in.** The crowd's histogram grows in, the median drops into place, and your score counts up to a rating from *Lone wolf* to *Bullseye!*. After round five you get your total out of 500.
- **Medians move all day** as more people play, and go final at midnight UTC, when the next middLE posts. Tomorrow's post shows yesterday's final score.
- **Streaks** for consecutive days played, plus bullseyes for rounds within 2 steps of the median.
- **One tap shares your result to the comments** from your own account: your score and an emoji per round (🎯🟩🟨🟧🟥), with no answers, so the thread fills with comparable, spoiler-free results and the arguments that follow.

## How we built it
- A Devvit Web interactive post, with a React 19 + TypeScript client styled with Tailwind 4 and hand-written CSS.
- A Hono server on Devvit's serverless backend.
- A scheduled cron job posts each day's middLE just after midnight UTC.
- Each day's 5 prompts come from a seeded shuffle of a 60-prompt pool, so every player gets the same set and nothing repeats within a cycle.
- Redis stores each round's guesses as a 101-bucket histogram, so medians and scores stay fast at any player count. One guess per user per round is enforced with `hSetNX`.
- Stats settle lazily on a player's next visit, so there's no nightly batch job over every player.
- The custom slider supports pointer and keyboard input, and the pin starts unplaced so guesses don't anchor at 50.

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
