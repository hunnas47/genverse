
# GEN M Interactive Venue Explorer
## Tool-Agnostic Project Specification

**Purpose:** This is the primary project brief and technical reference. Any developer or AI coding agent must read it before modifying the project. Update it when implementation decisions or verified information changes.

- **Project status:** Planning / early implementation
- **Target:** Working MVP
- **Development environment:** Linux Mint
- **Development workflow:** Any suitable editor or AI coding agent, local browser testing, and Git checkpoints
- **Event:** GEN M 2026, Kozhikode Beach, Kerala, India
- **Dates shown in the supplied map:** 13–15 November 2026

Official references:
- Sessions: https://www.genm.in/sessions
- Venues: https://www.genm.in/venues
- Example venue: https://www.genm.in/venues/s2

---

# 1. Project Summary

Build a mobile-responsive, illustrated, top-down 2D interactive venue explorer for GEN M.

Visitors should be able to:

1. Enter an illustrated representation of the GEN M beach venue.
2. Move using keyboard controls, a mobile virtual joystick, or tap-to-move.
3. Explore the environment and approach stages, expo areas, booths, and facilities.
4. Interact with a venue to open its information panel.
5. Browse sessions by event day and time.
6. Search and filter the full programme without entering the game.
7. Select a session and locate its venue on the map.
8. Optionally save sessions to a personal itinerary if this fits the MVP.

**Core principle:** Exploration and information must work together. The experience should feel like a small beach adventure while remaining a fast, accurate, accessible event guide.

Visitors must never be forced to explore the entire map to find a session.

# 2. Confirmed Product Decisions

These decisions were selected by the project owner.

| Decision | Selection |
|---|---|
| Visual style | Top-down 3D pre-rendered, claymation-inspired beach park |
| Movement | Free movement and tap-to-move |
| Map approach | Final 3D pre-rendered beachfront artwork with separate Phaser and React overlays |
| Initial scope | Working MVP first |
| Platform | Responsive website, mobile-first |
| Perspective | Top-down 2D gameplay over pre-rendered 3D art |
| Main interaction | Explore, approach venues, interact, read venue/session details |
| Schedule | Must be accessible without playing the game |
| Development | Local Linux Mint system |
| Workflow | Small tasks, inspect changes, test locally, use Git checkpoints |

Do not change these decisions without a clear technical reason or confirmation from the project owner.

This document is the tool-independent source of truth. Optional tool-specific instruction files should complement it, not contradict it.

# 3. Recommended Technology Stack

Use this stack unless the existing repository has a valid, working alternative.

- **Next.js 16 App Router:** website and routing.
- **React + TypeScript:** interface and typed application logic.
- **Phaser 3:** game world, movement, camera, collisions, and interactions.
- **Tailwind CSS v4:** responsive styling.
- **Shadcn UI:** accessible interface components where useful.
- **Local JSON initially:** venue and session data.
- **Git:** version control and recovery checkpoints.
- **Optional backend:** only if verified data integration or content maintenance requires it.

Do not add a database, authentication, multiplayer, or other infrastructure without a demonstrated need.

## Architecture Principles

- Phaser owns the game loop, movement, camera, collision handling, and proximity interactions.
- React owns venue panels, session cards, filters, navigation, and accessible non-game views.
- Shared TypeScript types define the data contracts.
- A small event bridge connects Phaser and React.
- Phaser must load client-side only, not during Next.js server rendering.
- Clean up Phaser instances and event listeners when components unmount.
- Prevent duplicate game instances during development and hot reload.
- Avoid rerendering the entire React application on every game frame.

# 4. Event and Map Context

The final venue-map image is the geographic reference for the world. It is a
top-down, pre-rendered 3D beach park in a premium claymation-inspired style. It
shows:

- Arabian Sea and golden sand along the upper edge.
- S1 Freedom Square on the far left, with monolithic gray concrete slabs and
  red laterite stone roofing rising out of the beach sand.
