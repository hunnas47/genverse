# GEN M Explorer

A mobile-first 2D beach explorer for GEN M at Kozhikode Beach, 13–15 November
2026. Walk the venue map, find daily shells, collect venue stamps, and browse
the official programme.

**Live:** <https://genm-world.vercel.app>

## Routes

| Route | What it does |
| --- | --- |
| `/` | Landing page |
| `/explore` | Phaser beach map, Beach Quest, venue panels, and joystick |
| `/sessions` | Searchable official programme |
| `/leaderboard` | Daily and all-time Beach Quest leaderboard |

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4
- Phaser 4, loaded client-side only
- Supabase Postgres with anonymous auth for the shared quest

## Local setup

Requires Node.js 20.9+ and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

The map and programme work without a backend. To enable the shared quest and
leaderboard, create a Supabase project, turn on **Anonymous Sign-Ins**, and run
the SQL files in `supabase/migrations/` in filename order. Then add these values
to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```

Never put the service-role key in this app or in a `NEXT_PUBLIC_*` variable.

## Commands

```bash
npm run dev             # development server
npm run build           # production build
npm start               # serve the production build
npm run lint            # ESLint
npx tsc --noEmit        # type-check
npm test                # Vitest quest and SQL tests
npm run check:supabase  # remote auth and quest RPC smoke check
npm run load:supabase   # read-only leaderboard load test (see below)
```

There is no CI or browser test suite. Run the checks above and do a manual pass
on `/explore` at phone and desktop widths.

## Project layout

```text
src/app/         routes and global styles
src/components/  landing page, HUD, panels, directory, joystick
src/game/        Phaser scene, movement, collision, and event bridge
src/data/        venues, programme fixtures, map geometry, quest data
src/lib/         quest store, sync, period rules, programme validation
supabase/        Beach Quest SQL migrations
public/images/   map artwork, wordmark, and avatar views
```

## Data notes

Venue details and the programme come from the official GEN M sources. The
current official programme publishes 53 sessions; speaker names are not
published on the source page, so speaker fields stay empty until they are. The
programme is bundled at build time, so rebuild after changing session data. Map
anchors and collision footprints are approximate to the supplied artwork, not
official coordinates.

The Beach Quest is local-first: progress is saved on the device and synced to
Supabase when available. The server validates scoring and duplicates, but shell
proximity is a client-side game rule.

## Running the quest at the event

**Fair play.** Leaderboard ties go to whoever reached the score first. Every
shell find and check-in is compared with the player's previous one; if the
avatar could not have walked that far in time, the action still counts but is
marked `too_fast`. Actions are flagged rather than rejected because a phone that
was offline replays its finds in a quick burst when it reconnects, so a flag on
its own is not proof of cheating. Look for many flags *and* a short
`span_seconds` (a full day's quest in a minute or two).

Moderation runs in the Supabase SQL editor. The `quest_admin` schema is not
reachable from the app's API keys.

```sql
-- Today's players, most suspicious first
select * from quest_admin.review where period_id = public.quest_today();

-- Names that match the blocked-term list
select * from quest_admin.review where name_blocked;

select quest_admin.hide_player('Some Name');    -- off the board, keeps points
select quest_admin.unhide_player('Some Name');
select quest_admin.clear_name('Some Name');     -- frees the name; player must rename
select quest_admin.block_term('newword');       -- block anywhere inside a word
select quest_admin.block_term('word', true);    -- block as a whole word only
```

Blocked terms cover English, Hindi, and Malayalam (Latin and Malayalam
script). Have a Malayalam speaker review `public.quest_blocked_terms` before
the event. Adding a term only affects new names; check existing ones with the
`name_blocked` query.

**Load.** `npm run load:supabase` sends 300 read-only leaderboard calls
(`-- --requests 1000 --concurrency 50` for more). `-- --mode players
--players 20` simulates full visitors and creates tagged anonymous users; the
script prints the cleanup SQL. Supabase limits anonymous sign-ins per IP
address (Authentication → Rate Limits). Phones on shared venue Wi-Fi or
carrier NAT can share one IP, so raise that limit before the event. If sign-in
fails, the app falls back to saving progress on the device.

## Deployment

Deploy on Vercel with the two public Supabase variables above. The app builds
with `npm run build` and serves with `npm start`.

---

Built with ❤️ by [hunnas](http://instagram.com/hadihunnas).
