# Maintain a Kaizen installation

[← README](../README.md) · [Cloud setup](cloud-setup.md) · [Development checks](development.md)

This guide is for the person operating the site. Everyday users should start with [Using Kaizen](user-guide.md).

## Know which environment you are changing

Keep a private record of the GitHub repository, Vercel project, stable site URL, Clerk instance, and Supabase project for each environment. Use separate development and production resources so experiments cannot change real users' data.

The frontend is a static Vite build. `VITE_` values are public build inputs; changing them requires a rebuild. Clerk secret keys and Supabase privileged keys belong in the backend, never in frontend variables or source control.

For production Clerk, complete the [domain and provider setup](https://clerk.com/docs/guides/development/deployment/production). Keep Clerk's instance, Supabase's trusted Clerk domain, the frontend publishable key, and the deletion function's secret key aligned.

## Backups

Users can export their workspace through **Settings → Data → Export**. A JSON export is not a server-wide backup and is not automatically downloaded before an import or migration.

For a managed backend, verify the database backup coverage and retention available on your Supabase plan. Back up storage objects separately as needed: database backups do not include the underlying Storage files. Practice restoring to a separate project. See [Supabase database backups](https://supabase.com/docs/guides/platform/backups).

Keep backup files private. Before an upgrade, verify that the latest backup can be read and that you know how to restore it.

## Update an existing installation

1. Export your local workspace or verify the relevant server backups.
2. Review the incoming changes for new migrations, environment variables, and recovery instructions.
3. Test the update against development data first.
4. Apply required new database migrations before deploying a frontend that depends on them.
5. Deploy the frontend and any changed Edge Functions, then verify sign-in, sync, and imports.

For a local Git checkout with no conflicting local changes:

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm dev
```

Stop the existing dev server first. If Git reports local changes or a diverged branch, resolve those before updating; do not discard them just to continue.

For the web container, pull the source update and rebuild with `docker compose up --build -d`. For Vercel, pushing to its connected production branch creates a new deployment. A personal fork does not receive upstream code changes automatically: sync your fork before relying on Vercel to deploy an upstream update.

After a repository replacement, confirm Vercel's GitHub app has access to the replacement and reconnect the project. A working old deployment does not prove the webhook is still connected.

## Database migrations

For a **fresh database**, choose one initialization method:

- **Dashboard:** run the files once, in order, following [cloud setup](cloud-setup.md#4-create-kaizens-database). Record what you applied.
- **CLI:** after installing project dependencies, authenticate and link the intended fresh project, then apply the migrations:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase migration list
pnpm exec supabase db push
```

The CLI may prompt for your database password. Check the project reference before proceeding.

For later updates, apply only new migrations. **Do not blindly use `db push` on a project initialized manually in SQL Editor.** The SQL Editor does not populate the CLI's migration history. Compare the applied schema and files, then reconcile migration history using the [Supabase migration commands](https://supabase.com/docs/reference/cli/supabase-migration-repair) before switching methods. Do not mark a migration applied just to bypass a real error.

Use `supabase db reset` only for disposable local databases. It is not a repair procedure for a hosted workspace.

## Deploy a function update

From the installed repository root:

```bash
pnpm exec supabase functions deploy delete-account --project-ref YOUR_PROJECT_REF --use-api
```

This deploys `index.ts` and its imported `storage.ts`. The function verifies Clerk tokens itself; its committed configuration disables the incompatible legacy Supabase JWT check. Verify the matching `CLERK_SECRET_KEY` exists in that project's Edge Function secrets.

Test account deletion only with disposable accounts. Verify their rows and files disappear and another account's data remains intact.

## Account changes and recovery

Account ownership is based on Clerk user IDs, not matching email text. Moving from a development instance to production, or changing Clerk applications, can change those IDs. Prepare a validated owner mapping and recovery plan before switching; do not replace keys alone and assume data will follow.

Legacy shared browser caches are preserved separately and are never automatically assigned to a newly signed-in user. Existing cloud records replay into the per-account cache. Recover unsynced legacy data with a verified export while signed into the correct owner account.

## Self-hosting boundaries

The included Compose file is a **web-only, device-mode** deployment. It neither starts Supabase nor fully wires Clerk cloud configuration into a container build. The supported beginner cloud recipe is managed Clerk + Supabase + Vercel.

A fully self-hosted backend requires you to operate Postgres, APIs, storage, functions, backups, and updates, and to configure Clerk JWT validation and ownership policies throughout that stack. The local Supabase test configuration is not a complete production recipe. Start with [Supabase's self-hosting documentation](https://supabase.com/docs/guides/self-hosting/docker) and verify third-party auth compatibility for the version you deploy before using real data.

## Privacy and incidents

Account caches are separate but not encrypted. Browser-profile access can expose cached records; separate profiles are appropriate on shared machines. Imported CSV/Kindle source files stay in the browser. The private `import-artifacts` bucket is reserved for workflows that need server-side files, with account-prefixed object paths.

Keep titles, notes, health records, credentials, and backup contents out of logs and analytics. Monitor sync, sign-in, and function failures using coarse counts and request IDs. In an incident, preserve relevant audit evidence, restrict the affected access, rotate exposed secrets where needed, and verify recovery.

If private data ever enters tracked source or built assets, removing the current file is not enough: review Git history and old deployments too. Retire affected deployment URLs, keep private archives private, and verify what a fresh clone and unauthenticated visitor can retrieve.
