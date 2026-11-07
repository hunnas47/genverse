// Beach Quest load test against the Supabase project in .env.local.
//
//   npm run load:supabase                     # read-only leaderboard load
//   npm run load:supabase -- --requests 1000 --concurrency 50
//   npm run load:supabase -- --mode players --players 20
//
// `read` (default) only calls get_leaderboard with the publishable key. It
// writes nothing.
//
// `players` simulates real visitors: anonymous sign-in, state, presence,
// shell finds, a check-in, and the leaderboard. It CREATES anonymous users
// tagged with `load_test: true`. They have no display name, so they never
// appear on the leaderboard, but they do count in "here now" for five
// minutes. Remove them afterwards in the Supabase SQL editor:
//
//   delete from auth.users where raw_user_meta_data->>'load_test' = 'true';
//
// Supabase rate-limits anonymous sign-ins per IP address (Authentication →
// Rate Limits). From one machine, `players` mode will hit that limit quickly;
// at the event, many phones can share one IP behind venue Wi-Fi or carrier
// NAT, so check that limit before the event.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Run: npm run load:supabase",
  );
  process.exit(1);
}

function readArgs(argv) {
  const options = {
    mode: "read",
    requests: 300,
    concurrency: 25,
    players: 10,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index].replace(/^--/, "");
    const value = argv[index + 1];

    if (!(name in options) || value === undefined) {
      console.error(`Unknown or incomplete option: ${argv[index]}`);
      process.exit(1);
    }

    options[name] = name === "mode" ? value : Number(value);
    index += 1;
  }

  if (!["read", "players"].includes(options.mode)) {
    console.error('--mode must be "read" or "players".');
    process.exit(1);
  }

  for (const name of ["requests", "concurrency", "players"]) {
    if (!Number.isInteger(options[name]) || options[name] < 1) {
      console.error(`--${name} must be a positive whole number.`);
      process.exit(1);
    }
  }

  return options;
}

const options = readArgs(process.argv.slice(2));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function newClient() {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/** Per-call timings and failures, keyed by call name. */
const stats = new Map();

async function timed(name, run) {
  const entry = stats.get(name) ?? { ms: [], errors: new Map() };
  stats.set(name, entry);
  const started = performance.now();

  try {
    const result = await run();
    const error = result?.error;

    if (error) {
      const label = `${error.status ?? ""} ${error.code ?? ""} ${error.message}`.trim();
      entry.errors.set(label, (entry.errors.get(label) ?? 0) + 1);
    } else {
      entry.ms.push(performance.now() - started);
    }

    return result;
  } catch (error) {
    const label = error instanceof Error ? error.message : String(error);
    entry.errors.set(label, (entry.errors.get(label) ?? 0) + 1);
    return { error };
  }
}

async function pool(total, concurrency, task) {
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, total) }, async () => {
    while (next < total) {
      const index = next;
      next += 1;
      await task(index);
    }
  });

  await Promise.all(workers);
}

function percentile(sorted, p) {
  if (sorted.length === 0) {
    return NaN;
  }

  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function report(elapsedMs) {
  console.log(`\nFinished in ${(elapsedMs / 1000).toFixed(1)} s\n`);

  const rows = [...stats.entries()].map(([name, entry]) => {
    const sorted = [...entry.ms].sort((a, b) => a - b);
    const failed = [...entry.errors.values()].reduce((sum, n) => sum + n, 0);

    return {
      call: name,
      ok: sorted.length,
      failed,
      "p50 ms": Math.round(percentile(sorted, 50)),
      "p95 ms": Math.round(percentile(sorted, 95)),
      "p99 ms": Math.round(percentile(sorted, 99)),
      "max ms": Math.round(sorted.at(-1) ?? NaN),
    };
  });

  console.table(rows);

  let anyErrors = false;

  for (const [name, entry] of stats) {
    for (const [label, count] of entry.errors) {
      anyErrors = true;
      console.log(`  ${name}: ${count} × ${label}`);
    }
  }

  return anyErrors;
}

async function runRead() {
  console.log(
    `Read-only: ${options.requests} get_leaderboard calls, ${options.concurrency} at a time.`,
  );
  const supabase = newClient();

  await pool(options.requests, options.concurrency, (index) =>
    timed("get_leaderboard", () =>
      supabase.rpc("get_leaderboard", {
        p_scope: index % 2 === 0 ? "daily" : "all-time",
        p_limit: 50,
      }),
    ),
  );
}

// Every shell id exists in exactly one daily set, so one of these is today's.
// The others return `unknown-shell`, which still exercises the RPC.
const SHELL_PROBES = ["tide-1", "coral-1", "moon-1"];

async function simulatePlayer() {
  const supabase = newClient();
  const signIn = await timed("auth.signInAnonymously", () =>
    supabase.auth.signInAnonymously({ options: { data: { load_test: true } } }),
  );

  if (signIn.error) {
    return;
  }

  await timed("get_my_quest_state", () => supabase.rpc("get_my_quest_state"));
  await timed("touch_presence", () => supabase.rpc("touch_presence"));

  for (const shellId of SHELL_PROBES) {
    await timed("collect_shell", () =>
      supabase.rpc("collect_shell", { p_shell_id: shellId }),
    );
    // Real players are spaced by the 1.2 s server cooldown.
    await sleep(1_300);
  }

  await timed("check_in_venue", () =>
    supabase.rpc("check_in_venue", { p_venue_id: "s1" }),
  );
  await timed("get_leaderboard", () =>
    supabase.rpc("get_leaderboard", { p_scope: "daily", p_limit: 50 }),
  );
}

async function runPlayers() {
  console.log(
    `Players: ${options.players} anonymous visitors, ${options.concurrency} at a time.`,
  );
  console.log(
    "This creates tagged anonymous users. Clean up afterwards with:\n" +
      "  delete from auth.users where raw_user_meta_data->>'load_test' = 'true';",
  );

  await pool(options.players, options.concurrency, () => simulatePlayer());
}

const started = performance.now();

if (options.mode === "read") {
  await runRead();
} else {
  await runPlayers();
}

const anyErrors = report(performance.now() - started);
process.exit(anyErrors ? 1 : 0);
