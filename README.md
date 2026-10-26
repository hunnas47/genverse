# GEN M Explorer

A mobile-responsive, interactive 2D beach explorer for the GEN M venue at
Kozhikode Beach, 13–15 November 2026. Visitors can walk the illustrated venue
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

## Stack

- Next.js `16.4.3` App Router with React `19.3.0`
- TypeScript in `strict` mode
- Tailwind CSS v4 through the `@tailwindcss/turbopack` loader
- Phaser `4.2.1`, loaded client-side only
- Shadcn UI tooling and Base UI primitives
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

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check without emitting files |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build on port 3000 |

There is no test runner in the repository. Do not claim automated tests ran;
use lint, type-check, build, and a manual or scripted browser pass instead.

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
src/data/        venue records, programme fixtures, world geometry
src/types/       shared domain and search-param types
public/images/   supplied map artwork and GEN M wordmark
```

- Phaser is imported dynamically inside a client component, never during server
  render.
- Keyboard, joystick, and tap-to-move all feed the same movement intent and the
  same collision-aware movement loop in `src/game/scenes/beach-scene.ts`.
- The scene and React communicate only through the typed contract in
  `src/game/events.ts` and `src/game/event-bridge.ts`.
- World units match the supplied map image pixels (`1989 × 1453`). Playable
  bounds, obstacles, spawn, and marker colors live in `src/data/venue-map.ts`.
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

The app has no backend, database, environment variables, or privileged keys.

### Vercel

Import the repository, keep the detected Next.js settings, and deploy. No extra
configuration is required.

### Node server

```bash
npm ci
npm run build
npm start
```

Serve port 3000 behind your reverse proxy. Static assets under `/_next/static`
and `public/images` can be cached aggressively; HTML and programme data change
only on redeploy.

Before a public launch, confirm branding and content authorization with GEN M.
This repository is an independent explorer and should not be presented as an
official GEN M product without that approval.

## Known limitations

- Venue anchors and collision footprints are approximate to the supplied art.
- S7 has no published map marker.
- Nine sessions have no published speakers.
- The programme is a point-in-time extraction; verify against the official site
  before the event.
- No automated test suite is installed yet.
