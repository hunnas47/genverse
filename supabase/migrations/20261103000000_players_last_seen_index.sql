-- Keep the "here now" presence count cheap as the players table grows.
-- touch_presence() filters on last_seen_at; without this index that becomes a
-- sequential scan once the event traffic starts.

create index if not exists players_last_seen_at_idx
  on public.players (last_seen_at)
  where last_seen_at is not null;
