# Set up your own Kaizen cloud

This guide creates a **self-hosted cloud instance** with your own provider accounts and data. To use the official Project Kaizen website instead, open [the official website](https://project-kaizen-gamma.vercel.app/). Project Kaizen is a placeholder name, pending differentiation or renaming.

[← Choose a setup](setup-guide.md) · [Use the official website instead](user-guide.md)

**Result:** a website where each person signs in to their own workspace and can use it across devices.

This guide uses **GitHub → Vercel** for the website, **Clerk** for sign-in, and **Supabase** for data. The main path uses their dashboards; no Docker or local command-line tools are required.

## Before you begin

Create accounts with [GitHub](https://github.com/), [Clerk](https://dashboard.clerk.com/), [Supabase](https://supabase.com/dashboard), and [Vercel](https://vercel.com/). Review each provider's current plan limits and backup options when creating your projects.

Choose your starting point:

- **Trying Kaizen or evaluating cloud sync:** start with a Clerk **development** instance. You can use the stable `vercel.app` address supplied by Vercel.
- **Launching a production service:** use a Clerk **production** instance and a domain you own. Complete Clerk's domain/DNS and provider setup before inviting users. See [production setup](#before-a-production-launch).

Use the same Clerk instance throughout this guide. Its publishable key, secret key, and Supabase integration domain must belong together.

## 1. Make your own GitHub copy

Open [Project-Kaizen on GitHub](https://github.com/calcuttin/Project-Kaizen) and choose **Fork** to create a copy in your account. If the source is private, you need access and permission to fork it.

Use this copy for your Vercel project. You will not need to upload files manually for each update.

**Check:** your copy contains `package.json`, `src/`, and `supabase/` on its main branch.

## 2. Create the sign-in and database projects

In Clerk, create an application. Start with an email sign-in method; add other providers when you are ready. Copy its **publishable key** from the API Keys page.

In Supabase, create a **new, empty project** for this Kaizen installation. Save the database password privately. Wait for the project to finish provisioning, then find its **project URL** and **publishable key** in the project's Connect/API settings.

Keep these values handy:

| Value | Where to find it | Where it will go |
| --- | --- | --- |
| Clerk publishable key | Clerk → API Keys | Vercel: `VITE_CLERK_PUBLISHABLE_KEY` |
| Supabase project URL | Supabase → Connect or Project Settings → Data API | Vercel: `VITE_SUPABASE_URL` |
| Supabase publishable key | Supabase → Project Settings → API Keys | Vercel: `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Clerk secret key | Clerk → API Keys, same instance | Supabase Edge Function secret: `CLERK_SECRET_KEY` |

The project URL should look like `https://YOUR_PROJECT_REF.supabase.co`, with no `/rest/v1` suffix. Use the Supabase **publishable** key, not a secret or service-role key.

## 3. Let Supabase recognize Clerk accounts

1. In Clerk, open the **Supabase integration** setup and activate it.
2. Copy the Clerk domain shown there.
3. In Supabase, open **Authentication → Sign In / Providers → Third-Party Auth**.
4. Add **Clerk**, paste that domain, and save.

**Check:** the Clerk provider is enabled and shows the domain from the same instance as your keys. Use the current third-party integration, not the older Supabase JWT-template approach. [Official integration instructions](https://clerk.com/docs/guides/development/integrations/databases/supabase).

Kaizen already contains the application code for this integration. You do not need to copy the example app or create the example tables from the provider's documentation.

## 4. Create Kaizen's database

A migration is a SQL file that sets up or updates the database. For a fresh project, run these files **once, in the order shown**:

| Order | Open this file | What it sets up |
| --- | --- | --- |
| 1 | [202609040001_product_foundation.sql](../supabase/migrations/202609040001_product_foundation.sql) | Tables, sync functions, indexes, and private storage |
| 2 | [202609060002_clerk_auth.sql](../supabase/migrations/202609060002_clerk_auth.sql) | Account ownership using Clerk user IDs |
| 3 | [202609060003_restrict_anonymous_rpc.sql](../supabase/migrations/202609060003_restrict_anonymous_rpc.sql) | Restricts sync functions to authenticated accounts |

For each file:

1. Open it on GitHub and choose **Raw** so you can copy the complete SQL file.
2. In Supabase, open **SQL Editor → New query**.
3. Paste the SQL and choose **Run**.
4. Wait for success before moving to the next file. A successful setup query may return no rows.

Stop if a query reports an error. Do not skip a file, remove its security statements, or run these initial migrations over a database with unrelated tables. Do not run `supabase/seed.sql` or test SQL as part of setup.

**Check:** Table Editor shows Kaizen tables such as `books`, `tasks`, and `profiles`; the Storage page shows the private `import-artifacts` bucket.

These steps use the SQL Editor, which does not record Supabase CLI migration history. Keep track of the files you applied. If you later adopt `supabase db push`, reconcile that history first; do not simply rerun all migrations. See [operations](operations.md#database-migrations).

## 5. Enable account deletion

Kaizen's **Delete account** button needs a small server function. Deploy the supplied implementation:

1. In Supabase, open **Edge Functions** and create a function **Via Editor** named exactly `delete-account`.
2. Replace its starter `index.ts` with [Kaizen's index.ts](../supabase/functions/delete-account/index.ts).
3. Add a second file named `storage.ts`, using [Kaizen's storage.ts](../supabase/functions/delete-account/storage.ts), beside `index.ts`.
4. Deploy the function.
5. In its settings, turn off **Verify JWT with legacy secret** (sometimes shown as **Enforce JWT verification**). This is specific to `delete-account`: its code verifies the Clerk session token itself.
6. In **Edge Functions → Secrets**, add `CLERK_SECRET_KEY` from the same Clerk instance used in step 3.

Supabase supplies the hosted function's Supabase URL and service-role key automatically. You do not need to copy those into the frontend. [Supabase's dashboard function guide](https://supabase.com/docs/guides/functions/quickstart-dashboard).

**Check:** the function is active, both source files are present, and `CLERK_SECRET_KEY` is listed in function secrets. If your editor does not support adding the second file, use the [CLI alternative](#optional-deploy-the-function-with-the-cli).

## 6. Deploy the website

In [Vercel → New Project](https://vercel.com/new), import **your GitHub copy**. If it is missing, use the GitHub permissions/configuration link and allow Vercel access to that repository.

Use these project settings:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Root directory | Repository root; leave blank/default, **not** `apps/web` |
| Node.js version | 24.x |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |
| Output directory | `dist` |

Add these environment variables for the **Production** environment before deploying. Replace the example values with yours; do not paste placeholder text unchanged.

```dotenv
VITE_KAIZEN_MODE=cloud
VITE_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_PUBLISHABLE_KEY
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
VITE_ENABLE_BUNDLED_IMPORTS=false
```

All `VITE_` values are included in the public website build. Never put `CLERK_SECRET_KEY`, a Supabase secret/service-role key, or the database password into them. These secrets are not needed in this Vercel frontend project.

Choose **Deploy**. Wait for Vercel to show **Ready**. Its framework detection supplies the normal Vite build behavior; see [Vercel build settings](https://vercel.com/docs/builds).

## 7. Set the permanent address

1. Open **Vercel → Project → Settings → Domains**.
2. Copy the stable project domain, such as `https://your-kaizen.vercel.app`, or your configured custom domain. Avoid one-off deployment addresses with random identifiers.
3. Add `VITE_APP_URL` in Vercel with that complete address, including `https://`.
4. Redeploy the latest commit so the build uses the new value.

`VITE_APP_URL` controls Kaizen's return address when signing out. Before you set it, the app uses the address where it is currently open. Environment changes affect new builds, so a redeploy is required. [Vercel environment variables](https://vercel.com/docs/environment-variables).

Kaizen uses **modal** sign-in and sign-up. You do not need to create `/sign-in` or `/sign-up` pages. If you have customized Clerk's application paths or restricted allowed origins/return URLs, make them consistent with your stable app address and return users to `/`. Use `http://localhost:5180` only for your development setup.

**Check:** sign-out returns to your stable Kaizen address, and the sign-in button opens a working Clerk form.

## 8. Test your cloud workspace

1. Open the stable address and create an account.
2. Open **Settings → Account & saving**. It should show **Cloud sync** and your email address.
3. Add a test task. Choose **Save now** and wait for **Saved**.
4. Sign into the same site and account on another browser/device. The task should appear.
5. Use a separate test account. It should start with its own empty workspace and should not see the first account's task.
6. Export a backup from your main account. If you test **Delete account**, use only a disposable test account.

**You're done when:** a saved record appears on both devices for its owner, another account has a separate workspace, and there is no sync error in Settings.

Bookmark the stable address. To bring existing local records over, follow [Move local data to cloud](user-guide.md#move-local-data-to-cloud).

## Before a production launch

Clerk development mode is useful for evaluation; it is not a production authentication deployment. For production, use a domain you own, complete Clerk's DNS/certificate setup, and configure your own credentials for any social providers you enable. Follow [Clerk's production checklist](https://clerk.com/docs/guides/development/deployment/production).

Treat a change from Clerk development to production as an account migration. User IDs may change. Back up first and plan how existing records will belong to the correct production users; replacing a publishable key alone does not migrate their workspaces.

Use separate Clerk/Supabase resources for development or preview deployments. Do not copy production credentials into every preview by default. Confirm backup coverage and restore procedures before relying on the service. See the [operations guide](operations.md).

## Optional: run the frontend locally with cloud sync

Complete the backend steps above first. Follow [local setup](local-setup.md) to download the code and install dependencies, then create `.env.local` **beside `package.json`** with:

```dotenv
VITE_KAIZEN_MODE=cloud
VITE_CLERK_PUBLISHABLE_KEY=YOUR_DEVELOPMENT_CLERK_PUBLISHABLE_KEY
VITE_SUPABASE_URL=https://YOUR_DEVELOPMENT_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_DEVELOPMENT_SUPABASE_PUBLISHABLE_KEY
VITE_APP_URL=http://localhost:5180
VITE_ENABLE_BUNDLED_IMPORTS=false
```

Run `pnpm dev`, or stop and restart it after editing the file. The local frontend uses the managed backend; no local Supabase server or Docker is needed. This performs real writes in whichever project you configure, so use development resources for experiments.

## Optional: deploy the function with the CLI

From the installed project folder, run:

```bash
pnpm exec supabase login
pnpm exec supabase functions deploy delete-account --project-ref YOUR_PROJECT_REF --use-api
```

`YOUR_PROJECT_REF` is the identifier in your Supabase project URL. The repository's `supabase/config.toml` sets `verify_jwt=false` for this function. `--use-api` bundles both files without Docker. Add `CLERK_SECRET_KEY` through the dashboard as in step 5; avoid putting secrets directly into terminal commands.

This alternative deploys only the function. You still need steps 3–4 for authentication trust and the database.

## Troubleshooting

| Symptom | Check first |
| --- | --- |
| Vercel cannot find the repository | Grant its GitHub app access to your exact repository, then retry the import. Renaming/replacing a repository can require reconnecting it. |
| The website has no sign-in | Set `VITE_KAIZEN_MODE=cloud` for the deployment's environment and redeploy. |
| “Cloud mode needs configuration” | Check all three public keys/URL variables from step 6; remove placeholder text and redeploy. |
| Sign-in works but sync fails | Confirm step 3's Clerk domain matches the key's instance, all three migrations succeeded, and the Supabase project is running. Read the error under **Account & sync**. |
| Redirects to the wrong address | Correct `VITE_APP_URL`, redeploy, and check any custom Clerk redirect settings. Use your stable URL. |
| A returning account is empty | Confirm the site address, email, Clerk instance, and Supabase project before restoring anything. See [workspace recovery](user-guide.md#my-workspace-looks-empty). |
| Delete account fails | Confirm the function's exact name, both files, its legacy JWT setting, and its Clerk secret. Inspect function logs without exposing credentials. |
| SQL reports that a table or policy already exists | Confirm which files already ran. Do not delete tables or rerun the foundation to recover; see [database migrations](operations.md#database-migrations). |
