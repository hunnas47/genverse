import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Run: node --env-file=.env.local scripts/check-supabase.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const { error: authError } = await supabase.auth.signInAnonymously();

if (authError) {
  console.error(`Anonymous sign-in failed: ${authError.message}`);

  if (/anonymous/i.test(authError.message)) {
    console.error(
      "Enable Authentication → Providers → Anonymous Sign-Ins in the Supabase dashboard, then rerun this check.",
    );
  }

  // The leaderboard RPC is readable without a session, so it can still tell us
  // whether the SQL migration has been applied.
  const board = await supabase.rpc("get_leaderboard", {
    p_scope: "daily",
    p_limit: 5,
  });

  if (board.error) {
    console.error(
      `get_leaderboard (anonymous): failed (${board.error.message})`,
    );
    console.error(
      "If the function is missing, apply the SQL files in supabase/migrations/ in filename order in the Supabase SQL editor.",
    );
  } else {
    console.log(
      `get_leaderboard (anonymous): OK (${board.data?.length ?? 0} daily rows); the schema is present.`,
    );
  }

  process.exit(1);
}

console.log("Anonymous sign-in: OK");

const state = await supabase.rpc("get_my_quest_state");

if (state.error) {
  console.log(`get_my_quest_state: not ready (${state.error.message})`);
  console.log(
    "Apply the SQL files in supabase/migrations/ in filename order in the Supabase SQL editor.",
  );
  process.exit(0);
}

const payload = state.data;

console.log(
  `get_my_quest_state: OK (period ${payload.period}, today ${payload.today_points} pts, total ${payload.total_points} pts)`,
);
console.log(
  payload.player?.display_name
    ? `Player: ${payload.player.display_name}`
    : "Player: guest (no display name yet)",
);

const board = await supabase.rpc("get_leaderboard", {
  p_scope: "daily",
  p_limit: 5,
});

if (board.error) {
  console.error(`get_leaderboard: failed (${board.error.message})`);
  process.exit(1);
}

console.log(`get_leaderboard: OK (${board.data?.length ?? 0} daily rows)`);

const presence = await supabase.rpc("touch_presence");

if (presence.error) {
  console.error(`touch_presence: failed (${presence.error.message})`);
  process.exit(1);
}

console.log(
  `touch_presence: OK (${presence.data?.count ?? 0} explorers in the last 5 minutes)`,
);
console.log("Remote Beach Quest schema and read paths look ready.");