- The main entrance at bottom center: an open stone staircase from a green
  decorative arch gateway onto the pink-and-grey circular plaza.
- Walking paths, landscaped areas, stages, expo tents, and pavilions across the
  central park.
- Beach Road along the bottom, with dense coconut palms and traditional
  red-tiled Kerala rooftops below it.
- Entrance, registration, parking, and other facilities.

The final artwork has no baked-in graphic text, labels, or letterbox badges.
All map text is rendered by Phaser and React overlays.

The final map is stored at `public/images/genm-venue-map-final.webp` (with the
source PNG at `public/images/Coastal Park Beachfront Map.png`) and is the active
game background. It is the visual source of truth for future level layout,
positioning logic, UI boundaries, asset placement, and coordinate strategy.

## Venue Legend from the Supplied Map

Official venue data was verified from `https://www.genm.in/venues` on 2026-10-24. Canonical stage IDs S1–S7 and their names are now authoritative. Map positions remain approximate and calibrated from the supplied artwork.

| ID | Official name | Official days | Status |
|---|---|---|---|
| S1 | Mega Muslim Students Conference | 15 Nov 2026 | Official |
| S2 | GEN M Literature Fest Stage | 13–15 Nov 2026 | Official |
| S3 | GEN M lab | 14–15 Nov 2026 | Official |
| S4 | GEN M UNPLUGGED | 14 Nov 2026 | Official |
| S5 | HERVERSE | 14–15 Nov 2026 | Official |
| S6 | KIDZVERSE | 14–15 Nov 2026 | Official |
| S7 | NOORVERSE | 14–15 Nov 2026 | Official; map location to be announced |
| A1 | Lost City Expo | — | Map label, provisional |
| A2 | Herverse area label | — | Not a separate venue; associated with S5 |
| A3 | Edu Expo | — | Map label, provisional |
| S | Photo Booth | — | Map label, provisional |
| O | GEN M Office | — | Map label, provisional |
| R | Registration | — | Map label, provisional; links to official registration |
| E | Entrance | — | Map label, provisional |
| P | Parking | — | Map label, provisional |
| B | Edu Booths | — | Map label, provisional |
| C | Unconference Spaces | — | Map label, provisional |

**Data-quality resolution (2026-10-24):**

- Official stage names replace the earlier interpretations. For example, S1 is the Mega Muslim Students Conference, S3 is GEN M lab, S5 is HERVERSE, S6 is KIDZVERSE, and S7 is NOORVERSE.
- The official venue list has no A2 entry. A2 is treated as an area label associated with S5 (Herverse), not a separate canonical venue.
- The official S7 page says "Map location to be announced." S7 therefore has no marker in the current build.
- Map-only facility and expo labels are stored as `verification: "supplied-map"` in `src/data/venues.ts` and are not presented as official venue facts.

The graphic identifies seven primary stages, S1–S7. Other facilities and expo areas are discoverable on the map but may not have sessions.

## Map-Art Direction

- The final 3D pre-rendered beachfront map is the visual source of truth. Do
  not replace its layout, architecture, or surrounding geography with a
  different art direction.
- Preserve the recognizable geography and relative positions of S1 Freedom
  Square, the bottom-center entrance and central plaza, the beach/sea edge, the
  road, and the palm-and-rooftop foreground.
- Keep venue text, interaction prompts, and UI separate from the background
  artwork. The final art intentionally has no baked-in labels or badges.
- Use separate layers for terrain, structures, interaction zones, and player.
- Base new markers, shells, obstacles, playable bounds, and UI safe areas on the
  final image pixels (`1467 × 1072`).
- Use the owner's `public/images/paths.png` collision sketch as the collision
  reference: `#4D4D4D` marks blocked buildings and venue markers, while
  `#39FF14` marks paths. Include Beach Road and the roadside strip in the
  playable bounds; all other open park space is walkable unless it sits inside
  a dark footprint.
- Do not invent venue details or alter the actual layout merely to improve
  aesthetics.

