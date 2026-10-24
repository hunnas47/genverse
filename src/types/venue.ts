export type VenueCategory = "stage" | "expo" | "facility" | "booth";

/**
 * "official" means the venue identity and name were checked against the
 * official GEN M site. "supplied-map" means the label comes from the supplied
 * map artwork and is provisional.
 */
export type VenueVerification = "official" | "supplied-map";

export interface VenueMapPosition {
  x: number;
  y: number;
  interactionRadius: number;
}

export interface Venue {
  id: string;
  name: string;
  mapLabel: string;
  description?: string;
  /** ISO dates in the event's Asia/Kolkata calendar. */
  activeDays?: string[];
  category: VenueCategory;
  officialUrl?: string;
  /** Null when the official location is not yet published. */
  mapPosition: VenueMapPosition | null;
  verification: VenueVerification;
  note?: string;
}
