export type LeaderboardScope = "daily" | "all-time";

export interface LeaderboardRow {
  rank: number;
  displayName: string;
  points: number;
  shells: number;
  checkins: number;
  isYou: boolean;
}
