import type { VenueMapConfig } from "@/types/map";
import type { VenueCategory } from "@/types/venue";

/**
 * Shared marker colors for the Phaser map and the React minimap. Numeric values
 * keep Phaser's graphics API simple; the minimap converts them to CSS colors.
 */
export const VENUE_MARKER_COLORS: Record<VenueCategory, number> = {
  stage: 0xf7c873,
  expo: 0xe86a4a,
  facility: 0x7bd3c8,
  booth: 0x8fa7ff,
};

/**
 * Text colors chosen per marker fill so the two-letter map label stays legible
 * at world scale.
 */
export const VENUE_MARKER_TEXT_COLORS: Record<VenueCategory, string> = {
  stage: "#2c2d6f",
  expo: "#ffffff",
  facility: "#17343e",
  booth: "#1c1d3a",
};

/**
 * World geometry for the final GEN M beachfront map.
 *
 * World units match the source image pixels 1:1. The artwork is a top-down,
 * pre-rendered 3D beach park: S1 Freedom Square on the far left, the green
 * entrance arch and central staircase at bottom center, the Arabian Sea and
 * golden beach along the top, and Beach Road with palms and red-tiled Kerala
 * rooftops below.
 *
 * `public/images/paths.png` is the owner's collision sketch: #4D4D4D marks
 * blocked buildings and venue markers, while #39FF14 marks paths. The playable
 * bounds include Beach Road and the roadside strip so the road is walkable; all
 * other open park space is walkable unless it sits inside a dark footprint.
 * Obstacle footprints are approximate to the sketch, not canonical venue
 * records. Venue identities and interaction anchors live in
 * `src/data/venues.ts`.
 *
 * The final image has no baked-in labels or badges, so all map text is drawn by
 * the game and React overlays.
 */
export const VENUE_MAP: VenueMapConfig = {
  image: {
    src: "/images/genm-venue-map-final.webp",
    width: 1467,
    height: 1072,
  },
  world: { width: 1467, height: 1072 },
  // Bottom 900 includes Beach Road and the roadside green path.
  playableBounds: { x: 18, y: 225, width: 1431, height: 675 },
  player: { radius: 18, speed: 240 },
  // Centred on the entrance walkway and the paths.png route through the gate.
  spawn: { x: 658, y: 770 },
  obstacles: [
    // S1 Freedom Square (paths.png component 1).
    { kind: "rect", x: 52, y: 242, width: 220, height: 459 },

    // B Edu Booth cluster (components 3, 7-15, 17).
    { kind: "circle", x: 362, y: 359, radius: 25 },
    { kind: "circle", x: 441, y: 389, radius: 18 },
    { kind: "circle", x: 391, y: 403, radius: 17 },
    { kind: "circle", x: 517, y: 403, radius: 15 },
    { kind: "circle", x: 478, y: 404, radius: 15 },
    { kind: "circle", x: 416, y: 421, radius: 17 },
    { kind: "circle", x: 583, y: 430, radius: 17 },
    { kind: "circle", x: 444, y: 433, radius: 18 },
    { kind: "circle", x: 478, y: 437, radius: 17 },
    { kind: "circle", x: 546, y: 442, radius: 17 },
    { kind: "rect", x: 490, y: 446, width: 51, height: 81 },

    // S2 Literature Fest stage and amphitheatre (components 19, 24).
    { kind: "circle", x: 390, y: 527, radius: 61 },
    { kind: "rect", x: 376, y: 618, width: 152, height: 68 },

    // Photo booth (component 2).
    { kind: "rect", x: 660, y: 242, width: 73, height: 56 },

    // C Unconference tents (components 6, 16).
    { kind: "circle", x: 738, y: 389, radius: 38 },
    { kind: "circle", x: 816, y: 467, radius: 38 },

    // A3 Edu Expo tent (component 20).
    { kind: "rect", x: 877, y: 506, width: 66, height: 58 },

    // S3 GEN M lab dome (component 4).
    { kind: "circle", x: 919, y: 387, radius: 49 },

    // S4 Unplugged stage (component 18). The tall ellipse is blocked as a
    // rectangle so the path between it and the purple pavilions stays wide
    // enough for the player.
    { kind: "rect", x: 1036, y: 461, width: 82, height: 132 },

    // A1 Lost City Expo compound (component 5).
    { kind: "rect", x: 1043, y: 350, width: 396, height: 110 },

    // Purple pavilions (components 21, 22, 26, 28) and the central round
    // pavilion (component 23). 21 and 28 are unlabelled structures; 22 is S5
    // (HERVERSE) and 26 is S6 (KIDZVERSE).
    { kind: "rect", x: 1184, y: 528, width: 78, height: 65 },
    { kind: "rect", x: 1348, y: 536, width: 69, height: 85 },
    { kind: "rect", x: 1190, y: 638, width: 72, height: 93 },
    { kind: "rect", x: 1339, y: 650, width: 78, height: 81 },
    { kind: "circle", x: 1299, y: 617, radius: 36 },

    // Parking (component 27).
    { kind: "rect", x: 969, y: 650, width: 158, height: 127 },

    // Office and the adjoining white tent (component 25, split into the two
    // touching buildings so the green path between them stays open).
    { kind: "rect", x: 840, y: 628, width: 69, height: 72 },
    { kind: "rect", x: 734, y: 700, width: 106, height: 89 },

    // Registration (component 29).
    { kind: "rect", x: 545, y: 678, width: 69, height: 58 },

    // Entrance gateway side walls. Keep the full walkway between the teal
    // columns open; the old inset rectangles blocked the left half of the gate.
    { kind: "rect", x: 604, y: 730, width: 14, height: 50 },
    { kind: "rect", x: 694, y: 730, width: 14, height: 50 },

    // Bottom-left building that enters the road-level playable strip
    // (component 31). The bottom-right building (component 32) starts below
    // the playable bounds.
    { kind: "rect", x: 0, y: 846, width: 188, height: 54 },
  ],
};
