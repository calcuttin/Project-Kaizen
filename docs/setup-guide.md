# Set up Kaizen

[← README](../README.md)

Choose the result you want below. You only need to follow one setup path.

## 1. I want to use the official Project Kaizen website

Open the [official Project Kaizen website](https://project-kaizen-gamma.vercel.app/), create an account or sign in, and start using your workspace. You do **not** need GitHub, Node.js, Clerk, Supabase, or Vercel accounts. This is currently an evaluation deployment using development authentication.

Project Kaizen is a placeholder name. Similar names are used by other companies and projects; our branding will need differentiation or a new name before a broader launch.

**Continue:** [Using Kaizen](user-guide.md)

## 2. I want Kaizen on my own computer

Run the app locally with Node.js and pnpm. This is the simplest setup: no sign-in, no server database, and no cloud credentials. Your records stay in your browser.

The guide includes an optional Docker route if you already use containers.

**Continue:** [Local setup](local-setup.md)

## 3. I want a self-hosted cloud instance

Set up these three services once:

| Service | What it does |
| --- | --- |
| Clerk | Handles accounts and sign-in |
| Supabase | Stores each account's records and enforces access rules |
| Vercel | Hosts the website and deploys updates from GitHub |

You can complete the main guide in your browser, without Docker. Start with a Clerk development instance for evaluation. A production Clerk instance requires a domain you own; the guide explains that transition separately.

**Continue:** [Cloud setup](cloud-setup.md)

## Can I change my mind later?

Yes. To move from local to cloud, first export your local workspace, then import that backup while signed into your own cloud account. This is a manual step; Kaizen does not automatically claim old local records for the first person who signs in.

[Move an existing workspace](user-guide.md#move-local-data-to-cloud)

## What about running every server myself?

The included Docker Compose file runs the web app in device mode. It does not install a cloud backend. Operating a complete Supabase stack with Clerk token verification requires additional infrastructure configuration and is not a turnkey setup provided by this repository.

Use the managed-cloud path for the documented sign-in and sync setup. Experienced operators can read the [self-hosting boundaries](operations.md#self-hosting-boundaries) before choosing a different backend deployment.
