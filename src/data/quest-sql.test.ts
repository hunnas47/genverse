import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { SHELL_SETS } from "@/data/quest";
import { VENUES } from "@/data/venues";

const MIGRATIONS_DIR = "supabase/migrations";

function readMigrations(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(MIGRATIONS_DIR, file), "utf8"))
    .join("\n");
}

function blockBetween(
  sql: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = sql.indexOf(startMarker);

  if (start === -1) {
    throw new Error(`Missing SQL marker: ${startMarker}`);
  }

  const end = sql.indexOf(endMarker, start);

  if (end === -1) {
    throw new Error(`Missing SQL end marker: ${endMarker}`);
  }

  return sql.slice(start, end);
}

describe("Beach Quest SQL seeds", () => {
  const sql = readMigrations();

  it("matches the TypeScript shell sets", () => {
    const setSeed = blockBetween(
      sql,
      "insert into public.quest_shell_sets",
      "on conflict (set_index)",
    );
    const setRows = [...setSeed.matchAll(/\((\d+),\s*'([^']+)',\s*'([^']+)'\)/g)].map(
      (match) => ({
        setIndex: Number(match[1]),
        setId: match[2],
        name: match[3],
      }),
    );

    expect(setRows).toEqual(
      SHELL_SETS.map((set, index) => ({
        setIndex: index,
        setId: set.id,
        name: set.name,
      })),
    );

    const shellSeed = blockBetween(
      sql,
      "insert into public.quest_shells",
      "on conflict (set_index, shell_id)",
    );
    const shellRows = [
      ...shellSeed.matchAll(/\((\d+),\s*'([^']+)'\)/g),
    ].map((match) => ({
      setIndex: Number(match[1]),
      shellId: match[2],
    }));

    expect(shellRows).toEqual(
      SHELL_SETS.flatMap((set, index) =>
        set.shells.map((shell) => ({
          setIndex: index,
          shellId: shell.id,
        })),
      ),
    );
  });

  it("matches venues that have a map position", () => {
    const venueSeed = blockBetween(
      sql,
      "insert into public.quest_venues",
      "on conflict (venue_id)",
    );
    const venueIds = [...venueSeed.matchAll(/\('([^']+)'\)/g)].map(
      (match) => match[1],
    );

    expect(venueIds).toEqual(
      VENUES.filter((venue) => venue.mapPosition).map((venue) => venue.id),
    );
  });
});