# 5. MVP Scope

## Required

1. Responsive Next.js application shell.
2. `/explore` page containing a Phaser canvas.
3. Final 3D pre-rendered beach background with Phaser/React map overlays.
4. Player movement with WASD and arrow keys.
5. Camera following and world boundaries.
6. Collision boundaries for blocked areas.
7. Mobile virtual joystick.
8. Tap-to-move on walkable terrain.
9. Configurable venue positions and interaction zones.
10. Venue interaction prompts and information panels.
11. Session data model and local JSON fixtures.
12. Day selection and basic venue/session filters.
13. Session browser usable without the game.
14. Ability to locate or highlight a venue from a selected session.
15. Responsive design and basic accessibility.
16. Lint, type-check, and production-build checks where configured.
17. README with setup and development instructions.

## Defer Until the MVP Works

- Multiplayer or live avatars.
- User accounts and cloud-synced itineraries.
- Complex quests, achievements, or rewards.
- Elaborate crowds and expensive visual effects.
- 3D environments.
- Chat.
- Complex CMS or admin dashboard.
- Backend/database without a demonstrated need.
- Full offline support beyond sensible caching.
- Push notifications.
- Payments or in-app event registration. Linking out to the official registration page is allowed.

Session bookmarking may be added if straightforward, but must not delay the playable map and programme integration.



# 6. User Experience and Routes

Recommended routes:

- `/` — welcome page with event identity and entry points.
- `/explore` — interactive game.
- `/sessions` — searchable programme independent of the game.
- `/venues/[venueId]` — optional venue detail page or deep link.

The homepage should offer:

- Explore Venue
- Browse Sessions
- Venue Directory
- Verified event dates and branding

The explore screen should offer:

- Game canvas.
- Desktop keyboard hints.
- Mobile joystick and interaction button.
- Venue interaction prompt.
- Venue information panel or drawer.
- Minimap or venue-directory toggle when implemented.
- Clear access to the non-game schedule.

Venue information should include, when available:

- Venue name and canonical ID.
- Description and active event days.
- Current or upcoming session when schedule data is reliable.
- Full schedule for the selected day.
- Session title and description.
- Start and end time.
- Confirmed speakers and roles.
- Status: scheduled, to be announced, or cancelled.
- Navigate-to-venue action.
- Official source link.

Do not label a session as happening now unless the event date, local time, and session status are evaluated correctly. Before the event, display upcoming programme information instead.

# 7. Game Controls

## Desktop

- WASD or arrow keys: move.
- E or Enter: interact with the nearest venue when in range.
- Escape: close an open panel where appropriate.
- Mouse click: select a destination or venue when supported.

## Mobile

- Virtual joystick for free movement.
- Large interaction button.
- Tap-to-move on walkable terrain.
- Tap venue markers or directory entries to view information.
- Responsive panels that do not cover all critical controls.

## Unified Movement System

Keyboard, joystick, and tap-to-move must feed the same movement system. Avoid separate implementations with inconsistent collision handling or movement speeds.

For tap-to-move:

- Use a navigation grid or graph for walkable space.
- Calculate paths around obstacles.
- Stop or report no path if the destination is inaccessible.
- Never move through structures or the sea.
- A direct-line approach is acceptable only as a temporary prototype if it stops at obstacles.

# 8. Map Coordinates, Layers, and Collisions

Store map locations in world coordinates, not CSS pixel positions.

Illustrative data model:

```json
{
  "world": {
    "width": 2400,
    "height": 1400
  },
  "venues": [
    {
      "id": "s1",
      "name": "Main Stage",
      "x": 0.18,
      "y": 0.43,
      "radius": 0.035
    }
  ]
}
```

These coordinates are placeholders, not measured positions from the real map. Calibrate all positions against the supplied image before using them.

Recommended map layers:

