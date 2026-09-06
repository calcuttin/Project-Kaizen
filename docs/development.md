# Develop Kaizen

[← README](../README.md) · [Local setup](local-setup.md) · [Cloud setup](cloud-setup.md)

The app's **Help & guides** pages are generated from these Markdown files by `scripts/guides-plugin.ts` during development and production builds. Edit the source guide once; both GitHub and the app use it. The plugin publishes an explicit list of guides and setup source files, and rejects missing internal links. When adding a linked file, review it for publication before adding it to that list.

Run commands from the repository root, using Node.js 24 and pnpm 11.19.0. The Vite client currently lives at the root; `apps/web` is not a separate runnable application.

## Everyday development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

For UI work, use device mode with no cloud credentials. For real sign-in and sync, [run the frontend against a managed development backend](cloud-setup.md#optional-run-the-frontend-locally-with-cloud-sync).

A useful production-build check is:

```bash
pnpm build
pnpm preview --port 5180
```

Stop the dev server first. Preview serves the compiled `dist/` build for local verification; use Vercel or a configured web server for hosting.

## Run checks

Use a fresh development checkout with no cloud `.env.local` for the device tests, and stop existing servers on ports 5180 and 5181 before running browser tests.

```bash
pnpm typecheck
pnpm test
pnpm check:schema-types
pnpm check:public-source
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:e2e:cloud
```

The cloud browser test supplies synthetic authentication and database transports. It does not require your personal Clerk or Supabase credentials. On Linux, Playwright may also need system packages; use its documented `install --with-deps chromium` option when appropriate.

## Database policy tests

Install and start Docker first. The repository includes the Supabase CLI as a dependency:

```bash
pnpm exec supabase start
pnpm exec supabase db reset
pnpm exec supabase test db
pnpm exec supabase stop
```

These commands target the local test stack. **`db reset` erases and rebuilds its local database.** Never add a remote database URL or `--linked` to a reset command against real user data.

Starting this stack does not by itself configure a working local Clerk-to-Supabase sign-in system. It is the documented route for migrations and policy tests; use a managed development project for the complete cloud setup.

## When changing the database

Add a new numbered SQL file to `supabase/migrations/`; keep applied migrations unchanged. Update the corresponding types in `src/core/database.types.ts` and its migration fingerprint. `pnpm check:schema-types` checks the fingerprint, not every SQL/type semantic difference, so review the types as well as the migration.

Run the local database tests and normal checks before applying a migration to a hosted environment. See [database operations](operations.md#database-migrations), especially if that environment was initialized using the SQL Editor.

## Project map

| Folder | Purpose |
| --- | --- |
| `src/app/` | Navigation, shell, and module registry |
| `src/core/` | Browser storage, authentication, repositories, imports, and sync |
| `src/modules/` | Today, Tasks, Studio, Health, Library, Feed, and Settings features |
| `packages/domain/` | Shared entity, repository, and sync contracts |
| `packages/importers/` | CSV and Kindle parsers |
| `supabase/` | Database migrations, Edge Functions, local configuration, and RLS tests |
| `e2e/` | Browser tests |
| `docker/` | Nginx configuration for the web container |
| `docs/` | User, setup, architecture, and operations guides |

Use synthetic fixtures in tests and documentation. Keep personal imports, screenshots, `.env` files, and backups outside tracked source. For a release history check, run `node scripts/check-public-source.mjs --history` in a fresh clone; this scans reachable Git objects, not just the current files.
