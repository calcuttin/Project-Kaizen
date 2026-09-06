-- Clerk owns identities. Supabase receives Clerk-issued JWTs through its
-- Third-Party Auth integration and uses the Clerk `sub` claim for ownership.

drop trigger if exists create_profile_after_signup on auth.users;
drop function if exists public.create_profile_for_user();

do $$
declare
  table_name text;
begin
  drop policy if exists profiles_owner_all on public.profiles;
  alter table public.profiles drop constraint if exists profiles_owner_id_fkey;
  alter table public.profiles alter column owner_id type text using owner_id::text;
  create policy profiles_owner_all on public.profiles for all to authenticated
    using (owner_id = (auth.jwt() ->> 'sub'))
    with check (owner_id = (auth.jwt() ->> 'sub'));

  foreach table_name in array array[
    'projects', 'tasks', 'subtasks', 'day_entries', 'day_wins',
    'channels', 'content_pieces', 'metric_snapshots',
    'habits', 'habit_logs', 'health_goals',
    'shelves', 'books', 'reading_sessions', 'reading_annotations', 'reading_goals',
    'feed_sources', 'feed_items', 'import_runs', 'import_items', 'integration_accounts',
    'sync_mutations', 'change_log'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_owner_all', table_name);
    execute format('alter table public.%I drop constraint if exists %I', table_name, table_name || '_owner_id_fkey');
    execute format('alter table public.%I alter column owner_id type text using owner_id::text', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (owner_id = (auth.jwt() ->> ''sub'')) with check (owner_id = (auth.jwt() ->> ''sub''))',
      table_name || '_owner_all', table_name
    );
  end loop;
end $$;

create or replace function public.ensure_profile()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner_id text := auth.jwt() ->> 'sub';
begin
  if v_owner_id is null then raise exception 'authentication required'; end if;
  insert into public.profiles(owner_id, display_name, avatar_url)
  values (v_owner_id, coalesce(auth.jwt() ->> 'email', auth.jwt() ->> 'name'), auth.jwt() ->> 'picture')
  on conflict (owner_id) do update set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
end;
$$;

create or replace function public.push_changes(p_device_id text, p_mutations jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  mutation jsonb;
  allowed_tables constant text[] := array[
    'projects', 'tasks', 'subtasks', 'day_entries', 'day_wins',
    'channels', 'content_pieces', 'metric_snapshots', 'habits', 'habit_logs',
    'health_goals', 'shelves', 'books', 'reading_sessions', 'reading_annotations',
    'reading_goals', 'feed_sources', 'feed_items', 'import_runs', 'import_items'
  ];
  v_owner_id text := auth.jwt() ->> 'sub';
  v_table_name text;
  v_entity_id text;
  v_mutation_id text;
  v_operation_name text;
  v_incoming_payload jsonb;
  v_base_revision bigint;
  v_current_revision bigint;
  v_current_payload jsonb;
  v_next_revision bigint;
  v_previous_result jsonb;
  v_outcome jsonb;
  outcomes jsonb := '[]'::jsonb;
begin
  if v_owner_id is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(p_mutations) <> 'array' then raise exception 'p_mutations must be an array'; end if;
  if jsonb_array_length(p_mutations) > 250 then raise exception 'a sync batch may contain at most 250 mutations'; end if;
  perform public.ensure_profile();

  for mutation in select value from jsonb_array_elements(p_mutations) loop
    v_table_name := mutation ->> 'entityType';
    v_entity_id := mutation ->> 'entityId';
    v_mutation_id := mutation ->> 'mutationId';
    v_operation_name := mutation ->> 'operation';
    v_incoming_payload := mutation -> 'payload';
    v_base_revision := nullif(mutation ->> 'baseRevision', '')::bigint;

    if v_table_name is null or not (v_table_name = any(allowed_tables)) or v_operation_name not in ('put', 'delete') or v_entity_id is null or v_mutation_id is null then
      v_outcome := jsonb_build_object('mutation_id', v_mutation_id, 'status', 'error', 'message', 'invalid mutation');
      outcomes := outcomes || jsonb_build_array(v_outcome);
      continue;
    end if;

    select sm.result into v_previous_result from public.sync_mutations sm where sm.owner_id = v_owner_id and sm.mutation_id = v_mutation_id;
    if v_previous_result is not null then outcomes := outcomes || jsonb_build_array(v_previous_result); continue; end if;

    execute format('select revision, payload from public.%I where owner_id = $1 and id = $2', v_table_name)
      into v_current_revision, v_current_payload using v_owner_id, v_entity_id;

    if v_base_revision is not null and v_current_revision is not null and v_current_revision > v_base_revision then
      v_outcome := jsonb_build_object('mutation_id', v_mutation_id, 'status', 'conflict', 'remote_payload', v_current_payload, 'remote_revision', v_current_revision);
    else
      v_next_revision := coalesce(v_current_revision, 0) + 1;
      if v_operation_name = 'delete' then
        execute format(
          'insert into public.%I(owner_id, id, payload, revision, deleted_at, updated_at)
           values($1, $2, coalesce($3, ''{}''::jsonb), $4, now(), now())
           on conflict(owner_id, id) do update set revision = $4, deleted_at = now(), updated_at = now()', v_table_name
        ) using v_owner_id, v_entity_id, v_current_payload, v_next_revision;
      else
        execute format(
          'insert into public.%I(owner_id, id, payload, revision, source, source_ref, created_at, updated_at, deleted_at)
           values($1, $2, $3, $4, $5, $6, now(), now(), null)
           on conflict(owner_id, id) do update set payload = $3, revision = $4, source = $5, source_ref = $6, updated_at = now(), deleted_at = null', v_table_name
        ) using v_owner_id, v_entity_id, coalesce(v_incoming_payload, '{}'::jsonb), v_next_revision, v_incoming_payload ->> 'source', v_incoming_payload ->> 'sourceRef';
      end if;
      insert into public.change_log(owner_id, entity_type, entity_id, operation, payload, revision)
      values(v_owner_id, v_table_name, v_entity_id, v_operation_name, case when v_operation_name = 'put' then v_incoming_payload else null end, v_next_revision);
      v_outcome := jsonb_build_object('mutation_id', v_mutation_id, 'status', 'accepted', 'revision', v_next_revision);
    end if;

    insert into public.sync_mutations(owner_id, mutation_id, device_id, entity_type, entity_id, result)
    values(v_owner_id, v_mutation_id, p_device_id, v_table_name, v_entity_id, v_outcome);
    outcomes := outcomes || jsonb_build_array(v_outcome);
  end loop;
  return outcomes;
end;
$$;

create or replace function public.pull_changes(p_after_seq bigint default 0)
returns table(seq bigint, entity_type text, entity_id text, operation text, payload jsonb, revision bigint, changed_at timestamptz)
language sql
security invoker
set search_path = public
as $$
  select c.seq, c.entity_type, c.entity_id, c.operation, c.payload, c.revision, c.changed_at
  from public.change_log c
  where c.owner_id = (auth.jwt() ->> 'sub') and c.seq > p_after_seq
  order by c.seq asc
  limit 1000;
$$;

revoke all on function public.ensure_profile() from public;
grant execute on function public.ensure_profile() to authenticated;

drop policy if exists import_artifacts_owner_read on storage.objects;
drop policy if exists import_artifacts_owner_insert on storage.objects;
drop policy if exists import_artifacts_owner_delete on storage.objects;
create policy import_artifacts_owner_read on storage.objects for select to authenticated
using (bucket_id = 'import-artifacts' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
create policy import_artifacts_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'import-artifacts' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
create policy import_artifacts_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'import-artifacts' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