1. Base environment: sea, sand, grass, roads, paths.
2. Structures: stages, expo areas, booths, facilities.
3. Collision geometry, separate from visual artwork.
4. Venue markers and interaction zones.
5. Player and animated entities.
6. UI overlay: prompts, minimap, and React panels.

Normalized coordinates can be converted into world coordinates using the world width and height. Keep collision geometry in world space and let the camera control the viewport.

Do not use the entire map image as a single collision rectangle. That would block the entire world. Use polygons, rectangles, tile layers, collision masks, or another maintainable representation of walkable and blocked areas.

# 9. Venue and Session Data

Use canonical venue IDs consistently throughout the game, venue directory, session data, and navigation.

Suggested TypeScript types:

```typescript
export interface Venue {
  id: string;
  name: string;
  description?: string;
  mapPosition: {
    x: number;
    y: number;
  };
  interactionRadius: number;
  activeDays: string[];
  category: "stage" | "expo" | "facility" | "booth";
  officialUrl?: string;
}

export interface Session {
  id: string;
  venueId: string;
  title: string;
  description?: string;
  day: string;
  startTime: string;
  endTime: string;
  speakers: {
    name: string;
    role?: string;
  }[];
  status: "scheduled" | "tba" | "cancelled";
  officialUrl?: string;
}
```

These are initial contracts. Adapt them to the actual source data. Sessions may have source-specific IDs, missing end times, or different speaker structures. Preserve useful source information and normalize it in a data adapter.

## Data Rules

- Every session must reference a valid venue ID.
- Never invent titles, speakers, descriptions, or times.
- Mark missing information as “To be announced” or omit it.
- Show cancelled sessions clearly.
- Sort sessions by event day and start time.
- Use `Asia/Kolkata` for event-local display.
- Avoid interpreting local schedule times as UTC.
- Keep data separate from Phaser scene code.
- Data corrections should not require changing the game engine.

Suggested files:

- `src/data/venues.json`
- `src/data/sessions.json`
- `src/data/map-layout.json`

Clearly label mock data during development. Never present placeholder programme data as official.

# 10. Official Data Integration

Official references:

- https://www.genm.in/sessions
- https://www.genm.in/venues
- https://www.genm.in/venues/s2

The website is the intended source of programme information, but the method of access and completeness must be verified.

Recommended procedure:

1. Inspect the public pages and how their visible data is rendered.
2. Determine whether an official, supported public API or structured data interface exists.
3. Check for an authorized export or other maintainable source.
4. Compare the session listing with individual venue pages to check completeness.
5. Normalize verified data into the application's typed models.
6. Implement the adapter in `src/lib/official-data-adapter.ts`.
7. Validate missing venue references, malformed times, duplicates, and incomplete records.
8. Document how data is refreshed and corrected.

Do not rely on undocumented endpoints without understanding their stability and authorization. Do not bypass access controls or expose admin credentials, cookies, tokens, or privileged API keys. Do not assume the public listing contains every session.

Start with local JSON fixtures so game development can proceed while data integration is researched.

If a backend becomes necessary:

- Keep secrets server-side.
- Never expose service-role keys in client-side bundles.
- Use minimum necessary permissions.
- Document why the backend is needed.
- Do not add authentication without a real user requirement.

# 11. React–Phaser Event Bridge

Use a small, typed event interface rather than tightly coupling React to Phaser internals.

Suggested events:

- `venue:interact` — player or user selects a venue.
- `venue:nearby` — player enters or leaves an interaction radius.
- `navigation:request` — UI requests movement to a target.
- `navigation:arrived` — player reaches the destination.
- `game:ready` — game scene is ready.
- `game:error` — recoverable initialization or loading error occurs.

Example payload:

```typescript
type VenueInteractPayload = {
  venueId: string;
};
```

Implementation guidance:

- Define event names and payload types centrally, e.g. `src/game/events.ts`.
- Subscribe and unsubscribe cleanly in React hooks.
- Avoid leaking listeners on repeated mounts.
- Clean up callbacks correctly.
- Let React look up venue and session data by ID.
- Let Phaser own player coordinates and physics.
- Let React own active panels and selected filters.
- Avoid rerendering the entire UI on every game frame.



