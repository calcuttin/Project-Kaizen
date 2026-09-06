# Kaizen operations guide

## Environments

Use independent Supabase projects for development, staging, and production. Apply migrations in order with `supabase db push`; do not edit an applied migration. Generate and commit database types after every schema change, then let CI fail if generated output drifts.

The web build is static. Vercel is the reference host, and `vercel.json` provides SPA routing and security headers. `Dockerfile` and `compose.yaml` provide a portable Nginx build for device or cloud mode.

## Authentication

Hosted environments use Clerk for email, social, and passkey sign-in. Add every deployed origin to Clerk's allowed origins and redirect URLs. Keep publishable keys in the browser and keep `CLERK_SECRET_KEY` plus Supabase service keys in Supabase functions or server-side jobs. Review Clerk's provider settings and login rate limits before public launch.

## Backups and restore

Enable managed Supabase backups and record the recovery window for each environment. Before a database migration, take a database backup and validate the change in staging. Device users back up through Settings → Export; restoration uses Settings → Import and does not require a server.

For self-hosted Supabase, back up the Postgres volume and object-storage volume together. Practice restoration on a separate stack. The committed migrations recreate structure and policy, but user data still requires database and storage backups.

## Upgrades

1. Export device data or verify the latest database backup.
2. Pull the tagged release.
3. Review migration notes and environment-variable changes.
4. Run `supabase db reset`, tests, and the production build in staging.
5. Apply database migrations before deploying a web client that depends on them.
6. Rebuild the container or deploy the static `dist` directory.

## Privacy and retention

Cloud caches are namespaced per account and the app reloads on identity changes. IndexedDB is not encrypted: anyone with access to the same OS/browser profile or DevTools can inspect browser storage. Use separate browser profiles on shared machines. The app's login gate is not an OS-level storage boundary.

For the account-isolation upgrade, export legacy device data before deploying. Old shared caches and sync queues are retained but never auto-adopted. Fresh account caches replay cloud changes from sequence zero; unsynced legacy records require deliberate, owner-verified backup recovery.

Every user-owned table has row-level security on `owner_id = auth.jwt() ->> 'sub'`, where `sub` is the Clerk user ID. Raw CSV and Kindle files remain on the device. The private `import-artifacts` bucket is reserved for future imports that require server processing; uploaded sources must use a user-prefixed signed path and be deleted after processing.

Reading and health data should not be included in analytics payloads. Usage analytics should be opt-in or collect coarse feature events without titles, note text, measurements, URLs, or identifiers. Account deletion must remove Auth, Postgres rows, storage paths, and integration credentials.

## Monitoring and incidents

Capture client crashes without user content. Edge Functions should emit structured request IDs, operation type, duration, status, and coarse counts. Alert on elevated authentication failures, sync RPC errors, import failures, and backup failures. In an incident, disable the affected integration, preserve audit logs, rotate secrets, communicate scope, and verify deletion or recovery work.
