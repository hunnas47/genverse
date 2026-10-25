import type { ProgrammeDay } from "@/types/session";

/**
 * Official programme metadata.
 *
 * The session and speaker fixtures were extracted from the public GEN M
 * programme on https://www.genm.in/sessions and cross-checked against the
 * individual venue pages on 2026-10-25. The site labels the current programme
 * as the final programme.
 */
export const PROGRAMME_SOURCE = "https://www.genm.in/sessions";
export const PROGRAMME_VERIFIED_AT = "2026-10-25";
export const PROGRAMME_NOTICE = "Final programme";

export const PROGRAMME_DAYS: readonly ProgrammeDay[] = [
  {
    id: "nov-13",
    date: "2026-11-13",
    label: "Nov 13",
    displayDate: "Friday, 13 November 2026",
  },
  {
    id: "nov-14",
    date: "2026-11-14",
    label: "Nov 14",
    displayDate: "Saturday, 14 November 2026",
  },
  {
    id: "nov-15",
    date: "2026-11-15",
    label: "Nov 15",
    displayDate: "Sunday, 15 November 2026",
  },
];
