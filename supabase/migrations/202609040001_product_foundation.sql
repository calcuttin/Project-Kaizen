create extension if not exists pgcrypto;

create table public.profiles (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  default_space_id uuid,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(owner_id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), new.raw_user_meta_data ->> 'avatar_url')
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

create trigger create_profile_after_signup after insert on auth.users
for each row execute function public.create_profile_for_user();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'projects', 'tasks', 'subtasks', 'day_entries', 'day_wins',
    'channels', 'content_pieces', 'metric_snapshots',
    'habits', 'habit_logs', 'health_goals',
    'shelves', 'books', 'reading_sessions', 'reading_annotations', 'reading_goals',
    'feed_sources', 'feed_items', 'import_runs', 'import_items', 'integration_accounts'
  ] loop
    execute format(
      'create table public.%I (
        owner_id uuid not null references auth.users(id) on delete cascade,
        space_id uuid,
        id text not null,
        payload jsonb not null default ''{}''::jsonb,
        revision bigint not null default 1,
        source text,
        source_ref text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        deleted_at timestamptz,
        primary key (owner_id, id)
      )', table_name
    );
    execute format('create index %I on public.%I(owner_id, updated_at)', table_name || '_owner_updated_idx', table_name);
    execute format('create index %I on public.%I using gin(payload)', table_name || '_payload_idx', table_name);
  end loop;
end $$;

create unique index books_owner_isbn_idx on public.books(owner_id, ((payload ->> 'isbn'))) where payload ->> 'isbn' is not null and deleted_at is null;
create unique index reading_annotations_source_ref_idx on public.reading_annotations(owner_id, source, source_ref) where source_ref is not null and deleted_at is null;
create unique index feed_items_source_ref_idx on public.feed_items(owner_id, source, source_ref) where source_ref is not null and deleted_at is null;

create table public.sync_mutations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  mutation_id text not null,
  device_id text not null,
  entity_type text not null,
  entity_id text not null,
  result jsonb not null,
  accepted_at timestamptz not null default now(),
  primary key (owner_id, mutation_id)
);

create table public.change_log (
  seq bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  operation text not null check (operation in ('put', 'delete')),
  payload jsonb,
  revision bigint not null,
  changed_at timestamptz not null default now()
);
create index change_log_owner_seq_idx on public.change_log(owner_id, seq);

alter table public.profiles enable row level security;
create policy profiles_owner_all on public.profiles for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select, insert, update, delete on public.profiles to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'projects', 'tasks', 'subtasks', 'day_entries', 'day_wins',
    'channels', 'content_pieces', 'metric_snapshots',
    'habits', 'habit_logs', 'health_goals',
    'shelves', 'books', 'reading_sessions', 'reading_annotations', 'reading_goals',
    'feed_sources', 'feed_items', 'import_runs', 'import_items', 'integration_accounts',
    'sync_mutations', 'change_log'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())', table_name || '_owner_all', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end $$;

grant usage, select on all sequences in schema public to authenticated;

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
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(p_mutations) <> 'array' then raise exception 'p_mutations must be an array'; end if;
  if jsonb_array_length(p_mutations) > 250 then raise exception 'a sync batch may contain at most 250 mutations'; end if;

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

    select sm.result into v_previous_result from public.sync_mutations sm where sm.owner_id = auth.uid() and sm.mutation_id = v_mutation_id;
    if v_previous_result is not null then outcomes := outcomes || jsonb_build_array(v_previous_result); continue; end if;

    execute format('select revision, payload from public.%I where owner_id = $1 and id = $2', v_table_name)
      into v_current_revision, v_current_payload using auth.uid(), v_entity_id;

    if v_base_revision is not null and v_current_revision is not null and v_current_revision > v_base_revision then
      v_outcome := jsonb_build_object('mutation_id', v_mutation_id, 'status', 'conflict', 'remote_payload', v_current_payload, 'remote_revision', v_current_revision);
    else
      v_next_revision := coalesce(v_current_revision, 0) + 1;
      if v_operation_name = 'delete' then
        execute format(
          'insert into public.%I(owner_id, id, payload, revision, deleted_at, updated_at)
           values($1, $2, coalesce($3, ''{}''::jsonb), $4, now(), now())
           on conflict(owner_id, id) do update set revision = $4, deleted_at = now(), updated_at = now()', v_table_name
        ) using auth.uid(), v_entity_id, v_current_payload, v_next_revision;
      else
        execute format(
          'insert into public.%I(owner_id, id, payload, revision, source, source_ref, created_at, updated_at, deleted_at)
           values($1, $2, $3, $4, $5, $6, now(), now(), null)
           on conflict(owner_id, id) do update set payload = $3, revision = $4, source = $5, source_ref = $6, updated_at = now(), deleted_at = null', v_table_name
        ) using auth.uid(), v_entity_id, coalesce(v_incoming_payload, '{}'::jsonb), v_next_revision, v_incoming_payload ->> 'source', v_incoming_payload ->> 'sourceRef';
      end if;
      insert into public.change_log(owner_id, entity_type, entity_id, operation, payload, revision)
      values(auth.uid(), v_table_name, v_entity_id, v_operation_name, case when v_operation_name = 'put' then v_incoming_payload else null end, v_next_revision);
      v_outcome := jsonb_build_object('mutation_id', v_mutation_id, 'status', 'accepted', 'revision', v_next_revision);
    end if;

    insert into public.sync_mutations(owner_id, mutation_id, device_id, entity_type, entity_id, result)
    values(auth.uid(), v_mutation_id, p_device_id, v_table_name, v_entity_id, v_outcome);
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
  where c.owner_id = auth.uid() and c.seq > p_after_seq
  order by c.seq asc
  limit 1000;
$$;

revoke all on function public.push_changes(text, jsonb) from public;
revoke all on function public.pull_changes(bigint) from public;
grant execute on function public.push_changes(text, jsonb) to authenticated;
grant execute on function public.pull_changes(bigint) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('import-artifacts', 'import-artifacts', false, 20971520, array['text/plain', 'text/csv', 'application/json'])
on conflict(id) do nothing;

create policy import_artifacts_owner_read on storage.objects for select to authenticated
using (bucket_id = 'import-artifacts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy import_artifacts_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'import-artifacts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy import_artifacts_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'import-artifacts' and (storage.foldername(name))[1] = auth.uid()::text);
