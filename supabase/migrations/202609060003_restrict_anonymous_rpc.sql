-- Supabase can grant anon EXECUTE directly through default privileges.
-- Revoking PUBLIC alone does not remove those direct grants.
revoke all on function public.ensure_profile() from public, anon;
revoke all on function public.push_changes(text, jsonb) from public, anon;
revoke all on function public.pull_changes(bigint) from public, anon;
grant execute on function public.ensure_profile() to authenticated;
grant execute on function public.push_changes(text, jsonb) to authenticated;
grant execute on function public.pull_changes(bigint) to authenticated;
