# Hosted and self-hosted product architecture

## Runtime modes

Kaizen uses one web client with two explicit modes:

- `device` is the zero-configuration default. IndexedDB is the source of truth, no account appears, imports stay local, and JSON backup/restore provides portability.
- `cloud` keeps the same IndexedDB stores and adds Clerk authentication, an account-scoped mutation outbox, and cursor-based synchronization through Supabase.

Vercel is the reference cloud frontend host. The included Dockerfile and Compose configuration provide a device-mode web container. The local Supabase stack supports migration and policy tests; a complete self-hosted cloud system needs additional Clerk token-verification and infrastructure configuration. See the [setup guide](setup-guide.md) for supported installation paths.

## Boundaries

`packages/domain` owns public entity, repository, sync, and import contracts. `LocalRepository` implements the IndexedDB contract, while `SyncedRepository` adds outbox delivery. Zustand remains the reactive UI cache during the gradual migration of module actions into services.

`packages/importers` contains pure provider parsers and matching rules. Import UI coordinates previews and user choices without sending source files to a server. Server functions are reserved for privileged work such as account deletion and future integrations with secrets.

## Tenancy and authorization

Each cloud account has a personal workspace; shared team workspaces are not exposed in the product. Every cloud row carries Clerk's text user ID in `owner_id` and every user-owned table enforces `owner_id = auth.jwt() ->> 'sub'` with row-level security. Nullable `space_id` and `profiles.default_space_id` fields reserve a migration path for future households or organizations.

The browser uses Clerk's publishable key and a publishable Supabase key. Clerk provides hosted sign-in options such as email, Google, Apple, GitHub, and passkeys. The `delete-account` function verifies the Clerk token, removes private import artifacts and cloud data, then deletes the Clerk user with a server-side Clerk secret.

## Synchronization

Each account has its own durable IndexedDB outbox, change cursor, migration marker, and conflict inbox. Writes are serialized before persistence to prevent concurrent UI edits from overwriting queued mutations. Push requests are idempotent by `mutation_id` and bounded to 100 client-side operations, under the server maximum of 250. Accepted writes increment revisions and append `change_log`; pulls advance a user-scoped sequence cursor in pages of 1,000.

Deleted records remain server tombstones. Append-only module records retain distinct IDs. Competing record versions are held in the conflict inbox until the user chooses the cloud version or rebases the device version on the accepted server revision.

Device-to-account migration uses a manual JSON export and restore into the intended signed-in account. Restored collection changes are queued by the normal sync watchers, including removals. Legacy shared caches are not automatically adopted. See [backup and restore behavior](user-guide.md#back-up-and-restore).

## Product growth seams

- Today can add templates, agenda blocks, weekly review, and read-only insight cards through the existing widget registry.
- Tasks can add recurrence, calendar projections, reminders, and later delegation behind scheduling services.
- Studio can add briefs, publishing checklists, provider adapters, and time-series reporting.
- Health can add typed measurements and consented wearable adapters with separate retention rules.
- Library already provides CSV, Kindle clippings, unmatched-book decisions, annotation storage, import undo, ISBN lookup, and camera scanning; annotation browsing and reading analytics can build on these entities.
- Feed can add server refresh jobs, canonical source/item matching, capture, and enrichment.
- Settings owns sync state, conflicts, import history, export/restore, privacy controls, and account deletion.

## Operational gates

CI checks TypeScript, parser and persistence behavior, store migrations, matching, conflict planning, the production build, migration/type fingerprint drift, SQL reset, sync idempotency, tombstones, RLS isolation, and the AGPL package declaration. Production rollout still requires environment-specific SMTP, Google credentials, monitoring, backup retention, and privacy-conscious analytics configuration.
