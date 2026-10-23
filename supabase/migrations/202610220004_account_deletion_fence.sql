-- A Clerk JWT can remain cryptographically valid after its user is deleted.
-- Keep only a private subject tombstone so late clients cannot recreate data.
create schema if not exists kaizen_private;
revoke all on schema kaizen_private from public, anon, authenticated;
grant usage on schema kaizen_private to service_role;
create table kaizen_private.account_deletions (
  owner_id text primary key,
  requested_at timestamptz not null default now()
);
alter table kaizen_private.account_deletions enable row level security;
revoke all on kaizen_private.account_deletions from public, anon, authenticated;
grant select, insert on kaizen_private.account_deletions to service_role;

create function public.account_is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select (auth.jwt() ->> 'sub') is not null and not exists (
    select 1 from kaizen_private.account_deletions d where d.owner_id = (auth.jwt() ->> 'sub')
  );
$$;
revoke all on function public.account_is_active() from public, anon;
grant execute on function public.account_is_active() to authenticated;

create function public.begin_account_deletion(p_owner_id text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if p_owner_id is null or length(p_owner_id) = 0 then raise exception 'owner required'; end if;
  -- Wait for in-flight client writes to commit before publishing the fence.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id, 18861));
  insert into kaizen_private.account_deletions(owner_id) values(p_owner_id) on conflict do nothing;
end;
$$;
revoke all on function public.begin_account_deletion(text) from public, anon, authenticated;
grant execute on function public.begin_account_deletion(text) to service_role;

create function kaizen_private.guard_account_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_owner text := auth.jwt() ->> 'sub';
begin
  if auth.role() = 'authenticated' then
    if v_owner is null then raise exception 'authentication required' using errcode = '42501'; end if;
    -- Shared locks allow ordinary writes; deletion takes the exclusive counterpart.
    perform pg_catalog.pg_advisory_xact_lock_shared(pg_catalog.hashtextextended(v_owner, 18861));
    -- Volatile trigger statement sees the fence after waiting, even if the outer
    -- statement's RLS snapshot was taken before deletion began.
    if exists(select 1 from kaizen_private.account_deletions where owner_id = v_owner) then
      raise exception 'account deletion is in progress' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function kaizen_private.guard_account_write() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'projects', 'tasks', 'subtasks', 'day_entries', 'day_wins',
    'channels', 'content_pieces', 'metric_snapshots', 'habits', 'habit_logs',
    'health_goals', 'shelves', 'books', 'reading_sessions', 'reading_annotations',
    'reading_goals', 'feed_sources', 'feed_items', 'import_runs', 'import_items',
    'integration_accounts', 'sync_mutations', 'change_log'
  ] loop
    execute format('create policy active_account on public.%I as restrictive for all to authenticated using (public.account_is_active()) with check (public.account_is_active())', t);
    execute format('create trigger account_write_guard before insert or update or delete on public.%I for each row execute function kaizen_private.guard_account_write()', t);
  end loop;
end;
$$;
create policy active_account on storage.objects as restrictive for all to authenticated
  using (public.account_is_active()) with check (public.account_is_active());
create trigger account_write_guard before insert or update or delete on storage.objects
  for each row execute function kaizen_private.guard_account_write();
