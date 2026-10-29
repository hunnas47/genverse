# GEN M Explorer

A mobile-responsive, interactive 2D beach explorer for the GEN M venue at
Kozhikode Beach, 13–15 November 2026. Visitors can walk the detailed venue
map with a keyboard, a virtual joystick, or tap-to-move, open venue details, and
browse the official session programme without entering the game.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Branded landing page with links to the map and programme |
| `/explore` | Phaser beach explorer with venue markers, minimap, directory, and venue panels |
| `/explore?venue=s2` | Opens the map focused on a venue and shows its panel |
| `/sessions` | Searchable official programme with day, venue, and text filters |
| `/sessions?day=nov-14` | Opens the programme with a day preselected |
| `/sessions?venue=s2` | Filters the programme to one venue |
| `/sessions?session=<id>` | Expands a specific session |
| `/leaderboard` | Daily and all-time Beach Quest leaderboard |

## Stack

- Next.js `16.4.3` App Router with React `19.3.0`
- TypeScript in `strict` mode
- Tailwind CSS v4 through the `@tailwindcss/turbopack` loader
- Phaser `4.2.1`, loaded client-side only
- Shadcn UI tooling and Base UI primitives
- Supabase Postgres, anonymous auth, RPCs, and row-level security for the
  shared Beach Quest
- Local Neoverse Sans and FKL Dhikk fonts, plus Anek Malayalam for Malayalam
  session titles

## Local setup

Requirements: Node.js 20.9 or newer (Node 22 LTS recommended) and npm 10+.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Testing on a phone

Run the dev server on the LAN and open the computer's LAN address on the phone.
Next.js blocks unknown dev asset origins, so add the current LAN IP to
`allowedDevOrigins` in `next.config.ts` when the network changes:

```ts
allowedDevOrigins: ["192.168.1.20"],
```

This setting is development-only and does not affect a production build.

### Shared leaderboard setup

The map and programme work without a backend. The shared Beach Quest needs a
free Supabase project:

1. Create a project at <https://supabase.com>.
2. In **Authentication → Providers**, enable **Anonymous Sign-Ins**.
3. Open the SQL editor and run
   `supabase/migrations/20261028100000_beach_quest.sql`. The migration is
   idempotent, so rerunning it is safe.
4. Add the project URL and **publishable/anon** key to `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
   ```

   Never put the secret/service-role key in this app or in a `NEXT_PUBLIC_*`
   variable.
5. Verify the project:

   ```bash
   npm run check:supabase
   ```

Without these variables the app stays in local-only mode. The publishable key
is safe to ship because writes go through validated RPCs and row-level security.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check without emitting files |
| `npm test` | Run the Vitest quest, SQL, and rule tests |
| `npm run check:supabase` | Check remote anonymous auth and quest RPCs |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build on port 3000 |

`npm test` covers quest period rotation, display-name validation, scoring,
idempotency, cooldowns, streaks, shell walkability, the SQL migration, and
seed drift between the SQL and TypeScript data. The SQL tests use PGlite, so
they do not need a remote Supabase project. There is no browser/E2E suite and
no CI, so still do a manual pass on `/explore` at phone and desktop widths.

## Beach Quest

The map includes a daily shell hunt, a venue passport, and a shared leaderboard:

- A display name is optional at first visit; progress still works as a guest.
  Guest points carry over when the visitor chooses a name, and unnamed players
  stay off the leaderboard.
- Ten shells rotate daily from three hand-placed sets in `src/data/quest.ts`.
  Walking within 44 world units collects one. A full set adds a 50-point bonus.
- Opening a venue panel and checking in earns 25 points once per venue per day.
- Streaks count consecutive active days; the HUD shows today's points, shell
  progress, and the streak.
- The daily period and leaderboard reset use Asia/Kolkata (IST).
- `/leaderboard` shows today's board and an all-time board. The panel also shows
  how many explorers were seen in the last five minutes.

The local store in `src/lib/quest/store.ts` is still the offline source of
truth. The sync layer in `src/lib/quest/live-store.ts`:

