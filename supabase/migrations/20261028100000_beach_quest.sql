-- Beach Quest schema for the GEN M explorer.
--
-- Apply this in the Supabase SQL editor (or with `supabase db push`) on a
-- fresh project. It is safe to re-run: tables/indexes use IF NOT EXISTS and
-- the seed rows are upserted.
--
-- The shell and venue seeds must stay in sync with:
--   src/data/quest.ts   (SHELL_SETS)
--   src/data/venues.ts  (venues with a mapPosition)
-- src/data/quest-sql.test.ts checks the shell and venue ids against the
-- TypeScript source so drift fails `npm test`.
--
-- Security model:
--   * clients never write tables directly; RLS allows only reading your own
--     player row and events
--   * all writes go through SECURITY DEFINER RPCs that use auth.uid()
--   * the day, scoring, cooldown, and idempotency are computed in Postgres
--   * shell proximity is a client-side game rule; the server validates that a
--     shell belongs to today's set, but cannot prove the player walked to it

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.players (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  is_hidden boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive unique names. Guests keep an empty name, which is excluded
-- from the index and from the leaderboard.
create unique index if not exists players_display_name_unique
  on public.players (lower(display_name))
  where display_name <> '';

create table if not exists public.quest_events (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  kind text not null check (kind in ('shell', 'checkin', 'bonus')),
  ref text not null,
  period_id date not null,
  points integer not null check (points >= 0),
  created_at timestamptz not null default clock_timestamp(),
  constraint quest_events_once unique (player_id, kind, ref, period_id)
);

create index if not exists quest_events_player_period_idx
  on public.quest_events (player_id, period_id);

create index if not exists quest_events_period_player_idx
  on public.quest_events (period_id, player_id);

create table if not exists public.quest_shell_sets (
  set_index smallint primary key,
  set_id text not null unique,
  name text not null
);

create table if not exists public.quest_shells (
  set_index smallint not null
    references public.quest_shell_sets(set_index) on delete cascade,
  shell_id text not null,
  primary key (set_index, shell_id)
);

create table if not exists public.quest_venues (
  venue_id text primary key
);

-- ---------------------------------------------------------------------------
-- Seed: mirrors src/data/quest.ts and src/data/venues.ts
-- ---------------------------------------------------------------------------

insert into public.quest_shell_sets (set_index, set_id, name)
values
  (0, 'tide-pool', 'Tide Pool'),
  (1, 'coral-cove', 'Coral Cove'),
  (2, 'moonlit-shore', 'Moonlit Shore')
on conflict (set_index) do update
  set set_id = excluded.set_id,
      name = excluded.name;

insert into public.quest_shells (set_index, shell_id)
values
  (0, 'tide-1'),
  (0, 'tide-2'),
  (0, 'tide-3'),
  (0, 'tide-4'),
  (0, 'tide-5'),
  (0, 'tide-6'),
  (0, 'tide-7'),
  (0, 'tide-8'),
  (0, 'tide-9'),
  (0, 'tide-10'),
  (1, 'coral-1'),
  (1, 'coral-2'),
  (1, 'coral-3'),
  (1, 'coral-4'),
  (1, 'coral-5'),
  (1, 'coral-6'),
  (1, 'coral-7'),
  (1, 'coral-8'),
  (1, 'coral-9'),
  (1, 'coral-10'),
  (2, 'moon-1'),
  (2, 'moon-2'),
  (2, 'moon-3'),
  (2, 'moon-4'),
  (2, 'moon-5'),
  (2, 'moon-6'),
  (2, 'moon-7'),
  (2, 'moon-8'),
  (2, 'moon-9'),
  (2, 'moon-10')
on conflict (set_index, shell_id) do nothing;

insert into public.quest_venues (venue_id)
values
  ('s1'),
  ('s2'),
  ('s3'),
  ('s4'),
  ('s5'),
  ('s6'),
  ('a1'),
  ('a3'),
  ('b'),
  ('c'),
  ('s-photo'),
  ('o'),
  ('r'),
  ('e'),
  ('p')
on conflict (venue_id) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.quest_today()
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

create or replace function public.quest_set_index(p_period date)
returns smallint
language sql
stable
set search_path = public
as $$
  with set_count as (
    select count(*)::integer as n from public.quest_shell_sets
  )
  select (
    (
      ((p_period - date '2026-10-01') % set_count.n) + set_count.n
    ) % set_count.n
  )::smallint
  from set_count;
$$;

create or replace function public.quest_streak(p_days date[], p_today date)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  v_cursor date;
  v_streak integer := 0;
begin
  if p_days is null or cardinality(p_days) = 0 then
    return 0;
  end if;

  -- If today has no activity yet, count from yesterday so a morning visit
  -- does not erase the streak.
  if p_today = any(p_days) then
    v_cursor := p_today;
  else
    v_cursor := p_today - 1;
  end if;

  while v_cursor = any(p_days) loop
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  return v_streak;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: join / rename
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
-- RPC: collect a shell
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

  -- Serialize one player's shell writes so two concurrent RPC calls cannot
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

  begin
    insert into public.quest_events (player_id, kind, ref, period_id, points)
    values (v_uid, 'shell', p_shell_id, v_period, 10);
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
-- RPC: venue check-in
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

  insert into public.quest_events (player_id, kind, ref, period_id, points)
  values (v_uid, 'checkin', p_venue_id, v_period, 25)
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
-- RPC: my state
-- ---------------------------------------------------------------------------

create or replace function public.get_my_quest_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_period date := public.quest_today();
  v_profile public.players%rowtype;
  v_collected text[];
  v_checked text[];
  v_today integer;
  v_total integer;
  v_active_days date[];
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  select * into v_profile from public.players where id = v_uid;

  select coalesce(array_agg(ref order by created_at), '{}'::text[])
  into v_collected
  from public.quest_events
  where player_id = v_uid
    and kind = 'shell'
    and period_id = v_period;

  select coalesce(array_agg(ref order by created_at), '{}'::text[])
  into v_checked
  from public.quest_events
  where player_id = v_uid
    and kind = 'checkin'
    and period_id = v_period;

  select coalesce(sum(points), 0)::integer into v_today
  from public.quest_events
  where player_id = v_uid and period_id = v_period;

  select coalesce(sum(points), 0)::integer into v_total
  from public.quest_events
  where player_id = v_uid;

  select coalesce(array_agg(day order by day desc), '{}'::date[])
  into v_active_days
  from (
    select distinct period_id as day
    from public.quest_events
    where player_id = v_uid
      and kind <> 'bonus'
      and period_id <= v_period
    order by day desc
    limit 90
  ) days;

  return jsonb_build_object(
    'ok', true,
    'player', case
      when v_profile.id is null then null
      else jsonb_build_object(
        'id', v_profile.id,
        'display_name', v_profile.display_name,
        'is_hidden', v_profile.is_hidden
      )
    end,
    'period', v_period,
    'collected_shell_ids', to_jsonb(v_collected),
    'checked_in_venue_ids', to_jsonb(v_checked),
    'today_points', v_today,
    'total_points', v_total,
    'active_days', to_jsonb(v_active_days),
    'streak', public.quest_streak(v_active_days, v_period)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: leaderboard
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
      count(e.id) filter (where e.kind = 'checkin')::integer as checkins
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
    row_number() over (order by s.points desc, lower(s.display_name) asc),
    s.display_name,
    s.points,
    s.shells,
    s.checkins,
    coalesce(s.id = v_uid, false)
  from scores s
  order by s.points desc, lower(s.display_name) asc
  limit v_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: "here now" presence
-- ---------------------------------------------------------------------------

create or replace function public.touch_presence()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  insert into public.players (id, last_seen_at)
  values (v_uid, now())
  on conflict (id) do update
    set last_seen_at = now();

  select count(*)::integer into v_count
  from public.players
  where last_seen_at > now() - interval '5 minutes'
    and not is_hidden;

  return jsonb_build_object('ok', true, 'count', v_count);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: reads are owner-only; writes are RPC-only
-- ---------------------------------------------------------------------------

alter table public.players enable row level security;
alter table public.quest_events enable row level security;
alter table public.quest_shell_sets enable row level security;
alter table public.quest_shells enable row level security;
alter table public.quest_venues enable row level security;

drop policy if exists "players read own profile" on public.players;
create policy "players read own profile"
  on public.players
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "players read own events" on public.quest_events;
create policy "players read own events"
  on public.quest_events
  for select
  to authenticated
  using (auth.uid() = player_id);

-- ---------------------------------------------------------------------------
-- Function permissions
-- ---------------------------------------------------------------------------

revoke all on function public.quest_today() from public;
revoke all on function public.quest_set_index(date) from public;
revoke all on function public.quest_streak(date[], date) from public;
revoke all on function public.join_quest(text) from public;
revoke all on function public.collect_shell(text) from public;
revoke all on function public.check_in_venue(text) from public;
revoke all on function public.get_my_quest_state() from public;
revoke all on function public.get_leaderboard(text, integer) from public;
revoke all on function public.touch_presence() from public;

grant execute on function public.join_quest(text) to anon, authenticated;
grant execute on function public.collect_shell(text) to anon, authenticated;
grant execute on function public.check_in_venue(text) to anon, authenticated;
grant execute on function public.get_my_quest_state() to anon, authenticated;
grant execute on function public.get_leaderboard(text, integer) to anon, authenticated;
grant execute on function public.touch_presence() to anon, authenticated;
