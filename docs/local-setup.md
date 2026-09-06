# Run Kaizen locally

[← Choose a setup](setup-guide.md) · [Using Kaizen](user-guide.md)

**Result:** Kaizen opens at `http://localhost:5180`, needs no account, and saves your workspace in your browser.

## 1. Install the tools

Install **Node.js 24** from [nodejs.org](https://nodejs.org/en/download) and **Git** from [git-scm.com](https://git-scm.com/downloads). The Node.js installer includes npm.

Open **Terminal** on macOS/Linux or **PowerShell** on Windows. Run each command on its own line:

```bash
node --version
git --version
npm install --global pnpm@11.19.0
pnpm --version
```

You should see Node `v24.x` and pnpm `11.19.0`. If you just installed a tool and it is not found, close and reopen your terminal.

## 2. Download Kaizen

```bash
git clone https://github.com/calcuttin/Project-Kaizen.git
cd Project-Kaizen
```

Already downloaded the project? Open a terminal in the folder containing `package.json` and skip cloning. Do not run these commands from `apps/web`.

## 3. Install and start

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Wait for the terminal to show `http://localhost:5180`, then open that address in your browser. Keep the terminal running.

A fresh download uses device mode automatically. **No `.env.local` file is needed.** If you are reusing a cloud-configured checkout, set `VITE_KAIZEN_MODE=device` in its `.env.local` and restart the server.

## 4. Check that it saves

1. Open **Settings → Account & sync**. The mode should say **Device only**.
2. Add a task or a book.
3. Refresh the page. Your record should still be there.
4. Choose **Settings → Data → Export** and keep the downloaded JSON backup somewhere private.

**You're done when:** the app opens without sign-in and your record survives a refresh.

## Stop and reopen

Press **Ctrl+C** in the terminal to stop the server. Later, open a terminal in the Kaizen folder and run:

```bash
pnpm dev
```

Use the **same browser profile and the same address**. `localhost`, `127.0.0.1`, a different port, and a different browser each have separate storage. Your data lives in the browser, not the downloaded project folder.

Private/incognito windows may discard their data when closed. For everyday use, use a normal browser window and export regularly.

## Optional: use Docker instead

If you already have [Docker Desktop](https://docs.docker.com/desktop/) or Docker Engine with Compose installed and running, you can skip the Node.js and pnpm steps. From the downloaded project folder:

```bash
docker compose up --build -d
```

Open **http://localhost:5180**. To stop the container:

```bash
docker compose down
```

This serves the device-only web app. It does not create accounts, run Supabase, or store your workspace in a Docker volume. Browser backups still matter. Do not run the Docker and `pnpm dev` versions at the same time; they use the same port.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| `node`, `git`, or `pnpm` is not found | Finish step 1, then open a new terminal. |
| PowerShell says `npm.ps1` or `pnpm.ps1` cannot run | Use `npm.cmd` and `pnpm.cmd` in the commands above. You do not need to change your execution policy. |
| `Repository not found` when cloning | Check the URL and your GitHub sign-in. If the repository is private, its owner must grant you access. |
| No `package.json` found | Run the command from the project root, not its parent folder or `apps/web`. |
| Port 5180 is already in use | Stop the other Kaizen terminal/container, then retry. Keep a consistent port so your saved workspace stays at the same address. |
| The app asks you to sign in | Check `.env.local` for `VITE_KAIZEN_MODE=cloud`. Set it to `device` and restart. |
| Your workspace appears empty | Check the browser profile, address, and port before importing a backup. See [data recovery](user-guide.md#my-workspace-looks-empty). |

## Next steps

[Start using Kaizen](user-guide.md) · [Add cloud sync](cloud-setup.md) · [Update your installation](operations.md#update-an-existing-installation)
