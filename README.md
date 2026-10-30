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
`supabase/migrations/20261028100000_beach_quest.sql` in the SQL editor. Then add
these values to `.env.local`:

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
supabase/        Beach Quest SQL migration
public/images/   map artwork, wordmark, and avatar views
```

## Data notes

Venue details and the programme come from the official GEN M sources. The
programme is bundled at build time, so rebuild after changing session data. Map
anchors and collision footprints are approximate to the supplied artwork, not
official coordinates.

The Beach Quest is local-first: progress is saved on the device and synced to
Supabase when available. The server validates scoring and duplicates, but shell
proximity is a client-side game rule.

## Deployment

Deploy on Vercel with the two public Supabase variables above. The app builds
with `npm run build` and serves with `npm start`.

---

Built with ❤️ by [hunnas](http://instagram.com/hadihunnas).
