import type { VenueMapConfig } from "@/types/map";

/**
 * World geometry for the supplied GEN M venue map.
 *
 * World units match the source image pixels 1:1. Obstacle footprints are
 * approximate and were calibrated against the visible artwork only; they are
 * not canonical venue records. Venue identities will be added in the
 * interaction milestone after their positions and labels are verified.
 *
 * The no-legend image is used as the game background. The image already
 * contains venue labels, so no additional official data is asserted here.
 */
export const VENUE_MAP: VenueMapConfig = {
  image: {
    src: "/images/GEN-M-venue-map.jpg",
    width: 1989,
    height: 1453,
  },
  world: { width: 1989, height: 1453 },
  playableBounds: { x: 20, y: 415, width: 1949, height: 1020 },
  player: { radius: 18, speed: 240 },
  spawn: { x: 882, y: 1000 },
  obstacles: [
    // Far-left building and S1 main stage block.
    { kind: "rect", x: 0, y: 630, width: 275, height: 222 },
    { kind: "rect", x: 298, y: 628, width: 160, height: 224 },

    // S2 stage.
    { kind: "circle", x: 570, y: 765, radius: 78 },

    // Photo booth (S) and the small B booth cluster.
    { kind: "rect", x: 852, y: 500, width: 64, height: 68 },
    { kind: "circle", x: 548, y: 612, radius: 24 },
    { kind: "circle", x: 605, y: 602, radius: 24 },
    { kind: "circle", x: 658, y: 632, radius: 24 },
    { kind: "circle", x: 720, y: 640, radius: 24 },
    { kind: "circle", x: 658, y: 680, radius: 24 },
    { kind: "circle", x: 723, y: 715, radius: 24 },

    // Amphitheatre seating and registration.
    { kind: "rect", x: 610, y: 865, width: 145, height: 80 },
    { kind: "rect", x: 770, y: 868, width: 68, height: 62 },

    // Office and the two structures beside the central walkway.
    { kind: "rect", x: 978, y: 838, width: 57, height: 158 },
    { kind: "rect", x: 1055, y: 803, width: 52, height: 82 },
    { kind: "rect", x: 1085, y: 860, width: 140, height: 130 },

    // Lost City Expo tent and the circular lab.
    { kind: "rect", x: 1360, y: 462, width: 505, height: 113 },
    { kind: "circle", x: 1206, y: 610, radius: 50 },

    // Unplugged zone and the fenced expo compound.
    { kind: "circle", x: 1438, y: 764, radius: 30 },
    { kind: "rect", x: 1512, y: 690, width: 320, height: 240 },
  ],
};
