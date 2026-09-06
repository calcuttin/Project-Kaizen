# Kaizen 改善

A local-first life operating system for tasks, health, reading, publishing, and continuous improvement.

Kaizen runs in two modes. **Device mode** is the default: it requires no account or credentials and stores data in IndexedDB. **Cloud mode** adds Clerk authentication and private Supabase-backed multi-device synchronization while retaining the local database for offline use.

For a visual, step-by-step choice between managed cloud and self-hosting, start with the [setup guide](docs/setup-guide.md).

## Quick start

Requirements: Node 24 and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5180`. A fresh clone starts in device mode. Export a backup from Settings before clearing browser storage or changing browsers.

The production container also defaults to device mode:

```bash
docker compose up --build
```

## Cloud development

Install Docker and the Supabase CLI, then recreate the complete local backend from committed migrations:

```bash
pnpm exec supabase start
pnpm exec supabase db reset
cp .env.example .env.local
```

Set these values from `pnpm exec supabase status`:

```dotenv
VITE_KAIZEN_MODE=cloud
VITE_CLERK_PUBLISHABLE_KEY=<Clerk publishable key>
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
VITE_APP_URL=http://localhost:5180
```

Run `pnpm dev`. Clerk's linked development instance provides the local sign-in experience; enable the same Clerk providers there that you intend to test in development.

For managed cloud, create separate development, staging, and production Supabase projects, apply `supabase/migrations`, then enable Clerk under **Supabase → Authentication → Third-Party Auth**. Clerk controls Google, Apple, email, passkeys, and other sign-in methods; Supabase receives Clerk session tokens to enforce RLS.

## Deploy to Vercel

Import the GitHub repository into Vercel as a Vite project. In **Project → Settings → Environment Variables**, add these values for **Production and Preview**:

```dotenv
VITE_KAIZEN_MODE=cloud
VITE_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_PUBLISHABLE_KEY
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_APP_URL=https://YOUR_STABLE_PRODUCTION_DOMAIN
VITE_ENABLE_BUNDLED_IMPORTS=false
```

Every `VITE_` value must use Vercel's **Config** type, not **Secret**. Vite embeds values with that prefix in the browser bundle. Use the stable production domain shown in **Project → Settings → Domains** for `VITE_APP_URL`; do not use a deployment-specific URL containing a unique deployment ID.

Never add `CLERK_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to Vercel. They belong only in Supabase's server-side Edge Function environment. The [managed-cloud setup guide](docs/setup-guide.md#apply-the-backend-in-the-supabase-dashboard--recommended) shows how to apply the database, deploy `delete-account`, and configure its `CLERK_SECRET_KEY` entirely in the Supabase dashboard; the CLI is optional.

After changing an environment variable, redeploy the latest Vercel deployment so Vite rebuilds with the updated values. Copy the Vercel domain marked primary or production—never a one-off deployment URL—into `VITE_APP_URL`. In **Clerk → Configure → Paths and URLs**, add that exact URL and `http://localhost:5180` to both **Allowed origins** and **Allowed redirect URLs**. Set both sign-in and sign-up fallback redirects to `/`; Kaizen uses modal authentication, so leave dedicated sign-in and sign-up URLs empty. Then activate Clerk's Supabase integration in the Clerk Dashboard and add the shown Clerk domain in Supabase.

## Data migration and sync

Cloud mode opens a separate browser workspace for each authenticated account. Stores are loaded only after authentication; account switches and sign-out reload the document so component state cannot carry over. New records and imports sync only to the active account.

Before upgrading from the legacy shared browser cache, export a JSON backup from the old app. Existing server records download into the new account cache from the beginning. Legacy device stores and pending queues remain untouched and are never automatically assigned to an account because their owner is unknown. Restore a verified backup through Settings → Import only while signed into its owner’s account.

Cloud edits are written to a per-account IndexedDB outbox. Kaizen pushes on app open, reconnect, foreground return, manual sync, and once per minute while open. The server records mutation IDs for idempotency, increments revisions, writes a user-scoped change sequence, and retains deletion tombstones. Sync cursors, queues, conflicts, and migration state are isolated by account on shared devices.

## Library imports

Library → Import supports:

- Book CSV files, including common Goodreads columns, with a local preview and duplicate detection by ISBN or normalized title/author.
- Kindle `My Clippings.txt` files, grouped by book and imported as highlights, notes, and bookmarks.
- Creation of unmatched Kindle books on a Kindle shelf, optional before commit.
- One-step undo for records created by the most recent import.

Import source files are parsed in the browser and are not uploaded. Imported records synchronize to the signed-in account in cloud mode. Online book covers are off by default; enabling them in Settings → Privacy permits Open Library lookups and remote image loading. Manual ISBN lookup contacts Open Library when requested.

## Project layout

```text
apps/web/             gradual destination for the Vite web client
packages/domain/      public repository, sync, entity, and importer contracts
packages/importers/   pure CSV and Kindle parsers
src/app/              router, module registry, and shell wiring
src/core/             IndexedDB, auth, repositories, sync, and configuration
src/modules/          Today, Tasks, Studio, Health, Library, Feed, Settings
supabase/             local config, versioned SQL migrations, RLS tests, seed data
docker/               portable production web server configuration
```

The existing module registry remains the extension point for pages, Today widgets, and commands. Persistence is moving behind shared repository contracts incrementally; current Zustand stores remain the reactive UI cache. Legacy shared IndexedDB data is preserved separately for deliberate recovery.

## Validation

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:e2e:cloud
pnpm check:public-source
pnpm build
pnpm exec supabase db reset
pnpm exec supabase test db
```

CI runs the TypeScript, unit, production build, migration, RLS, generated-schema, and license gates. See [operations](docs/operations.md) for deployment, backup, upgrades, privacy, and incident procedures.

## License and brand

Kaizen is licensed under `AGPL-3.0-or-later`. See [LICENSE](LICENSE). Product names and official hosted-service branding are covered separately by [TRADEMARKS.md](TRADEMARKS.md).
