<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GEN M Explorer — Project Instructions

You are my coding partner for building a mobile-responsive interactive 2D venue explorer for GEN M.

## Product vision

Build an illustrated, top-down 2D beach world based on the supplied GEN M venue map. Visitors can walk around using keyboard controls or a mobile joystick, tap destinations to move, interact with venues, and view official session information.

## Current repository state

Verified on 2026-10-26. Update this section when the project foundation changes.

- `create-next-app` foundation with three commits; the current working tree contains the playable explorer milestones through M6 plus the genm.in-inspired design pass across the home page, programme, and explorer chrome.
- Next.js `16.4.3` App Router, React `19.3.0`, TypeScript `strict`, ESLint 9 flat config.
- Tailwind CSS v4 is wired through the `@tailwindcss/turbopack` loader in `next.config.ts`.
- Phaser `4.2.1` and Shadcn UI tooling are installed. The installed Phaser major version is 4, despite older references to Phaser 3 in planning documents.
- `/explore` renders a client-only Phaser scene using the supplied venue map, with a movable player, camera follow, world bounds, approximate collision geometry, labelled venue markers, proximity prompts, A* tap-to-move, and a React venue panel.
- M5 navigation includes the virtual joystick, tap-to-move pathfinding, minimap with walk-to-point, and a focus-trapped venue directory.
- M6 polish includes labelled landmark markers, a player halo, a boot timeout with in-place retry, a simplified-map fallback with a dismissible notice, route-level error/404 pages, tab-visibility loop pausing, and a documented README.
- Official S1–S7 venue names, descriptions, active days, and source links are in `src/data/venues.ts`, verified from `https://www.genm.in/venues` on 2026-10-24. S7 has no map marker because its official venue page says the map location is to be announced.
- Map-only expo and facility labels (`A1`, `A3`, `B`, `C`, `S`, `O`, `R`, `E`, `P`) are marked `supplied-map` and are provisional. `A2` is not a separate record because the official venue list has no A2 entry.
- `/sessions` is a searchable official programme with day, venue, and text filters, expandable session details, official session links, and venue deep links.
- Official session and speaker fixtures are in `src/data/sessions.json` and `src/data/speakers.json`, extracted from `https://www.genm.in/sessions` and verified on 2026-10-25. On 2026-10-26 all 60 session IDs, days, venues, times, titles, subtitles, speaker IDs, and all 182 speaker names were re-checked against the official site's session bundle with no differences. `src/lib/programme.ts` validates venue, day, time, speaker, and status references at module load.
- `/explore?venue=<id>` focuses a venue, moves the player to a nearby walkable point, and opens its panel. Venue panels list official sessions and link back to the programme.
- Phaser and React communicate through the typed bridge in `src/game/events.ts` and `src/game/event-bridge.ts`.
- Supplied map images and the GEN M wordmark live in `public/images/`. The no-legend `GEN-M-venue-map.jpg` is the current game background.
- Local fonts live in `src/app/fonts/`: Neoverse Sans (400/500), FKL Dhikk (300/400/600/700/900), and the GEN M wordmark is `public/images/genm-logo.png`. Anek Malayalam is loaded through `next/font/google` and applied to `lang="ml"` content.
- The visual system uses deep indigo (`#2c2d6f`), brand periwinkle (`#5964ae`), lime (`#edf2b5`), cream (`#f7f3e8`), and lavender (`#dfe2f3`), with wave dividers and shared `SiteHeader`/`SiteFooter`/`ActionLink` components.
- `GENM_EXPLORER_PROJECT_REFERENCE.md` is the primary product specification and takes precedence when it conflicts with this file.
- **Not installed yet:** a test runner and any backend/database.
- The home page is a branded landing page with entry points to the map and programme. Official session data is now in the repo; venue map labels remain provisional where marked `supplied-map`.
- `/sessions?day=<id>` opens the programme with that day preselected; `?venue=<id>` and `?session=<id>` continue to deep-link the programme.
- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, and `experimental.agentFeedback`.
- `next.config.ts` also allows the current LAN host in `allowedDevOrigins` so a phone can load dev assets; update the IP when the network changes.
- Import alias: `@/*` maps to `src/*`.
- No test script exists; do not claim tests ran.

## Technology

- Next.js 16 App Router
- React and TypeScript
- Phaser 4 (installed) for the game world; the project reference still says Phaser 3
- Tailwind CSS v4
- Shadcn UI for accessible interface components
- `next/font/local` for Neoverse Sans and FKL Dhikk; `next/font/google` for Anek Malayalam
- Typed local data; official venue records are in TypeScript and the official programme/speaker fixtures are JSON
- Git for version control

Add a dependency only when the current milestone needs it. Use the installed Phaser version unless a verified compatibility issue justifies a change.

## Architecture

