# Using Kaizen

[← README](../README.md) · [Need to install it first?](setup-guide.md)

You can also open these guides from **Settings → Help & guides**, or **Help & guides** on the sign-in screen. They are included with the app and do not require a GitHub account. Keep an internet connection when reading guides on a hosted site.

## Open your workspace

**Using a cloud site:** open the address provided by its owner. Choose **Create your account** the first time, or **Sign in** if you already have one. Use the same site and account on your other devices. You do not need accounts with the site's hosting providers.

**Using a local installation:** start your local server and open `http://localhost:5180`. Device mode has no sign-in.

New workspaces start empty. Returning users open their saved records automatically. If you want examples, use **Settings → Data → Load samples**, ideally in a fresh workspace before adding your own data. Samples change the current workspace and sync if it is a cloud account.

## Find your way around

| Area | Use it for |
| --- | --- |
| Today | Your daily focus and a view across your life areas |
| Tasks | Tasks, projects, priorities, and next actions |
| Studio | Planning content and tracking publishing work |
| Health | Habits, progress, and goals |
| Library | Books, shelves, reading progress, and imports |
| Feed | Articles, podcasts, and other things to read or listen to |
| Settings | Account, sync, backups, appearance, and privacy |

## Import books or Kindle notes

Use **Library → Import** for a book CSV or Kindle `My Clippings.txt` file. Review the preview and duplicate matches before confirming. Kindle imports can optionally create books that do not already exist in your library.

Source files are parsed in your browser. In cloud mode, the resulting records sync to your account. Recent imports appear under **Settings → Import history**; the Library import flow also supports undoing records created by the most recent import.

A **Kaizen JSON backup** is different: restore it through **Settings → Data → Import**, not Library → Import.

## Back up and restore

To back up, choose **Settings → Data → Export**. Keep the downloaded `kaizen-backup-YYYY-MM-DD.json` somewhere private. Kaizen does not automatically download backups for you.

To restore:

1. Open the workspace you intend to restore into. In cloud mode, check **Settings → Account & sync → Signed in as**.
2. Export that workspace first if it already contains anything you want to keep.
3. Choose **Settings → Data → Import** and select your Kaizen JSON backup.
4. Review your records. In cloud mode, choose **Sync now** and wait for **Synced**.

**Restore is not a duplicate-aware merge.** It can replace collections in the destination workspace. In cloud mode those replacements, including removed records, can sync to your other devices. Restore into a fresh workspace when possible.

## Move local data to cloud

1. While the local workspace is still available, export it using the steps above.
2. Open your configured cloud site and sign into the account that should own those records.
3. Wait for existing cloud data to load. If the destination contains data, back it up and review the restore behavior above before proceeding.
4. Import the local JSON backup through **Settings → Data → Import**.
5. Choose **Sync now**, wait for **Synced**, and verify the records on another device.

The app does not automatically assign an old local workspace to whichever account signs in first. There is no separate “migrate device data” button; use Export and Import.

## Check sync

In cloud mode, edits queue locally and sync while the app is open. Open **Settings → Account & sync** to see errors or select **Sync now**. Wait for **Synced** before switching devices or clearing browser data.

If an item changed on two devices, the **Conflict inbox** lets you choose **Use cloud version** or **Keep this device**. This chooses a complete version of the item.

Offline use depends on the cached app and an available sign-in state; you may need a connection to sign in or reopen the workspace. A local cache is not a substitute for a backup.

## Reset or delete?

| Action | What it does |
| --- | --- |
| **Sign out** | Ends the current cloud sign-in. It does not delete cloud records. |
| **Reset** in device mode | Erases this local workspace. Recovery requires an exported backup. |
| **Reset** in cloud mode | Erases this account's local cache and pending changes. Existing cloud records download again. |
| **Delete account** in cloud mode | Permanently removes this account and its data from the connected cloud system. Export first if you want to keep a copy. |

Use **Export**, not Reset, when your goal is to move data.

## Privacy choices

Online covers are off by default. **Settings → Privacy → Enable online covers** allows title/author/ISBN lookups with Open Library and remote image loading. Manual ISBN lookup also contacts Open Library when you request it.

Each cloud account has its own workspace, but local browser caches and JSON exports are not encrypted by Kaizen. On shared computers, use separate browser profiles. Cloud records are protected by account permissions, not end-to-end encryption against the service operator.

## My workspace looks empty

Before loading samples, importing, or resetting anything:

- Check the address. A local server, a stable cloud URL, and an old deployment URL are different places.
- Check the browser profile. Device-only records do not automatically appear in another browser.
- In cloud mode, check the signed-in email, then select **Sync now** and read any error.
- If the site owner recently changed the backend or Clerk instance, ask them which one holds your records.

If your original workspace is still accessible, export it first. Restore a verified backup only into the intended account. If browser storage was erased in device mode and no backup exists, there is no cloud copy to recover.
