import type { Venue } from "@/types/venue";

/**
 * Canonical venue records for the venue-map interaction layer.
 *
 * Official stage names, descriptions, active days, and source links were
 * verified from https://www.genm.in/venues on 2026-10-24. Map positions are
 * approximate, calibrated against the final map artwork only.
 *
 * Facilities and expo labels are taken from the supplied map legend and are
 * marked `verification: "supplied-map"`; they are not presented as official
 * venue facts. A2 is intentionally not a separate record: the supplied map
 * uses it as an area label beside S5 (Herverse), and the official venue list
 * has no A2 entry.
 */
export const VENUES: readonly Venue[] = [
  {
    id: "s1",
    name: "Mega Muslim Students Conference",
    mapLabel: "S1",
    description:
      "Sunday's inaugural session and closing talks at the Mega Muslim Students Conference.",
    activeDays: ["2026-11-15"],
    category: "stage",
    officialUrl: "https://www.genm.in/venues/s1",
    mapPosition: { x: 145, y: 690, interactionRadius: 140 },
    verification: "official",
  },
  {
    id: "s2",
    name: "GEN M Literature Fest Stage",
    mapLabel: "S2",
    description:
      "Conversations on faith, history, society, careers, and the future of Gen Z.",
    activeDays: ["2026-11-13", "2026-11-14", "2026-11-15"],
    category: "stage",
    officialUrl: "https://www.genm.in/venues/s2",
    mapPosition: { x: 390, y: 527, interactionRadius: 130 },
    verification: "official",
  },
  {
    id: "s3",
    name: "GEN M lab",
    mapLabel: "S3",
    description:
      "Sessions on Hadith, Fiqh, prophetic history, worship, and religious thought.",
    activeDays: ["2026-11-14", "2026-11-15"],
    category: "stage",
    officialUrl: "https://www.genm.in/venues/s3",
    mapPosition: { x: 919, y: 387, interactionRadius: 125 },
    verification: "official",
  },
  {
    id: "s4",
    name: "GEN M UNPLUGGED",
    mapLabel: "S4",
    description: "Literary conversations and the MSM alumni gathering.",
    activeDays: ["2026-11-14"],
    category: "stage",
    officialUrl: "https://www.genm.in/venues/s4",
    mapPosition: { x: 1077, y: 527, interactionRadius: 120 },
    verification: "official",
  },
  {
    id: "s5",
    name: "HERVERSE",
    mapLabel: "S5",
    description:
      "Gen M SW Girls Space, with girls sessions and conversations on faith, learning, and contemporary life.",
    activeDays: ["2026-11-14", "2026-11-15"],
    category: "stage",
    officialUrl: "https://www.genm.in/venues/s5",
    mapPosition: { x: 1382, y: 578, interactionRadius: 120 },
    verification: "official",
  },
  {
    id: "s6",
    name: "KIDZVERSE",
    mapLabel: "S6",
    description:
      "Gen M Balavedi: gatherings for madrasa kids and conversations on madrasa education.",
    activeDays: ["2026-11-14", "2026-11-15"],
    category: "stage",
    officialUrl: "https://www.genm.in/venues/s6",
    mapPosition: { x: 1226, y: 684, interactionRadius: 120 },
    verification: "official",
  },
  {
    id: "s7",
    name: "NOORVERSE",
    mapLabel: "S7",
    description:
      "Thazkiya sessions, student politics, and conversations on health and the next economy.",
    activeDays: ["2026-11-14", "2026-11-15"],
    category: "stage",
    officialUrl: "https://www.genm.in/venues/s7",
    mapPosition: null,
    verification: "official",
    note: "The official venue page says the map location is to be announced, so S7 has no map marker yet.",
  },
  {
    id: "a1",
    name: "Lost City Expo",
    mapLabel: "A1",
    description: "Expo tent on the beach map.",
    category: "expo",
    mapPosition: { x: 1241, y: 405, interactionRadius: 180 },
    verification: "supplied-map",
  },
  {
    id: "a3",
    name: "Edu Expo",
    mapLabel: "A3",
    description: "Expo area on the beach map.",
    category: "expo",
    mapPosition: { x: 910, y: 535, interactionRadius: 120 },
    verification: "supplied-map",
  },
  {
    id: "b",
    name: "Edu Booths",
    mapLabel: "B",
    description: "Booth cluster on the beach map.",
    category: "booth",
    mapPosition: { x: 470, y: 420, interactionRadius: 150 },
    verification: "supplied-map",
  },
  {
    id: "c",
    name: "Unconference Spaces",
    mapLabel: "C",
    description: "Informal discussion areas on the beach map.",
    category: "facility",
    mapPosition: { x: 777, y: 428, interactionRadius: 150 },
    verification: "supplied-map",
  },
  {
    id: "s-photo",
    name: "Photo Booth",
    mapLabel: "S",
    description: "Photo booth on the beach map.",
    category: "facility",
    mapPosition: { x: 696, y: 270, interactionRadius: 100 },
    verification: "supplied-map",
  },
  {
    id: "o",
    name: "GEN M Office",
    mapLabel: "O",
    description: "Event office on the beach map.",
    category: "facility",
    mapPosition: { x: 787, y: 744, interactionRadius: 110 },
    verification: "supplied-map",
  },
  {
    id: "r",
    name: "Registration",
    mapLabel: "R",
    description: "Registration point on the beach map.",
    category: "facility",
    // Supplied by the event owner; this is the official registration page.
    registrationUrl: "https://www.genm.in/register",
    mapPosition: { x: 580, y: 707, interactionRadius: 100 },
    verification: "supplied-map",
  },
  {
    id: "e",
    name: "Entrance",
    mapLabel: "E",
    description: "Main entrance on the beach map.",
    category: "facility",
    mapPosition: { x: 675, y: 755, interactionRadius: 100 },
    verification: "supplied-map",
  },
  {
    id: "p",
    name: "Parking",
    mapLabel: "P",
    description: "Parking area on the beach map.",
    category: "facility",
    mapPosition: { x: 1048, y: 713, interactionRadius: 140 },
    verification: "supplied-map",
  },
];

const ids = new Set<string>();

for (const venue of VENUES) {
  if (ids.has(venue.id)) {
    throw new Error(`Duplicate venue id: ${venue.id}`);
  }
  ids.add(venue.id);
}

export const VENUES_BY_ID: ReadonlyMap<string, Venue> = new Map(
  VENUES.map((venue) => [venue.id, venue]),
);