- signs in anonymously and caches the server snapshot;
- sends writes through the Supabase RPCs first;
- falls back to the local store when offline and queues unsynced finds in
  `genm:quest:queue:v1`;
- replays queued finds with enough spacing for the server cooldown;
- layers pending local points over the cached server state so the HUD never
  waits for the network.

The server is authoritative for today's shell set, duplicate finds, the
1.2-second shell gap, venue IDs, points, streaks, and leaderboard ranking. The
server cannot prove that a phone was physically near a shell; walking proximity
is an on-device rule. Do not attach valuable prizes without adding stronger
anti-cheat.

Local progress uses `genm:quest:v1`. Clearing site data also clears the
anonymous Supabase session, so server points from the old anonymous identity
cannot be recovered without adding real accounts.

To hide an inappropriate leaderboard name, run this in the Supabase SQL editor:

```sql
update public.players
set is_hidden = true
where lower(display_name) = lower('name to hide');
```

## Data and provenance

Official content is kept separate from provisional map geometry.

- **Venues:** S1–S7 names, descriptions, active days, and source links were
  verified from <https://www.genm.in/venues> on 2026-10-24 and live in
  `src/data/venues.ts`.
- **Map-only facilities:** labels taken from the supplied artwork (`A1`, `A3`,
  `B`, `C`, `S`, `O`, `R`, `E`, `P`) are marked `verification: "supplied-map"`
  and are provisional. `A2` is treated as an area label beside S5, not a
  separate venue.
- **S7:** the official venue page does not publish a map location yet, so the
  explorer shows “Map location TBA” and renders no marker.
- **Programme:** 60 sessions and 182 speakers were extracted from
  <https://www.genm.in/sessions> and cross-checked on 2026-10-25. Fixtures are
  `src/data/sessions.json` and `src/data/speakers.json`.
- **Unknown fields stay unknown:** nine sessions have no published speaker IDs
  and display “Speakers to be announced.” No speaker, session, time, or venue
  detail is invented.
- **Validation:** `src/lib/programme.ts` validates day, time, venue, speaker,
  status, and official-URL references at module load. A bad reference fails
  `npm run build` instead of shipping.
- **Map anchors** are approximate and calibrated from the supplied artwork, not
  official survey coordinates.

### Refreshing the programme

1. Re-extract sessions and speakers from the official programme page.
2. Update `src/data/sessions.json`, `src/data/speakers.json`, and the metadata
   in `src/data/programme.ts` (`PROGRAMME_VERIFIED_AT`, `PROGRAMME_NOTICE`).
3. Run `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
4. Spot-check `/sessions`, a venue panel, and `/explore?venue=s7`.

The programme is bundled at build time, so a deployment must be rebuilt to pick
up refreshed data.

## Architecture

```text
src/app/         routes, metadata, global styles, error and 404 states
src/components/  React UI: explorer shell, HUD, panels, directory, joystick
src/game/        Phaser scene, typed bridge, collision, A* pathfinding
src/data/        venue records, programme fixtures, world geometry, quest data
src/lib/quest/   local-first quest store, sync layer, period rotation, name rules
src/lib/supabase/ browser client and anonymous session bootstrap
src/types/       shared domain and search-param types
supabase/        SQL migration for tables, seeds, RPCs, RLS, and grants
public/images/   final map artwork, GEN M wordmark, and avatar views
```

- The player avatar uses three supplied views in `public/images/assets/`:
  `avatar_up` (back), `avatar_down` (front), and `avatar_right` (side; left
  movement mirrors it). The runtime loads 320px-tall WebP derivatives, while the
  source PNGs stay in the same folder. Height and facing rules live in
  `src/game/avatar.ts`.

- Phaser is imported dynamically inside a client component, never during server
  render.
- Keyboard, joystick, and tap-to-move all feed the same movement intent and the
  same collision-aware movement loop in `src/game/scenes/beach-scene.ts`.
- The scene and React communicate only through the typed contract in
  `src/game/events.ts` and `src/game/event-bridge.ts`.
- Shared quest state is fetched with compact RPC calls rather than Realtime.
  The map does not stream other players' positions; the shared layer is an
  asynchronous leaderboard plus a five-minute presence count.
- World units match the final map image pixels (`1467 × 1072`). Playable
  bounds, obstacles, spawn, and marker colors live in `src/data/venue-map.ts`.
- The final map is a top-down, pre-rendered 3D beach park: S1 Freedom Square on
  the far left, the green entrance arch and central staircase at bottom center,
  the Arabian Sea and golden beach along the top, and Beach Road with dense
  palms and red-tiled Kerala rooftops below. Keep new markers, shells,
  obstacles, and UI overlays aligned to that layout; the artwork itself has no
  baked-in labels.
- `public/images/paths.png` is the owner's collision sketch: `#4D4D4D` marks
  blocked buildings and venue markers, while `#39FF14` marks paths. The
  playable bounds include Beach Road and the roadside strip; open park space is
  walkable unless it sits inside a dark footprint.
