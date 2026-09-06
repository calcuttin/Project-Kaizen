begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select no_plan();

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_one","role":"authenticated"}', true);
insert into public.books(owner_id, id, payload) values ('user_one', 'book-one', '{"title":"Private"}');

select is((select count(*)::int from public.books), 1, 'owner can read their row');
select throws_ok($$insert into public.books(owner_id, id) values ('user_two', 'forbidden')$$, '42501', null, 'owner cannot insert for another user');
select is((public.push_changes('test-device', '[{"mutationId":"m1","entityType":"books","entityId":"synced","operation":"put","payload":{"id":"synced","title":"Synced"}}]'::jsonb) -> 0 ->> 'status'), 'accepted', 'sync accepts an owned mutation');
select is((public.push_changes('test-device', '[{"mutationId":"m1","entityType":"books","entityId":"synced","operation":"put","payload":{"id":"synced","title":"Synced"}}]'::jsonb) -> 0 ->> 'status'), 'accepted', 'sync replay returns the original result');
select is((select count(*)::int from public.sync_mutations where mutation_id = 'm1'), 1, 'mutation idempotency stores one receipt');
select is((public.push_changes('test-device', '[{"mutationId":"m2","entityType":"books","entityId":"synced","operation":"delete"}]'::jsonb) -> 0 ->> 'status'), 'accepted', 'sync accepts a deletion');
select ok((select deleted_at is not null from public.books where id = 'synced'), 'deletion creates a tombstone');

select set_config('request.jwt.claims', '{"sub":"user_two","role":"authenticated"}', true);
select is((select count(*)::int from public.books), 0, 'another user cannot read the row');
select is((select count(*)::int from public.change_log), 0, 'another user cannot infer change history');

-- Same entity IDs are independent per owner; caller-supplied ownership is ignored.
select is((public.push_changes('device-b', '[{"mutationId":"b1","entityType":"books","entityId":"book-one","operation":"put","owner_id":"user_one","payload":{"title":"B private"}}]'::jsonb) -> 0 ->> 'status'), 'accepted', 'B can use the same entity ID in their own account');
select is((select owner_id from public.books where id = 'book-one'), 'user_two', 'JWT subject determines ownership');
select is((select count(*)::int from public.pull_changes(0)), 1, 'B pulls only their own change');
select throws_ok($$update public.books set owner_id = 'user_one' where id = 'book-one'$$, '42501', null, 'cannot transfer a row into another account');
update public.books set payload = '{"title":"tampered"}' where owner_id = 'user_one';
delete from public.books where owner_id = 'user_one';
select set_config('request.jwt.claims', '{"sub":"user_one","role":"authenticated"}', true);
select is((select payload ->> 'title' from public.books where id = 'book-one'), 'Private', 'B cannot modify or delete A records');
select is((select count(*)::int from public.pull_changes(0)), 2, 'A pulls only A changes, including tombstones');
select is((public.push_changes('test-device', '[{"mutationId":"bad","entityType":"profiles","entityId":"x","operation":"put"}]'::jsonb) -> 0 ->> 'status'), 'error', 'sync rejects non-allowlisted tables');

reset role;
select is((select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'), 24, 'all application tables are covered');
select ok(bool_and(c.relrowsecurity), 'every application table has RLS') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';
select ok(not has_function_privilege('anon', 'public.push_changes(text,jsonb)', 'EXECUTE'), 'anonymous cannot push');
select ok(not has_function_privilege('anon', 'public.pull_changes(bigint)', 'EXECUTE'), 'anonymous cannot pull');
select ok(not has_function_privilege('anon', 'public.ensure_profile()', 'EXECUTE'), 'anonymous cannot create profiles');
select ok(not public, 'import bucket is private') from storage.buckets where id='import-artifacts';

-- Exercise isolation on every generic entity table, not only the library.
create function pg_temp.check_entity_isolation() returns setof text language plpgsql security invoker as $fn$
declare t text; v_count integer; v_payload jsonb;
begin
  foreach t in array array['projects','tasks','subtasks','day_entries','day_wins','channels','content_pieces','metric_snapshots','habits','habit_logs','health_goals','shelves','books','reading_sessions','reading_annotations','reading_goals','feed_sources','feed_items','import_runs','import_items','integration_accounts'] loop
    perform set_config('request.jwt.claims', '{"sub":"user_one","role":"authenticated"}', true);
    execute format('insert into public.%I(owner_id,id,payload) values (%L,%L,%L)',t,'user_one','isolation-fixture','{"private":"A"}');
    perform set_config('request.jwt.claims', '{"sub":"user_two","role":"authenticated"}', true);
    execute format('select count(*) from public.%I where id=%L',t,'isolation-fixture') into v_count;
    return next is(v_count,0,t || ': B cannot read A');
    return next throws_ok(format('insert into public.%I(owner_id,id) values (%L,%L)',t,'user_one','forbidden-owner'), '42501', null, t || ': B cannot insert as A');
    execute format('update public.%I set payload=%L where owner_id=%L and id=%L',t,'{"private":"tampered"}','user_one','isolation-fixture');
    execute format('delete from public.%I where owner_id=%L and id=%L',t,'user_one','isolation-fixture');
    perform set_config('request.jwt.claims', '{"sub":"user_one","role":"authenticated"}', true);
    execute format('select payload from public.%I where id=%L',t,'isolation-fixture') into v_payload;
    return next is(v_payload,'{"private":"A"}'::jsonb,t || ': B cannot update or delete A');
  end loop;
end;
$fn$;
set local role authenticated;
select * from pg_temp.check_entity_isolation();

-- Storage ownership checks use the same Clerk subject as table policies.
select set_config('request.jwt.claims', '{"sub":"user_one","role":"authenticated"}', true);
insert into storage.objects(bucket_id,name) values ('import-artifacts','user_one/security-test.txt');
select set_config('request.jwt.claims', '{"sub":"user_two","role":"authenticated"}', true);
select is((select count(*)::int from storage.objects where name='user_one/security-test.txt'),0,'B cannot read A storage objects');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('import-artifacts','user_one/forbidden.txt')$$,'42501',null,'B cannot upload into A folder');
-- Storage deletion is enforced by RLS and must be done through the storage API in production.
select * from finish();
rollback;