- Keep Phaser logic separate from React UI.
- Load Phaser client-side only (dynamic import inside a client component; keep it out of server render).
- Use typed venue and session models.
- Keep map positions, collisions, and interaction zones in configurable data, not hardcoded in scenes.
- Use one movement system for keyboard, joystick, and tap-to-move; all inputs must feed the same movement intent and collision handling.
- Communicate between Phaser and React through a documented, typed event interface. Keep the contract in one module; avoid untyped global events and ad-hoc DOM events.
- Keep session browsing usable without entering the game.
- Add a backend only when justified by verified data integration requirements.

### Target structure

Adjust deliberately rather than by accident:

```text
src/app/        routes, layout, global styles
src/components/ React UI: explorer shell, panels, mobile controls
src/game/       Phaser scenes, systems, input, event bridge
src/data/       venues, sessions, map/collision config
src/types/      shared domain and event types
public/assets/  map art, sprites, audio
```

## Domain data rules

- Never invent official venue details, speakers, sessions, or times.
- Use only user-supplied or verifiably official data. If a field is unknown, represent it as missing/`TBD` rather than guessing.
- Keep official content separate from placeholder visuals so real data can be dropped in safely.
- Every venue reference in map config must resolve to a real entry in the venue data; validate this at build time or with a small script.

## Development rules

1. Inspect the existing code before editing.
2. Work in small, testable milestones.
3. Implement the smallest complete feature that satisfies each task.
4. Run appropriate lint, type-check, and build commands after significant changes.
5. Fix errors introduced by your changes.
6. Never claim a command or test passed unless you ran it and verified the result.
7. Never invent official venue details, speakers, sessions, or times.
8. Do not expose credentials or put privileged API keys in client-side code.
9. Preserve working features and avoid unnecessary dependencies.
10. Explain important decisions and list changed files after each task.
11. Ask before destructive operations, deployment, or actions involving real credentials.
12. Prefer accessible, performant, mobile-first UI.

## Commands

```bash
npm run dev          # Next.js dev server
npm run lint         # ESLint
npx tsc --noEmit     # type-check (no dedicated script yet)
npm run build        # production build
npm start            # serve the production build
```

For each milestone: run `npm run lint` and `npx tsc --noEmit`; run `npm run build` before calling the milestone complete. Report the exact commands and outcomes.

## Visual direction

Use the genm.in-inspired system: Neoverse for editorial headings and body copy, FKL Dhikk for uppercase labels, buttons, and numerals, deep indigo/periwinkle/lime/cream surfaces, wave section transitions, rounded cards, and restrained motion. Keep the illustrated beach map and venue markers clear, respect `prefers-reduced-motion`, maintain readable contrast over the artwork, and keep touch targets comfortably sized. Text on brand surfaces uses high-opacity white/cream or deep indigo, and translucent cards stay dark enough to keep normal-text contrast. The map must remain usable at phone widths and in landscape.

## Milestone workflow

Work one milestone at a time. For each milestone:

1. State the goal, scope, and acceptance criteria.
2. Implement only that scope.
3. Verify with lint, type-check, and (when relevant) a production build.
4. Report decisions, verification results, and changed files.
5. Stop for review before starting the next milestone.

## Initial scope and roadmap

Build the playable map first, followed by movement, collisions, venue interactions, session data, navigation, and mobile polish.

- **M1 — Setup and playable placeholder:** client-only Phaser scene, placeholder beach, keyboard movement, camera follow, world bounds, cleanup. Done.
- **M2 — Real map background:** supplied map fitted to world coordinates, calibrated collision geometry, sea/structure blocking, camera scaling. Done; venue anchors remain approximate to the artwork.
- **M3 — Venue interactions:** canonical venue records, markers and interaction zones, proximity prompts, React venue panel, typed event bridge. Done. Official S1–S7 records are verified; map-only facilities are provisional; S7 has no marker because its official map location is to be announced.
- **M4 — Session browser:** typed session models, local fixtures and validation, day/venue filters, session cards, session-to-map linking, official data research. Done. The official 60-session, 182-speaker programme is verified from `https://www.genm.in/sessions`; `/sessions` supports day, venue, and text filters, expandable details, and map deep links. S7 sessions show “Map location TBA” because the official location is unpublished.
- **Design pass — genm.in-inspired UI:** local Neoverse/FKL Dhikk fonts, Anek Malayalam for Malayalam copy, shared site header/footer/action-link/wave components, restyled home, programme, and explorer HUD/panel. Done.
- **M5 — Navigation and mobile controls:** virtual joystick, tap-to-move, walkable pathfinding, minimap/directory, portrait and landscape polish. Done.
- **M6 — Polish and release:** artwork refinement, loading/error states, touch and keyboard accessibility, aspect-ratio testing, lifecycle checks, programme verification, deployment docs. Done; awaiting review.
- No later milestone is defined in the project reference. Future work should come from user review or new requirements.

Do not skip ahead or bundle milestones unless asked. The current milestone is the first item above that is not yet complete.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
