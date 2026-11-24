# middLE

**Being right doesn't matter. Being average does.**

middLE is a daily game for Reddit. Each day brings five rounds, one prompt each. For every prompt, put your pin where you think *the crowd* will put theirs. You score points for landing close to the crowd's median.

## How to play

1. Open today's middLE post.
2. Read the prompt. For example: *"Where does blue stop and green begin?"* or *"How many minutes late is fashionably late?"*
3. Tap or drag to place your pin, then lock it in. One guess per round.
4. As soon as you lock in, the round is revealed: the crowd's guesses so far, the median, and your round score out of 100.
5. After round five, you get your daily total out of 500. Tap any round to look at its crowd again.
6. Medians keep moving while people play. Results go final at midnight UTC, when the next middLE posts.
7. Tap **Post to comments** to share a spoiler-free result: your score and one emoji per round (🎯 bullseye, 🟩 85+, 🟨 65+, 🟧 40+, 🟥 under 40). It's posted from your account, once per day. Then argue about it in the thread.

## Scoring

- **Round score:** 100 for dead centre, minus 2 points for every step away from the median (0–100 track). The median you're scored against leaves out your own guess.
- **Warm-up crowd:** every round starts with 30 seeded warm-up guesses spread around a sensible expected answer, so the first players of the day aren't scored against an empty crowd (or themselves). Each real player replaces one warm-up guess, and once 30 people have played the warm-up is gone. Warm-up guesses show as striped bars.
- **Daily score:** the sum of your five round scores, out of 500.
- **Bullseye:** landing within 2 steps of a round's median.
- **Streak:** consecutive days with all five rounds played.
- **Average:** your mean daily score across finished days.

Prompts come from a shuffled pool, so no prompt repeats until the whole pool has been used.

## Practice games

Three fixed practice games (15 prompts) are always available from the round screen ("New here? Try a practice game first") and from the results screen ("Practice"):

1. **Warm-up**: the five-second rule, terms and conditions, snoozing, Santa, pizza.
2. **Colour Clash**: five colour boundaries, from sky blue to maroon.
3. **Hot Takes**: reclining plane seats, socks with sandals, dishes in the sink.

They're the same for everyone and never change, and they're kept out of the daily pool. Practice rounds use the same reveal and scoring as the daily game. The practice crowd builds up from each player's first attempt, topped up by the warm-up crowd. You can replay as often as you like; your best score is kept, and practice never touches streaks or stats.

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
| `npm run preview:ui` | Local UI preview with mocked data at http://localhost:5199 (add `?s=` with fresh, new, mid, played, closed, few or out) |
| `npm run deploy` | Type-check, lint and upload. **Don't** run `launch`/publish during the hackathon |

Layout:

- `src/client`: the post UI. `splash.html` is the inline feed view and `game.html` is the expanded view.
- `src/server`: API routes, the daily post scheduler and Redis storage.
- `src/shared`: types shared by the client and server.
