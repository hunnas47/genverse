import type { ProgrammeDay } from "@/types/session";

/**
 * Official programme metadata.
 *
 * The session fixtures were extracted from the public GEN M programme on
 * https://www.genm.in/sessions on 2026-11-03. The site currently publishes 53
 * sessions across three days and does not publish speaker names.
 */
export const PROGRAMME_SOURCE = "https://www.genm.in/sessions";
export const PROGRAMME_VERIFIED_AT = "2026-11-03";
export const PROGRAMME_NOTICE = "Current official programme";

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