# 12. Recommended Repository Structure

This is a target structure, not a requirement to create every file immediately. Build incrementally and preserve any existing working structure.

```text
genm-explorer/
├── README.md
├── GENM_EXPLORER_PROJECT_REFERENCE.md
├── public/
│   ├── images/
│   │   ├── genm-logo.svg
│   │   └── genm-venue-map-final.webp
│   └── game/
│       ├── map/
│       │   ├── beach-base.png
│       │   ├── beach-overlay.png
│       │   └── collision-mask.png
│       ├── characters/
│       ├── objects/
│       └── ui/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── explore/page.tsx
│   │   ├── sessions/page.tsx
│   │   ├── venues/[venueId]/page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameCanvas.tsx
│   │   │   ├── GameLoader.tsx
│   │   │   ├── GameControls.tsx
│   │   │   ├── VirtualJoystick.tsx
│   │   │   └── MiniMap.tsx
│   │   ├── venues/
│   │   │   ├── VenuePanel.tsx
│   │   │   ├── VenueCard.tsx
│   │   │   └── VenueDirectory.tsx
│   │   ├── sessions/
│   │   │   ├── SessionBrowser.tsx
│   │   │   ├── SessionCard.tsx
│   │   │   └── DaySelector.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── MobileNavigation.tsx
│   ├── game/
│   │   ├── config.ts
│   │   ├── events.ts
│   │   ├── scenes/
│   │   │   ├── BootScene.ts
│   │   │   └── BeachScene.ts
│   │   ├── entities/
│   │   │   └── Player.ts
│   │   ├── systems/
│   │   │   ├── MovementSystem.ts
│   │   │   ├── CollisionSystem.ts
│   │   │   ├── InteractionSystem.ts
│   │   │   └── NavigationSystem.ts
│   │   └── map/
│   │       ├── MapLoader.ts
│   │       └── CoordinateUtils.ts
│   ├── data/
│   │   ├── venues.json
│   │   ├── sessions.json
│   │   └── map-layout.json
│   ├── lib/
│   │   ├── sessions.ts
│   │   ├── venues.ts
│   │   ├── schedule-utils.ts
│   │   └── official-data-adapter.ts
│   ├── hooks/
│   │   ├── useGameEvents.ts
│   │   └── useSavedSessions.ts
│   └── types/
│       ├── venue.ts
│       ├── session.ts
│       └── game.ts
└── tests/
```

A simpler structure is acceptable for the first milestone. Do not create empty abstractions without a present use.

# 13. Development Milestones

## Milestone 1 — Project Setup and Playable Placeholder

- Initialize Next.js, TypeScript, Tailwind, Phaser, and Shadcn UI.
- Add `/explore`.
- Load Phaser client-side.
- Draw a simple placeholder beach with ocean, sand, grass, paths, and venue shapes.
- Add a placeholder character with WASD/arrow-key movement.
- Add camera following and world boundaries.
- Ensure resize and React cleanup work correctly.
- Run available lint, type-check, and build checks.

**Acceptance:** `/explore` loads and a character can move around the placeholder world.

## Milestone 2 — Real Map Background

- Add the supplied venue map to the repository.
- Fit the image into a world-coordinate system.
- Calibrate map dimensions and venue coordinates.
- Define walkable and blocked areas.
- Add collision boundaries.
- Verify camera movement and scaling.

**Acceptance:** the character can move around the recognizable map without crossing major blocked areas.

## Milestone 3 — Venue Interactions

- Add canonical venue records.
- Place markers and interaction zones.
- Add proximity detection and prompts.
- Add the React venue panel.
- Implement the typed event bridge.

**Acceptance:** every configured venue can be selected and opens the correct panel.

## Milestone 4 — Session Browser

