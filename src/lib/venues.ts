import type { VenueCategory } from "@/types/venue";

export const VENUE_CATEGORY_LABELS: Record<VenueCategory, string> = {
  stage: "Stage",
  expo: "Expo",
  facility: "Facility",
  booth: "Booth",
};

const dayFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/** Formats ISO event days in the event's local calendar. */
export function formatActiveDays(activeDays?: string[]): string | null {
  if (!activeDays?.length) {
    return null;
  }

  return activeDays
    .map((day) => dayFormatter.format(new Date(`${day}T12:00:00+05:30`)))
    .join(" · ");
}
