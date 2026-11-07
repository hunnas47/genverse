-- Beach Quest fair play: leaderboard tie-break, speed flags, blocked names,
-- and organiser-only moderation tools.
--
-- Apply after 20261028100000_beach_quest.sql. Safe to re-run.
--
-- What this changes:
--   * Leaderboard ties go to whoever reached the score first, not to the
--     alphabetically earlier name. Daily points are capped, so ties at the top
--     are expected.
--   * Every shell find and check-in is compared with the player's previous
--     one. If the avatar could not have walked that far in the elapsed time,
--     the event is still accepted but marked `too_fast`. It is deliberately
--     not rejected: the offline queue replays finds in a burst when a phone
--     reconnects, and those honest players must keep their points. Organisers
--     review flags in `quest_admin.review` and hide players by hand.
--   * Display names are checked against `quest_blocked_terms`. Organisers can
--     add terms at runtime with `quest_admin.block_term(...)`, no redeploy.
--   * `quest_admin` is not an API-exposed schema and is revoked from the
--     `anon` and `authenticated` roles. Use it from the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- Coordinates for the speed check (world pixels; mirrors src/data/quest.ts
-- and the mapPosition of src/data/venues.ts; src/data/quest-sql.test.ts
-- fails on drift)
-- ---------------------------------------------------------------------------

alter table public.quest_shells add column if not exists x real;
alter table public.quest_shells add column if not exists y real;
alter table public.quest_venues add column if not exists x real;
alter table public.quest_venues add column if not exists y real;
alter table public.quest_venues add column if not exists reach real;

update public.quest_shells as s
set x = c.x, y = c.y
from (
  values
  ('tide-1', 320, 280),
  ('tide-2', 300, 245),
  ('tide-3', 600, 250),
  ('tide-4', 900, 250),
  ('tide-5', 1300, 270),
  ('tide-6', 300, 560),
  ('tide-7', 330, 700),
  ('tide-8', 550, 765),
  ('tide-9', 800, 670),
  ('tide-10', 1200, 760),
  ('coral-1', 480, 560),
  ('coral-2', 550, 640),
  ('coral-3', 675, 640),
  ('coral-4', 780, 620),
  ('coral-5', 960, 620),
  ('coral-6', 1060, 620),
  ('coral-7', 1320, 560),
  ('coral-8', 1300, 480),
  ('coral-9', 1400, 760),
  ('coral-10', 1200, 770),
  ('moon-1', 350, 250),
  ('moon-2', 450, 250),
  ('moon-3', 760, 250),
  ('moon-4', 1100, 250),
  ('moon-5', 1420, 250),
  ('moon-6', 300, 650),
  ('moon-7', 450, 730),
  ('moon-8', 675, 700),
  ('moon-9', 930, 630),
  ('moon-10', 1290, 700)
) as c(shell_id, x, y)
where s.shell_id = c.shell_id;

update public.quest_venues as v
set x = c.x, y = c.y, reach = c.reach
from (
  values
  ('s1', 145, 690, 140),
  ('s2', 390, 527, 130),
  ('s3', 919, 387, 125),
  ('s4', 1077, 527, 120),
  ('s5', 1382, 578, 120),
  ('s6', 1226, 684, 120),
  ('a1', 1241, 405, 180),
  ('a3', 910, 535, 120),
  ('b', 470, 420, 150),
  ('c', 777, 428, 150),
  ('s-photo', 696, 270, 100),
  ('o', 787, 744, 110),
  ('r', 580, 707, 100),
  ('e', 675, 755, 100),
  ('p', 1048, 713, 140)
) as c(venue_id, x, y, reach)
where v.venue_id = c.venue_id;

alter table public.quest_events
  add column if not exists too_fast boolean not null default false;

-- ---------------------------------------------------------------------------
-- Speed check helpers
-- ---------------------------------------------------------------------------