- Create venue and session data models.
- Add local JSON fixtures and validation.
- Implement day and venue filters.
- Add session cards and details.
- Link sessions to map locations.
- Verify official data availability and implement an adapter if feasible.

**Acceptance:** visitors can browse sessions independently and locate the associated venue.

## Milestone 5 — Navigation and Mobile Controls

- Add virtual joystick.
- Add tap-to-move.
- Implement walkable route finding.
- Add a minimap or compact venue directory.
- Make panels and controls work in portrait and landscape.

**Acceptance:** navigation works on mobile and the player does not cross obstacles.

## Milestone 6 — Polish and Release

- Refine illustrations and venue landmarks.
- Improve loading and error states.
- Test keyboard and touch accessibility.
- Test small screens and different aspect ratios.
- Check game lifecycle and duplicate instances.
- Verify programme accuracy.
- Document setup and deployment.

**Acceptance:** the site works on mobile and desktop, the schedule is usable without the game, and no known critical defects remain.

# 14. Linux Mint Development Workflow

Use any editor, terminal, or AI coding agent that can inspect and modify the repository and run local commands.

If the project has not yet been created:

```bash
mkdir -p ~/Projects
cd ~/Projects
npx create-next-app@latest genm-explorer
cd genm-explorer
npm install phaser
npx shadcn@latest init
git init
```

Choose TypeScript, App Router, Tailwind CSS, and a `src/` directory in the project wizard. Check Node.js and npm versions first and use a current supported Node.js LTS release.

Run your chosen coding agent from the repository root, or otherwise give it access to the project and this reference file.

Typical development commands:

```bash
npm run dev
npm run lint
npm run build
```

Check `package.json` before assuming these scripts exist. If type-checking is not configured, use the project's TypeScript compiler command as appropriate.

## Development-Agent Operating Rules

- Read this reference and any relevant repository instructions before changing code.
- Inspect existing files before editing.
- Work in small, independently testable milestones.
- Explain the approach before major changes.
- Make the smallest complete change that satisfies the task.
- Run relevant checks and report actual results.
- Never claim a command passed unless it was executed.
- Preserve working features.
- Avoid broad refactors unless required.
- Do not overwrite configuration without a clear reason.
- Ask before destructive operations, deployment, or actions involving real credentials.
- Review diffs and commit working checkpoints with Git.

Suggested commit messages:

- `Initial project setup`
- `Add playable beach prototype`
- `Load venue map background`
- `Add venue interactions`
- `Add session browser`
- `Implement mobile controls`


# 15. Testing and Quality Checklist

## Game

- [ ] WASD movement works.
- [ ] Arrow-key movement works.
- [ ] Virtual joystick works on touchscreens.
- [ ] Tap-to-move avoids blocked areas.
- [ ] Camera follows the player and respects world bounds.
- [ ] Player cannot cross major obstacles.
- [ ] Venue interaction zones open the correct venue.
- [ ] Repeated React mounts do not create duplicate Phaser instances.
- [ ] Event listeners are removed on cleanup.

## Programme

- [ ] All official event days are represented correctly.
- [ ] Session dates and times match the verified source.
- [ ] Venue IDs resolve to valid venue records.
- [ ] Filters work together.
- [ ] Missing speakers are not fabricated.
- [ ] Cancelled and TBA sessions are clearly represented.
- [ ] Selecting a session locates the correct venue.
- [ ] The schedule works without entering the game.

## Responsive UI and Accessibility

- [ ] Canvas fits portrait and landscape screens.
- [ ] UI remains usable on small mobile devices.
- [ ] Touch targets are sufficiently large.
- [ ] Keyboard users can use the schedule and panels.
- [ ] Text contrast and focus indicators are clear.
- [ ] Loading and error states are understandable.
- [ ] Game interaction is not the only way to access event information.

## Engineering

- [ ] TypeScript checks pass.
- [ ] Lint passes.
- [ ] Production build passes.
- [ ] No privileged keys are shipped to the browser.
- [ ] No unverified official data is presented as fact.
- [ ] README documents setup and commands.

