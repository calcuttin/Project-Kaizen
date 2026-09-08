# Project Kaizen 改善

One place for your tasks, habits, health, reading, and publishing plans. Kaizen is built around small, steady improvements.

**Project Kaizen is a placeholder name.** Other companies and projects use similar names in other fields. We will differentiate the branding or choose a new name before a broader launch; this project is not affiliated with those businesses.

**Run it on your computer with no account, or use cloud mode to sign in and sync across devices.**

## Start here

| What would you like to do? | Your next step |
| --- | --- |
| Use the official Project Kaizen website | [Open the official website](https://project-kaizen-gamma.vercel.app/) · [User guide](docs/user-guide.md) — nothing to install |
| Run Kaizen on your own computer | [Local setup](docs/local-setup.md) — no cloud accounts or Docker required |
| Run a self-hosted cloud instance | [Cloud setup](docs/cloud-setup.md) — Clerk + Supabase + Vercel |
| Understand the choices first | [Setup guide](docs/setup-guide.md) |

The official website is currently an evaluation deployment using development authentication. Production domain and authentication setup are deferred. A self-hosted cloud instance has its own accounts and data; signing into a different site does not transfer your workspace.

## Run locally

Install [Node.js 24](https://nodejs.org/en/download) and [Git](https://git-scm.com/downloads), then open Terminal or PowerShell:

```bash
npm install --global pnpm@11.19.0
git clone https://github.com/calcuttin/Project-Kaizen.git
cd Project-Kaizen
pnpm install --frozen-lockfile
pnpm dev
```

Open **[http://localhost:5180](http://localhost:5180)**. Keep the terminal open while you use Kaizen; press **Ctrl+C** to stop it.

A fresh clone starts in **Device only** mode. You do not need an `.env` file, API keys, or a database. To open it again, run `pnpm dev` from the same folder and use the same browser and address.

**Your data is saved in that browser.** Download a backup with **Settings → Data → Export** before clearing browser storage or moving to another computer. See [local setup](docs/local-setup.md) for Windows help, Docker, and troubleshooting.

## Local or cloud?

| | Device only | Cloud sync |
| --- | --- | --- |
| Sign-in | None | A Clerk account on that Kaizen site |
| Where records are stored | This browser | Your account's browser cache and Supabase database |
| Another device | Export and import a backup | Sign in to the same site and account |
| What you need to run it | Node.js + pnpm, or optional Docker | Clerk, Supabase, and a web host |
| Backups | Export from Settings | Export from Settings; site operator also manages server backups |

Hosting the device-only app on a website does **not** enable sync. Cloud mode requires the backend setup in the [cloud guide](docs/cloud-setup.md).

## Your first few minutes

1. Add a task, habit, or book in the relevant area.
2. If you want examples, choose **Settings → Data → Load samples**. This adds sample records to your current workspace.
3. Bring in books with **Library → Import**: book CSV files and Kindle `My Clippings.txt` are supported.
4. Save a full workspace backup with **Settings → Data → Export**.

Returning users open their saved workspace automatically. There is no need to choose sample data or “start empty” on each visit.

[Using Kaizen](docs/user-guide.md) explains backups, moving local data to cloud, sync, and the difference between **Reset** and **Delete account**.

## Privacy at a glance

Cloud accounts have separate browser workspaces and database ownership rules. Raw CSV and Kindle import files are parsed in the browser; the imported records sync in cloud mode. Online book covers are optional and off by default.

Browser storage and exported backups are not encrypted by Kaizen. Use separate browser profiles on shared computers. Cloud data is protected by account permissions but is readable by authorized service operators.

## AI-assisted development in the open

We publish application reviews, evidence, and proposed fixes so contributors can inspect how Kaizen evolves. Each review records the AI and human contributions, what was verified, and what remains uncertain. Findings become GitHub issues, and fixes link back through pull requests and validation results.

- [Public roadmap](https://github.com/calcuttin/Project-Kaizen/blob/main/ROADMAP.md): priorities and tracked fixes.
- [Searchable review archive](https://github.com/calcuttin/Project-Kaizen/tree/main/docs/reviews): dated reports, screenshots with synthetic data, and a reusable review template.
- [Open roadmap issues](https://github.com/calcuttin/Project-Kaizen/issues?q=is%3Aissue%20is%3Aopen%20label%3Aroadmap): follow progress or contribute a fix.

## For developers and site operators

- [Development guide](docs/development.md): tests, project layout, and database development.
- [Operations guide](docs/operations.md): updates, server backups, and production readiness.
- [Security review](docs/security/review-2026-09-06.md): changes and verification from the account-isolation rollout.

## License

Kaizen is licensed under **AGPL-3.0-or-later**. See [LICENSE](LICENSE) for the terms and [TRADEMARKS.md](TRADEMARKS.md) for product-name and branding guidance.