-- Where an action happens and how close the avatar must be. 44 is
-- SHELL_COLLECT_RADIUS in src/game/scenes/beach-scene.ts; venue reach is the
-- interaction radius.
create or replace function public.quest_point(
  p_set smallint,
  p_kind text,
  p_ref text
)
returns table (x real, y real, reach real)
language sql
stable
security definer
set search_path = public
as $$
  select s.x, s.y, 44::real
  from public.quest_shells s
  where p_kind = 'shell' and s.set_index = p_set and s.shell_id = p_ref
  union all
  select v.x, v.y, v.reach
  from public.quest_venues v
  where p_kind = 'checkin' and v.venue_id = p_ref;
$$;

-- True when the avatar could not have walked from the previous action to this
-- one in time. The fastest avatar moves 240 px/s (VENUE_MAP.player.speed);
-- the check allows twice that plus one second of network jitter, and uses the
-- straight-line distance, which is never longer than the real path.
create or replace function public.quest_is_too_fast(
  p_uid uuid,
  p_period date,
  p_set smallint,
  p_kind text,
  p_ref text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_prev_kind text;
  v_prev_ref text;
  v_prev_at timestamptz;
  v_from record;
  v_to record;
  v_gap double precision;
  v_elapsed double precision;
begin
  select kind, ref, created_at
  into v_prev_kind, v_prev_ref, v_prev_at
  from public.quest_events
  where player_id = p_uid
    and period_id = p_period
    and kind in ('shell', 'checkin')
  order by created_at desc, id desc
  limit 1;

  if v_prev_at is null then
    return false;
  end if;

  select * into v_from from public.quest_point(p_set, v_prev_kind, v_prev_ref);
  select * into v_to from public.quest_point(p_set, p_kind, p_ref);

  if v_from.x is null or v_to.x is null then
    return false;
  end if;

  v_gap := greatest(
    0,
    sqrt((v_from.x - v_to.x) ^ 2 + (v_from.y - v_to.y) ^ 2)
      - v_from.reach
      - v_to.reach
  );
  v_elapsed := extract(epoch from clock_timestamp() - v_prev_at);

  return v_elapsed + 1.0 < v_gap / 480.0;
end;
$$;

-- ---------------------------------------------------------------------------
-- Blocked display-name terms
-- ---------------------------------------------------------------------------

-- `whole_word = false` matches anywhere inside a word ("f.u.c.k" and "sh1t"
-- are normalised first). Use `whole_word = true` for short terms that occur
-- inside real names ("ass" in Hassan, "shit" in Ashita, "kunna" in
-- Kunnamkulam). RLS is on with no policies, so clients cannot read the list.
create table if not exists public.quest_blocked_terms (
  term text primary key check (term = lower(term) and term <> ''),
  whole_word boolean not null default false
);

alter table public.quest_blocked_terms enable row level security;

insert into public.quest_blocked_terms (term, whole_word)
values
  -- English, matched inside words
  ('fuck', false),
  ('bitch', false),
  ('cunt', false),
  ('nigger', false),
  ('nigga', false),
  ('whore', false),
  ('bastard', false),
  ('asshole', false),
  ('motherf', false),
  ('dickhead', false),
  ('pussy', false),
  -- English, whole words only
  ('shit', true),
  ('ass', true),
  ('dick', true),
  ('cock', true),
  ('cum', true),
  ('tit', true),
  ('tits', true),
  ('fag', true),
  ('rape', true),
  ('porn', true),
  ('sex', true),
  ('slut', true),
  ('penis', true),
  ('boobs', true),
  ('fuk', true),
  ('fck', true),
  -- Hindi and Malayalam in Latin script, matched inside words
  ('chutiya', false),
  ('chutia', false),
  ('chootiya', false),
  ('bhosdi', false),
  ('bhosad', false),
  ('madarchod', false),
  ('behenchod', false),
  ('bhenchod', false),
  ('gandu', false),
  ('thayoli', false),
  ('thaayoli', false),
  ('thayoly', false),
  ('pundachi', false),
  ('koothichi', false),
  ('kazhuveri', false),
  ('veshya', false),
  ('myre', false),
  ('myru', false),
  ('mairu', false),
  ('pooru', false),
  -- Hindi and Malayalam in Latin script, whole words only
  ('lund', true),
  ('kunna', true),
  ('kunne', true),
  ('kundi', true),
  ('maire', true),
  ('myran', true),
  ('mairan', true),
  ('punda', true),
  -- Malayalam script, matched inside words
  ('മൈര', false),
  ('പൂറ', false),
  ('തായോളി', false),
  ('കുണ്ണ', false),
  ('പുണ്ട', false),
  ('ഊമ്പ', false),
  -- Impersonation
  ('official', true),
  ('admin', true),
  ('moderator', true)
on conflict (term) do nothing;

create or replace function public.quest_name_is_blocked(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with normalised as (
    -- Lower-case, undo common digit swaps, drop punctuation inside words.
    select regexp_split_to_array(
      btrim(
        regexp_replace(
          regexp_replace(
            translate(lower(coalesce(p_name, '')), '0134578$', 'oieastbs'),
            '[[:punct:]]',
            '',
            'g'
          ),
          '[[:space:]]+',
          ' ',
          'g'
        )
      ),
      ' '
    ) as words
  )
  select exists (
    select 1
    from public.quest_blocked_terms t
    cross join normalised n
    where (t.whole_word and t.term = any(n.words))
       or (
         not t.whole_word
         and exists (
           select 1 from unnest(n.words) as w(word)
           where position(t.term in w.word) > 0
         )
       )
  );
$$;

-- ---------------------------------------------------------------------------
-- RPC: join / rename (adds the blocked-term check)
-- ---------------------------------------------------------------------------

create or replace function public.join_quest(p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_length integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  v_name := btrim(
    regexp_replace(coalesce(p_display_name, ''), '[[:space:]]+', ' ', 'g')
  );
  v_length := char_length(v_name);

  -- The client counts graphemes (2–20). Postgres counts code points, and Indic
  -- names use combining marks, so allow up to 40 code points server-side.
  if v_length < 2 or v_length > 40 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'invalid-name',
      'message', 'Use 2–20 characters.'
    );
  end if;

  if v_name ~ '[[:cntrl:]]' or v_name ~ '[<>/\\@]' or v_name ~* '(https?:|www\.)' then
    return jsonb_build_object(
      'ok', false,
      'reason', 'invalid-name',
      'message', 'Links and symbols are not allowed.'
    );
  end if;

  if v_name ~ '^[0-9 ]+$' then
    return jsonb_build_object(
      'ok', false,
      'reason', 'invalid-name',
      'message', 'Use at least one letter.'
    );
  end if;

  if lower(v_name) in (
    'admin', 'administrator', 'genm', 'guest', 'moderator', 'official', 'support'
  ) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'invalid-name',
      'message', 'That name is reserved. Try another.'
    );
  end if;

  if public.quest_name_is_blocked(v_name) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'invalid-name',
      'message', 'That name isn''t allowed. Try another.'
    );
  end if;

  begin
    insert into public.players (id, display_name)
    values (v_uid, v_name)
    on conflict (id) do update
      set display_name = excluded.display_name,
          updated_at = now();
  exception when unique_violation then
    return jsonb_build_object(
      'ok', false,
      'reason', 'name-taken',
      'message', 'That name is already taken. Try another.'
    );
  end;

  return jsonb_build_object('ok', true, 'display_name', v_name);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: collect a shell (adds the speed flag)