# 16. Visual Design Guidelines

- Use an illustrated, welcoming coastal environment.
- Clearly distinguish ocean, beach, paths, grass, structures, and roads.
- Use readable venue labels and markers.
- Make venue signs identifiable without obstructing movement.
- Keep controls compact and usable.
- Use a responsive bottom sheet/drawer on mobile and a panel on wider screens.
- Maintain consistent spacing and typography.
- Use restrained transitions and animation; prioritize performance.
- Keep important information accessible outside the game canvas.
- Avoid elaborate artwork until movement, map geometry, and interactions are reliable.

The final map is the visual source of truth for geography and location placement. Future artwork or UI must not make the actual venue layout misleading.

# 17. Performance and Reliability

- Use a reasonable game resolution and responsive Phaser scale configuration.
- Avoid rerendering React on every game frame.
- Load images and sprites efficiently.
- Keep world geometry separate from decorative artwork.
- Dispose of Phaser instances and listeners correctly.
- Handle asset-loading failures with a visible fallback.
- Avoid excessive particles and animations on mobile.
- Keep session filtering local and fast for a small event schedule.
- Add caching or PWA behavior only when it can be tested and does not compromise schedule freshness.
- Provide a clear method for refreshing programme data when it changes.

# 18. Security and Data Integrity

- Never put secret API keys, administrator credentials, cookies, or tokens in frontend code.
- Do not bypass access controls or retrieve private data without authorization.
- Prefer official or authorized data interfaces.
- Validate all imported programme records.
- Treat external data as untrusted input.
- Do not claim the application is an official GEN M product unless authorization and branding approval are confirmed.
- Use event branding and official content responsibly.
- Never invent speaker identities, session descriptions, venue labels, or programme times.
- Keep sample data clearly marked as mock data until verified.

# 19. First Implementation Task

Milestones 1–3 are complete. Read `AGENTS.md` and this reference, inspect the repository, and implement the current milestone only. Do not bundle later milestones.

Suggested prompt:

> Read `GENM_EXPLORER_PROJECT_REFERENCE.md` and `AGENTS.md`. Inspect the repository. Implement the current milestone only: the typed session browser, official session fixtures and validation, day/venue filters, session cards, and session-to-map linking. Do not invent session details, speakers, or times; use only verified official data and represent unknown fields as missing/TBD. Run `npm run lint`, `npx tsc --noEmit`, and `npm run build`. Fix errors introduced by your changes and report files changed, checks actually run, and remaining issues.

Proceed one milestone at a time. Do not ask the agent to build the entire application in one pass.

# 20. Decisions Still Requiring Verification

These are open questions, not established facts. Item 2 was resolved on 2026-10-24.

1. Exact coordinates and dimensions of all venue locations on the final map. Current anchors are approximate and calibrated from the artwork.
2. Canonical official labels and duplicate/overlapping labels. Resolved for S1–S7 from `https://www.genm.in/venues`; A2 is treated as an area label associated with S5 (Herverse), and map-only facility labels remain provisional.
3. The complete official session dataset and how it can be accessed reliably.
4. Whether an officially supported public API or export exists.
5. Whether session speakers, descriptions, or times remain unpublished.
6. Whether deployment will use the official GEN M domain or a separate domain.
7. Whether the final artwork will remain a hybrid image-based map or transition to fully custom tiles and illustrations.

Resolve these by inspecting the supplied map, official pages, and actual repository. Do not fill gaps with guesses.

# 21. Definition of Success

The MVP succeeds when a visitor can open the site on a phone or computer, explore a recognizable illustrated GEN M beach venue, move with free controls or tap-to-move, discover a venue, open its information, browse verified sessions, and navigate from a selected session to its location.

The site must also provide a fast, accessible session browser without requiring game interaction.

**Development priority:** working movement → accurate map → venue interactions → verified programme → mobile polish → decorative enhancements.

