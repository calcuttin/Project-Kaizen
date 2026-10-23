begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

select ok(not has_function_privilege('authenticated', 'public.begin_account_deletion(text)', 'EXECUTE'), 'clients cannot fence any account');
select ok(not has_function_privilege('anon', 'public.begin_account_deletion(text)', 'EXECUTE'), 'anonymous cannot fence accounts');
select ok(not has_schema_privilege('authenticated', 'kaizen_private', 'USAGE'), 'private deletion subjects are inaccessible to clients');
select is((select count(*)::int from pg_trigger where tgname='account_write_guard' and not tgisinternal), 25, 'all 24 public tables and storage have write guards');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"deletion-a","role":"authenticated"}', true);
select lives_ok($$select public.ensure_profile()$$, 'active owner can create a profile');
insert into public.tasks(owner_id,id,payload) values('deletion-a','task','{"title":"Synthetic"}');
insert into storage.objects(bucket_id,name) values('import-artifacts','deletion-a/nested/file.txt');
select ok(public.account_is_active(), 'owner starts active');
select ok(exists(select 1 from pg_locks where pid=pg_backend_pid() and locktype='advisory' and mode='ShareLock'), 'client writes hold a transaction-scoped shared deletion guard');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select lives_ok($$select public.begin_account_deletion('deletion-a')$$, 'service can fence the account');
select lives_ok($$select public.begin_account_deletion('deletion-a')$$, 'fence is idempotent');
select ok(exists(select 1 from pg_locks where pid=pg_backend_pid() and locktype='advisory' and mode='ExclusiveLock'), 'fencing takes the conflicting exclusive transaction lock');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"deletion-a","role":"authenticated"}', true);
select ok(not public.account_is_active(), 'old JWT is fenced');
select is((select count(*)::int from public.tasks),0,'old JWT cannot read remaining data');
select is((select count(*)::int from storage.objects),0,'old JWT cannot read remaining files');
select throws_ok($$insert into public.tasks(owner_id,id) values('deletion-a','late')$$,'42501',null,'old JWT cannot recreate a task');
select throws_ok($$select public.ensure_profile()$$,'42501',null,'old JWT cannot recreate a profile');
select throws_ok($$select public.push_changes('late-device','[{"mutationId":"late","entityType":"tasks","entityId":"late","operation":"put","payload":{}}]'::jsonb)$$,'42501',null,'old JWT cannot sync');
select throws_ok($$insert into storage.objects(bucket_id,name) values('import-artifacts','deletion-a/late.txt')$$,'42501',null,'old JWT cannot upload file metadata');
select set_config('request.jwt.claims', '{"sub":"deletion-b","role":"authenticated"}', true);
select lives_ok($$insert into public.tasks(owner_id,id) values('deletion-b','unaffected')$$,'another account remains writable');
select ok(public.account_is_active(),'another account remains active');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select lives_ok($$delete from public.tasks where owner_id='deletion-a'$$,'service cleanup bypasses client fence');
select is((select count(*)::int from public.tasks where owner_id='deletion-a'),0,'service removed fenced account records');
select is((select count(*)::int from public.tasks where owner_id='deletion-b'),1,'other account data survives cleanup');
reset role;
select * from finish();
rollback;
