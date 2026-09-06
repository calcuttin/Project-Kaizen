# Set up Kaizen

Kaizen has two good homes. The managed cloud option gives you sign-in and sync without running servers. The self-hosted option gives you full control, starting with a simple private device-only install.

![Choose a Kaizen setup path](assets/setup-choice.svg)

## Choose your path

| If you want… | Choose | Docker needed? |
| --- | --- | --- |
| A personal URL, sign-in, sync, backups handled by a provider | Managed cloud | No |
| A private app on one machine with no account | Device-only self-hosting | Yes, for the optional container setup |
| Your own database, Auth, Storage, and sync backend | Full self-hosted cloud | Yes |

You can start in device mode and move your data to cloud sync later. Kaizen creates a backup before it uploads anything, and it never uploads existing local data automatically.

## Managed cloud: Clerk + Supabase + Vercel

This is the recommended route for most people. Clerk provides the sign-in experience, Supabase provides the private backend and synchronization, and Vercel serves the Kaizen web app. You do not run Docker locally or in production.

![Managed cloud setup flow](assets/setup-hosted.svg)

### 1. Put Kaizen in a Git repository

Vercel deploys from Git. Create an **empty** repository on [GitHub](https://github.com/new) (do not add GitHub's README, `.gitignore`, or license files), then run this from the Kaizen folder:

```bash
git init -b main
git add .
git commit -m "Initial Kaizen release"
git remote add origin https://github.com/YOUR_ACCOUNT/kaizen.git
git push -u origin main
```

If this folder is already a Git repository, skip `git init` and connect its existing remote instead. From this point on, pushing to `main` will trigger a production deployment in Vercel.

### 2. Create Clerk and Supabase projects

Create a Clerk application in the [Clerk Dashboard](https://dashboard.clerk.com/). Enable the sign-in methods you want to offer, such as Google, Apple, email, or passkeys. Keep its **publishable key** nearby; it is designed for browser use.

Create a new project in [Supabase](https://supabase.com/dashboard) too. Keep the project URL and **publishable** key nearby. Never copy a Supabase service-role key or Clerk secret key into Vercel or `.env.local`.

### 3. Connect Clerk to Supabase and apply Kaizen’s database

In Clerk, activate the **Supabase integration** and copy the Clerk domain it provides. In **Supabase → Authentication → Third-Party Auth**, add **Clerk** and paste that domain. This lets Supabase accept Clerk session tokens for row-level security, Storage, sync, and Functions.

#### Apply the backend in the Supabase dashboard — recommended

You do not need the Supabase CLI, Docker, or a personal access token to launch the managed version.

1. Open **Supabase → SQL Editor → New query**.
2. Open [`202609040001_product_foundation.sql`](../supabase/migrations/202609040001_product_foundation.sql) in GitHub, copy its contents into the query editor, and select **Run**. Wait for the success message.
3. Create another query. Copy and run [`202609060002_clerk_auth.sql`](../supabase/migrations/202609060002_clerk_auth.sql). This converts the initial tables and policies to Clerk ownership.
4. Run [`202609060003_restrict_anonymous_rpc.sql`](../supabase/migrations/202609060003_restrict_anonymous_rpc.sql) to remove direct anonymous sync-function grants.
5. Open **Supabase → Edge Functions → Deploy a new function → Via Editor**. Name it `delete-account`, add both [`index.ts`](../supabase/functions/delete-account/index.ts) and [`storage.ts`](../supabase/functions/delete-account/storage.ts), and deploy it. Disable the legacy Supabase JWT verification setting for this function; the handler verifies the Clerk token itself.
6. Open **Supabase → Settings → Edge Functions → Secrets**. Add `CLERK_SECRET_KEY` using the secret key from your Clerk production instance. Do not add this value to Vercel, a `VITE_` environment variable, or a Git repository.

The three SQL files create the tables, Clerk-compatible row-level security policies, sync functions, private import bucket, and indexes. The Edge Function removes a person’s Clerk account and private import artifacts when they choose account deletion in Settings.

#### Optional: use the CLI later

The CLI is useful for repeat deployments, but it is not required for your first launch. If you choose to use it later, Kaizen includes it as a project dependency:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase db push
pnpm exec supabase secrets set CLERK_SECRET_KEY=YOUR_CLERK_SECRET_KEY
pnpm exec supabase functions deploy delete-account --no-verify-jwt
```

### 4. Deploy the web app to Vercel

In [Vercel](https://vercel.com/new), choose **Add New → Project**, import the GitHub repository from step 1, and create the project. Vercel detects Vite automatically. Use:

```text
Install command: pnpm install
Build command:   pnpm build
Output directory: dist
```

Add these environment variables in **Vercel → Project → Settings → Environment Variables**:

```dotenv
VITE_KAIZEN_MODE=cloud
VITE_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_PUBLISHABLE_KEY
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_APP_URL=https://YOUR_KAIZEN_DOMAIN
```

Deploy. Vercel gives the app a URL such as `https://kaizen.vercel.app`. If you add a custom domain later, update `VITE_APP_URL` to that domain and redeploy.

### 5. Connect Clerk to the deployed app

First, open **Vercel → Project → Settings → Domains** and copy the domain marked as the production or primary domain. Call it `PRODUCTION_URL`. It must look like `https://kaizen.example.com` or `https://project-kaizen.vercel.app`; do not use a one-off deployment URL containing a commit or random deployment ID.

Set `VITE_APP_URL` in Vercel to that exact `PRODUCTION_URL`, then redeploy once. Next, in **Clerk → Configure → Paths and URLs**, add these exact values:

- **Allowed origins:** `PRODUCTION_URL` and `http://localhost:5180`
- **Allowed redirect URLs:** `PRODUCTION_URL` and `http://localhost:5180`
- **Sign-in fallback redirect:** `/`
- **Sign-up fallback redirect:** `/`

Kaizen uses Clerk's modal sign-in and sign-up controls, so leave **Sign-in URL** and **Sign-up URL** empty. Those fields are only for apps that build dedicated `/sign-in` and `/sign-up` pages. The allowed origins let Clerk run in Kaizen; the allowed redirect URLs let Clerk return people to the production app or local development server after an authentication flow. Open the deployed URL and sign in. A new account starts with its own empty workspace; existing cloud records download automatically. To move older device data, export it from the old app first and restore the verified backup through **Settings → Import** while signed into its owner’s account.

### 6. Develop locally against the managed cloud

Create `.env.local` with the same cloud variables, except point `VITE_APP_URL` to `http://localhost:5180`, then run:

```bash
pnpm dev
```

Your local browser now talks to the managed Supabase project. Docker is still unnecessary.

### Managed-cloud checklist

- [ ] Kaizen is pushed to GitHub and Vercel is connected to its `main` branch
- [ ] Clerk's Supabase integration is active and its domain is added in Supabase
- [ ] Clerk allowed origins and redirect URLs are correct
- [ ] Your chosen Clerk sign-in providers are enabled
- [ ] Vercel has only `VITE_` public values, never a service-role or Clerk secret key
- [ ] The production URL is tested before sharing it
- [ ] Database backups and alerting are enabled in Supabase

## Self-hosted, device-only

This is Kaizen’s quietest setup. It has no sign-in, no external database, and no cloud sync. Every person’s data remains in their own browser’s IndexedDB database.

![Self-hosted Kaizen paths](assets/setup-self-hosted.svg)

### Run it without a container

You only need Node 24 and pnpm:

```bash
pnpm install
pnpm dev
```

Kaizen starts at `http://localhost:5180` in device mode by default. This is ideal for development or for a trusted private network where you already have a preferred static-hosting setup.

### Run the portable container

If you prefer a small production container, use the included web-only compose file:

```bash
docker compose up --build
```

Open `http://localhost:5180`. This container serves Kaizen; it does **not** create a Supabase server. The app remains device-only unless you provide cloud environment variables at build time.

Back up through **Settings → Export**. A device-only install cannot recover data after browser storage is erased unless that export exists.

## Full self-hosted cloud

Choose this only if you are comfortable operating services. In addition to the web app, you are responsible for Postgres, Auth, Storage, email delivery, secrets, upgrades, monitoring, and backups.

1. Follow the official [Supabase self-hosting with Docker guide](https://supabase.com/docs/guides/self-hosting/docker) to run its service stack on your infrastructure.
2. Set the production Auth Site URL and redirect URLs to your Kaizen domain.
3. Apply this repository’s committed migration directly to the self-hosted Postgres database:

   ```bash
  pnpm exec supabase db push --db-url "postgresql://postgres:YOUR_DB_PASSWORD@db.example.com:5432/postgres"
   ```

4. Build the Kaizen container with cloud values for your self-hosted Supabase URL and publishable key:

   ```bash
   docker build \
     --build-arg VITE_KAIZEN_MODE=cloud \
     --build-arg VITE_SUPABASE_URL=https://supabase.example.com \
     --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY \
     -t kaizen .
   ```

5. Deploy [`supabase/functions/delete-account`](../supabase/functions/delete-account) with the Edge Functions procedure for the Supabase Docker release you chose. Its service-role key belongs only in the self-hosted Supabase environment, never in a `VITE_` variable.

6. Put Kaizen behind HTTPS, set up database and object-storage backups, and test restoring them before inviting anyone.

The reference application container is in [Dockerfile](../Dockerfile), the device-only compose setup is [compose.yaml](../compose.yaml), and the complete operating checklist is in [operations.md](operations.md).

## Common questions

### Do I need Docker for cloud hosting?

No. With managed Supabase and Vercel, Docker is optional and unnecessary. Your browser talks to Supabase; Vercel hosts the compiled web files.

### Can I begin private and add cloud later?

Yes. Start in device mode, export backups whenever you like, then configure cloud mode and use the explicit migration control in Settings. Existing records are never uploaded in the background.

### Which key goes in `VITE_SUPABASE_PUBLISHABLE_KEY`?

Use the Supabase project’s publishable/anon key. Do not use `SUPABASE_SERVICE_ROLE_KEY`; that key only belongs in server-side Edge Function secrets.

### What if I only want the app on my own laptop?

Run `pnpm dev` for development or `docker compose up --build` for a small local server. Both use device mode by default.