- The map image is loaded at runtime. If it fails, the scene draws a simplified
  beach, keeps collisions and venue data usable, and React shows a dismissible
  notice.
- The game is destroyed on unmount and on retry; the Phaser loop sleeps while
  the browser tab is hidden.

## Controls and accessibility

- **Keyboard:** WASD or arrow keys to walk, `E`/`Enter` to open a nearby venue,
  `Esc` to stop walking. Tab reaches the minimap, directory, panels, and header
  links.
- **Touch:** drag the virtual joystick, tap the map to walk to a point, tap a
  venue marker, or use the minimap and directory.
- The directory is a modal dialog with a focus trap and a close button. The
  venue panel closes with `Esc` and returns focus to the map.
- The minimap is a button: pointer input walks to a point; keyboard activation
  opens the venue directory.
- Status messages use live regions, controls use visible focus rings, and
  decorative motion respects `prefers-reduced-motion`.
- Session browsing is fully usable without entering the game.

## Deployment

**Live:** <https://genm-explorer.vercel.app> (Vercel production, Supabase Free).

The programme and map are bundled at build time. The shared Beach Quest uses
Supabase's free tier; there is no other backend or secret key in the app.

### Supabase

Apply `supabase/migrations/20261028100000_beach_quest.sql` in the SQL editor and
enable **Authentication → Providers → Anonymous Sign-Ins** before the first
deployment. Run `npm run check:supabase` against the production project. Keep
the service-role key out of Vercel and the browser.

### Vercel

Import the repository and keep the detected Next.js settings. Add these
environment variables to the Production (and Preview, if used) environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```

`NEXT_PUBLIC_*` values are inlined at build time, so redeploy after changing
them. A deployment without the variables still serves the map and programme,
but the quest stays local to each device.

### Node server

```bash
npm ci
npm run build
npm start
```

Serve port 3000 behind your reverse proxy. Static assets under `/_next/static`
and `public/images` can be cached aggressively; HTML and programme data change
only on redeploy. Set the same public Supabase variables in the build
environment.

Before a public launch, confirm branding and content authorization with GEN M.
This repository is an independent explorer and should not be presented as an
official GEN M product without that approval.

## Known limitations

- Venue anchors and collision footprints are approximate to the supplied art.
- S7 has no published map marker.
- Nine sessions have no published speakers.
- The programme is a point-in-time extraction; verify against the official site
  before the event.
- Beach Quest walking proximity is a client-side rule. The server blocks
  duplicate, out-of-set, and rapid submissions but cannot prove physical
  presence.
- The shared layer is asynchronous: it shows points and a presence count, not
  live avatars or positions. This is intentional for the free tier.
- Clearing site data creates a new anonymous identity. Old server points remain
  but cannot be recovered without real accounts.
- Display names are not a secure identity; the event team can hide a name with
  the SQL above.
- There is no browser/E2E test suite yet.
