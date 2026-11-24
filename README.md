# middLE

**Being right doesn't matter. Being average does.**

middLE is a daily game for Reddit. Each day brings one prompt and you get one guess. Put your pin where you think *the crowd* will put theirs. Your score is how close you land to the crowd's median.

## How to play

1. Open today's middLE post.
2. Read the prompt. For example: *"How warm is this colour, 0–100?"* or *"Where will the average player put the pin?"*
3. Drag your pin and lock it in. You get one guess per day.
4. See everyone's guesses so far, with yours highlighted.
5. Come back tomorrow for the final median, your score and your percentile.
6. Argue about it in the comments.

## Scoring

- **Score:** 100 for dead centre, minus 2 points for every step away from the final median (0–100 track).
- **Bullseye:** landing within 2 points of the median.
- **Streak:** consecutive days played.
- **Average:** your mean score across finished days.

Before you lock in, the crowd stays hidden; you only see how many pins are down. A new middLE is posted automatically just after midnight UTC.

## Coming soon

- Flair for the players who read the crowd best
- Community-submitted prompts, credited on the day they run

---

## Development

Built on [Devvit Web](https://developers.reddit.com/docs) with React 19, Tailwind 4, Vite and a Hono server.

| Command | What it does |
| --- | --- |
| `npm run login` | Log in to the Devvit CLI with your Reddit account |
| `npm run dev` | Playtest live in your test subreddit |
| `npm run build` | Build the client and server |
| `npm run test:types` | Type-check |
| `npm run test:unit` | Unit tests for scoring, days and prompts |
| `npm run preview:ui` | Local UI preview with mocked data at http://localhost:5199 (add `?s=` with fresh, new, played, closed, few, out or colour) |
| `npm run deploy` | Type-check, lint and upload. **Don't** run `launch`/publish during the hackathon |

Layout:

- `src/client`: the post UI. `splash.html` is the inline feed view and `game.html` is the expanded view.
- `src/server`: API routes, the daily post scheduler and Redis storage.
- `src/shared`: types shared by the client and server.
