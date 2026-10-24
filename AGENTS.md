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

Verified on 2026-10-24. Update this section when the project foundation changes.

- Fresh `create-next-app` scaffold with a single commit (`81ef69f`), not yet a product implementation.
- Next.js `16.4.3` App Router, React `19.3.0`, TypeScript `strict`, ESLint 9 flat config.
- Tailwind CSS v4 is wired through the `@tailwindcss/turbopack` loader in `next.config.ts`.
- Only the default scaffold page exists (`src/app/page.tsx`); no explorer UI yet.
- **Not installed yet:** Phaser 3, Shadcn UI, a test runner, and any backend/database.
- **Not in the repo yet:** the GEN M venue map artwork and official venue/session data.
- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, and `experimental.agentFeedback`.
- Import alias: `@/*` maps to `src/*`.
- No test script exists; do not claim tests ran.

## Technology

- Next.js 16 App Router
- React and TypeScript
- Phaser 3 for the game world
- Tailwind CSS v4
- Shadcn UI for accessible interface components
- Local JSON data initially
- Git for version control

Add a dependency only when the current milestone needs it. Phaser and Shadcn are planned, not yet present.

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

Use a polished illustrated beach environment, clear venue markers, readable typography, smooth movement, restrained animations, and a compact mobile interface. Respect `prefers-reduced-motion`, maintain readable contrast over the artwork, and keep touch targets comfortably sized. The map must remain usable at phone widths and in landscape.

## Milestone workflow

Work one milestone at a time. For each milestone:

1. State the goal, scope, and acceptance criteria.
2. Implement only that scope.
3. Verify with lint, type-check, and (when relevant) a production build.
4. Report decisions, verification results, and changed files.
5. Stop for review before starting the next milestone.

## Initial scope and roadmap

Build the playable map first, followed by movement, collisions, venue interactions, session data, navigation, and mobile polish.

- **M1 — Map foundation:** typed venue model + static map config, full-viewport Phaser scene rendering the supplied map, visible venue markers, React shell. No movement yet.
- **M2 — Movement and collisions:** one movement system driven by keyboard, mobile joystick, and tap-to-move; collision bounds from data.
- **M3 — Venue interaction and sessions:** proximity/tap interaction, venue panel, typed local session data, session browsing outside the game.
- **M4 — Navigation and mobile polish:** discoverability, accessibility pass, reduced motion, safe areas, performance tuning.

Do not skip ahead or bundle milestones unless asked. The current milestone is the first item above that is not yet complete.
