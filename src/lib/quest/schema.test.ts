import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const MIGRATIONS_DIR = "supabase/migrations";
const SQL = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(MIGRATIONS_DIR, file), "utf8"))
  .join("\n");

const USER_ONE = "00000000-0000-0000-0000-000000000001";
const USER_TWO = "00000000-0000-0000-0000-000000000002";

let db: PGlite;

async function asUser(userId: string): Promise<void> {
  await db.exec(`set request.jwt.claim.sub = '${userId}'`);
}

async function createUser(userId: string): Promise<void> {
  await db.query("insert into auth.users (id) values ($1)", [userId]);
}

async function callRpc<T>(name: string, ...args: unknown[]): Promise<T> {
  const placeholders = args.map((_, index) => `$${index + 1}`).join(", ");
  const result = await db.query<{ r: T }>(
    `select public.${name}(${placeholders}) as r`,
    args,
  );

  return result.rows[0].r;
}

async function today(): Promise<string> {
  const result = await db.query<{ d: string }>(
    "select public.quest_today()::text as d",
  );

  return result.rows[0].d;
}

async function activeShellIds(): Promise<string[]> {
  const period = await today();
  const result = await db.query<{ i: number }>(
    "select public.quest_set_index($1) as i",
    [period],
  );
  const shells = await db.query<{ shell_id: string }>(
    "select shell_id from public.quest_shells where set_index = $1 order by shell_id",
    [result.rows[0].i],
  );

  return shells.rows.map((row) => row.shell_id);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create role anon;
    create role authenticated;
  `);

  await db.exec(SQL);
  // The migration should be safe to run twice against the same project.
  await db.exec(SQL);
});

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await db.exec("delete from auth.users;");
});

describe("Beach Quest SQL migration", () => {
  it("validates names and keeps display names unique", async () => {
    await createUser(USER_ONE);
    await createUser(USER_TWO);
    await asUser(USER_ONE);

    expect(await callRpc("join_quest", "A")).toMatchObject({
      ok: false,
      reason: "invalid-name",
    });
    expect(await callRpc("join_quest", "admin")).toMatchObject({
      ok: false,
      reason: "invalid-name",
    });
    expect(await callRpc("join_quest", "Ayesha K")).toMatchObject({
      ok: true,
      display_name: "Ayesha K",
    });

    await asUser(USER_TWO);
    expect(await callRpc("join_quest", "AYESHA K")).toMatchObject({
      ok: false,
      reason: "name-taken",
    });
  });

  it("collects a shell once, enforces the cooldown, and checks in venues", async () => {
    const shells = await activeShellIds();

    await createUser(USER_ONE);
    await asUser(USER_ONE);
    await callRpc("join_quest", "Ayesha K");

    expect(await callRpc("collect_shell", shells[0])).toMatchObject({
      accepted: true,
      points: 10,
      bonus_points: 0,
      today_points: 10,
    });
    expect(await callRpc("collect_shell", shells[0])).toMatchObject({
      accepted: false,
      reason: "already-collected",
    });
    expect(await callRpc("collect_shell", shells[1])).toMatchObject({
      accepted: false,
      reason: "cooldown",
    });

    expect(await callRpc("check_in_venue", "s1")).toMatchObject({
      accepted: true,
      points: 25,
      today_points: 35,
    });
    expect(await callRpc("check_in_venue", "s1")).toMatchObject({
      accepted: false,
      reason: "already-checked-in",
    });
    expect(await callRpc("check_in_venue", "s7")).toMatchObject({
      accepted: false,
      reason: "unknown-venue",
    });

    const state = await callRpc<{
      today_points: number;
      total_points: number;
      collected_shell_ids: string[];
      checked_in_venue_ids: string[];
      streak: number;
    }>("get_my_quest_state");

    expect(state).toMatchObject({
      today_points: 35,
      total_points: 35,
      collected_shell_ids: [shells[0]],
      checked_in_venue_ids: ["s1"],
      streak: 1,
    });
  });

  it("keeps guest points when the player chooses a name later", async () => {
    const shells = await activeShellIds();

    await createUser(USER_ONE);
    await asUser(USER_ONE);

    expect(await callRpc("collect_shell", shells[0])).toMatchObject({
      accepted: true,
    });

    const guestState = await callRpc<{
      player: { display_name: string } | null;
      total_points: number;
    }>("get_my_quest_state");

    expect(guestState.player?.display_name).toBe("");
    expect(guestState.total_points).toBe(10);

    await callRpc("join_quest", "Noor");

    const namedState = await callRpc<{
      player: { display_name: string } | null;
      total_points: number;
    }>("get_my_quest_state");

    expect(namedState.player?.display_name).toBe("Noor");
    expect(namedState.total_points).toBe(10);
  });

  it("awards the set bonus once and ranks the leaderboard", async () => {
    const shells = await activeShellIds();
    const period = await today();

    await createUser(USER_ONE);
    await createUser(USER_TWO);

    await asUser(USER_ONE);
    await callRpc("join_quest", "Ayesha K");
    await callRpc("collect_shell", shells[0]);
    await callRpc("check_in_venue", "s1");

    await asUser(USER_TWO);
    await callRpc("join_quest", "Noor");

    // Seed nine finds in the past, then let the RPC award the bonus on the
    // tenth. Direct inserts are only possible here because this is a superuser
    // test harness; clients cannot write quest_events.
    for (const shellId of shells.slice(0, 9)) {
      await db.query(
        `insert into public.quest_events
          (player_id, kind, ref, period_id, points, created_at)
         values ($1, 'shell', $2, $3, 10, now() - interval '10 seconds')`,
        [USER_TWO, shellId, period],
      );
    }

    const lastFind = await callRpc<{
      accepted: boolean;
      bonus_points: number;
      today_points: number;
    }>("collect_shell", shells[9]);

    expect(lastFind).toMatchObject({
      accepted: true,
      bonus_points: 50,
      today_points: 150,
    });

    const daily = await db.query<{
      rank: number;
      display_name: string;
      points: number;
      shells: number;
      checkins: number;
      is_you: boolean;
    }>("select * from public.get_leaderboard('daily', 10)");

    expect(daily.rows).toEqual([
      {
        rank: 1,
        display_name: "Noor",
        points: 150,
        shells: 10,
        checkins: 0,
        is_you: true,
      },
      {
        rank: 2,
        display_name: "Ayesha K",
        points: 35,
        shells: 1,
        checkins: 1,
        is_you: false,
      },
    ]);

    const allTime = await db.query<{ display_name: string; points: number }>(
      "select display_name, points from public.get_leaderboard('all-time', 10)",
    );

    expect(allTime.rows).toEqual([
      { display_name: "Noor", points: 150 },
      { display_name: "Ayesha K", points: 35 },
    ]);
  });

  it("counts consecutive active days and presence", async () => {
    const shells = await activeShellIds();
    const period = await today();
    const yesterday = await db.query<{ d: string }>(
      "select (public.quest_today() - 1)::text as d",
    );

    await createUser(USER_ONE);
    await asUser(USER_ONE);
    await callRpc("join_quest", "Ayesha K");
    await callRpc("collect_shell", shells[0]);

    await db.query(
      `insert into public.quest_events
        (player_id, kind, ref, period_id, points, created_at)
       values ($1, 'shell', $2, $3, 10, now() - interval '1 day')`,
      [USER_ONE, shells[0], yesterday.rows[0].d],
    );

    const state = await callRpc<{ streak: number; active_days: string[] }>(
      "get_my_quest_state",
    );

    expect(state.streak).toBe(2);
    expect(state.active_days).toEqual([period, yesterday.rows[0].d]);

    expect(await callRpc("touch_presence")).toMatchObject({
      ok: true,
      count: 1,
    });
  });
});
