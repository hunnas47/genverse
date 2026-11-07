-- Internal helpers must not be callable through the API.
--
-- Supabase's default privileges grant EXECUTE on every new function in
-- `public` directly to `anon` and `authenticated`, so `revoke ... from public`
-- alone leaves them callable. Revoke from the API roles explicitly. The RPCs
-- that call these helpers are SECURITY DEFINER and keep working.
--
-- Safe to re-run.

revoke all on function public.quest_today() from anon, authenticated;
revoke all on function public.quest_set_index(date) from anon, authenticated;
revoke all on function public.quest_streak(date[], date) from anon, authenticated;
revoke all on function public.quest_point(smallint, text, text) from anon, authenticated;
revoke all on function public.quest_is_too_fast(uuid, date, smallint, text, text) from anon, authenticated;
revoke all on function public.quest_name_is_blocked(text) from anon, authenticated;