-- ---------------------------------------------------------------------------

create or replace function public.collect_shell(p_shell_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_period date := public.quest_today();
  v_set_index smallint;
  v_last timestamptz;
  v_collected integer;
  v_total integer;
  v_bonus integer := 0;
  v_too_fast boolean;
begin
  if v_uid is null then
    return jsonb_build_object('accepted', false, 'reason', 'unauthenticated');
  end if;

  -- A guest may collect before choosing a name; the leaderboard only lists
  -- named players, and joining later keeps the same row and points.
  insert into public.players (id)
  values (v_uid)
  on conflict (id) do nothing;

  v_set_index := public.quest_set_index(v_period);

  if not exists (
    select 1
    from public.quest_shells
    where set_index = v_set_index and shell_id = p_shell_id
  ) then
    return jsonb_build_object('accepted', false, 'reason', 'unknown-shell');
  end if;

  -- Serialize one player's quest writes so two concurrent RPC calls cannot
  -- both pass the cooldown check. The lock is released at transaction end.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  if exists (
    select 1
    from public.quest_events
    where player_id = v_uid
      and kind = 'shell'
      and ref = p_shell_id
      and period_id = v_period
  ) then
    return jsonb_build_object('accepted', false, 'reason', 'already-collected');
  end if;

  select max(created_at) into v_last
  from public.quest_events
  where player_id = v_uid and kind = 'shell' and period_id = v_period;

  -- clock_timestamp(), not now(), because now() is fixed at transaction start
  -- and would let a request that waited on the advisory lock bypass the gap.
  if v_last is not null and clock_timestamp() - v_last < interval '1200 milliseconds' then
    return jsonb_build_object('accepted', false, 'reason', 'cooldown');
  end if;

  v_too_fast := public.quest_is_too_fast(
    v_uid, v_period, v_set_index, 'shell', p_shell_id
  );

  begin
    insert into public.quest_events
      (player_id, kind, ref, period_id, points, too_fast)
    values (v_uid, 'shell', p_shell_id, v_period, 10, v_too_fast);
  exception when unique_violation then
    return jsonb_build_object('accepted', false, 'reason', 'already-collected');
  end;

  select count(*)::integer into v_collected
  from public.quest_events
  where player_id = v_uid and kind = 'shell' and period_id = v_period;

  if v_collected >= (
    select count(*)
    from public.quest_shells
    where set_index = v_set_index
  ) then
    insert into public.quest_events (player_id, kind, ref, period_id, points)
    values (v_uid, 'bonus', 'shell-set', v_period, 50)
    on conflict on constraint quest_events_once do nothing;

    if found then
      v_bonus := 50;
    end if;
  end if;

  select coalesce(sum(points), 0)::integer into v_total
  from public.quest_events
  where player_id = v_uid and period_id = v_period;

  return jsonb_build_object(
    'accepted', true,
    'points', 10,
    'bonus_points', v_bonus,
    'today_points', v_total
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: venue check-in (adds the speed flag)
-- ---------------------------------------------------------------------------

create or replace function public.check_in_venue(p_venue_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_period date := public.quest_today();
  v_total integer;
  v_too_fast boolean;
begin
  if v_uid is null then
    return jsonb_build_object('accepted', false, 'reason', 'unauthenticated');
  end if;

  insert into public.players (id)
  values (v_uid)
  on conflict (id) do nothing;

  if not exists (
    select 1 from public.quest_venues where venue_id = p_venue_id
  ) then
    return jsonb_build_object('accepted', false, 'reason', 'unknown-venue');
  end if;

  -- Same per-player lock as collect_shell, so the speed check always compares
  -- against the action that really came before.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  if exists (
    select 1
    from public.quest_events
    where player_id = v_uid
      and kind = 'checkin'
      and ref = p_venue_id
      and period_id = v_period
  ) then
    return jsonb_build_object(
      'accepted', false,
      'reason', 'already-checked-in'
    );
  end if;

  v_too_fast := public.quest_is_too_fast(
    v_uid,
    v_period,
    public.quest_set_index(v_period),
    'checkin',
    p_venue_id
  );

  insert into public.quest_events
    (player_id, kind, ref, period_id, points, too_fast)
  values (v_uid, 'checkin', p_venue_id, v_period, 25, v_too_fast)
  on conflict on constraint quest_events_once do nothing;

  if not found then
    return jsonb_build_object(
      'accepted', false,
      'reason', 'already-checked-in'
    );
  end if;

  select coalesce(sum(points), 0)::integer into v_total
  from public.quest_events
  where player_id = v_uid and period_id = v_period;

  return jsonb_build_object(
    'accepted', true,
    'points', 25,
    'today_points', v_total
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: leaderboard (ties go to whoever reached the score first)
-- ---------------------------------------------------------------------------

create or replace function public.get_leaderboard(
  p_scope text default 'daily',
  p_limit integer default 50
)
returns table (
  rank bigint,
  display_name text,
  points integer,
  shells integer,
  checkins integer,
  is_you boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_period date := public.quest_today();
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_scope text;
begin
  if p_scope is not null and p_scope not in ('daily', 'all-time') then
    raise exception 'invalid leaderboard scope';
  end if;

  v_scope := coalesce(p_scope, 'daily');

  return query
  with scores as (
    select
      p.id,
      p.display_name,
      coalesce(sum(e.points), 0)::integer as points,
      count(e.id) filter (where e.kind = 'shell')::integer as shells,
      count(e.id) filter (where e.kind = 'checkin')::integer as checkins,
      -- Points only ever go up, so the latest event is when the player
      -- reached their current score.
      max(e.created_at) as reached_at
    from public.players p
    join public.quest_events e
      on e.player_id = p.id
      and (v_scope = 'all-time' or e.period_id = v_period)
    where p.display_name <> ''
      and not p.is_hidden
    group by p.id, p.display_name
    having coalesce(sum(e.points), 0) > 0
  )
  select
    row_number() over (
      order by s.points desc, s.reached_at asc, lower(s.display_name) asc
    ),
    s.display_name,
    s.points,
    s.shells,
    s.checkins,
    coalesce(s.id = v_uid, false)
  from scores s
  order by s.points desc, s.reached_at asc, lower(s.display_name) asc
  limit v_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- Organiser tools (SQL editor only)
-- ---------------------------------------------------------------------------

create schema if not exists quest_admin;

-- One row per player per day, most suspicious first. `span_seconds` is the
-- time from first to last action that day; a full set plus every check-in in
-- a minute or two is not humanly walkable.
create or replace view quest_admin.review as
select
  p.id as player_id,
  p.display_name,
  p.is_hidden,
  public.quest_name_is_blocked(p.display_name) as name_blocked,
  e.period_id,
  coalesce(sum(e.points), 0)::integer as points,
  count(*) filter (where e.kind = 'shell')::integer as shells,
  count(*) filter (where e.kind = 'checkin')::integer as checkins,
  count(*) filter (where e.too_fast)::integer as too_fast,
  round(
    extract(epoch from max(e.created_at) - min(e.created_at))::numeric,
    1
  ) as span_seconds,
  min(e.created_at) as first_at,
  max(e.created_at) as last_at
from public.players p
join public.quest_events e on e.player_id = p.id
group by p.id, p.display_name, p.is_hidden, e.period_id
order by e.period_id desc, too_fast desc, span_seconds asc;

-- Hide a player from the leaderboard and presence count. Returns rows changed.
create or replace function quest_admin.hide_player(p_display_name text)
returns integer
language sql
as $$
  with changed as (
    update public.players
    set is_hidden = true, updated_at = now()
    where lower(display_name) = lower(btrim(p_display_name))
    returning 1
  )
  select count(*)::integer from changed;
$$;

create or replace function quest_admin.unhide_player(p_display_name text)
returns integer
language sql
as $$
  with changed as (
    update public.players
    set is_hidden = false, updated_at = now()
    where lower(display_name) = lower(btrim(p_display_name))
    returning 1
  )
  select count(*)::integer from changed;
$$;

-- Remove an offensive name. The player keeps their points but drops off the
-- leaderboard until they choose a new name; the old name becomes available.
create or replace function quest_admin.clear_name(p_display_name text)
returns integer
language sql
as $$
  with changed as (
    update public.players
    set display_name = '', updated_at = now()
    where lower(display_name) = lower(btrim(p_display_name))
    returning 1
  )
  select count(*)::integer from changed;
$$;

-- Add a blocked term without a redeploy. Existing names are not changed; use
-- `select * from quest_admin.review where name_blocked` to find them.
create or replace function quest_admin.block_term(
  p_term text,
  p_whole_word boolean default false
)
returns void
language sql
as $$
  insert into public.quest_blocked_terms (term, whole_word)
  values (lower(btrim(p_term)), p_whole_word)
  on conflict (term) do update set whole_word = excluded.whole_word;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

revoke all on function public.quest_point(smallint, text, text) from public;
revoke all on function public.quest_is_too_fast(uuid, date, smallint, text, text) from public;
revoke all on function public.quest_name_is_blocked(text) from public;
revoke all on table public.quest_blocked_terms from anon, authenticated;

revoke all on schema quest_admin from public;
revoke all on schema quest_admin from anon, authenticated;
revoke all on all tables in schema quest_admin from public, anon, authenticated;
revoke all on all functions in schema quest_admin from public, anon, authenticated;
