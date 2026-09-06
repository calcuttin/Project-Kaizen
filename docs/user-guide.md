# Using Kaizen

[← README](../README.md) · [Need to install it first?](setup-guide.md)

You can also open these guides from **Settings → Help & guides**, or **Help & guides** on the sign-in screen. They are included with the app and do not require a GitHub account. Keep an internet connection when reading guides on a hosted site.

## Open your workspace

**Using cloud:** open the [official Project Kaizen website](https://project-kaizen-gamma.vercel.app/) or the address of your self-hosted cloud instance. Each site has separate accounts and data. Choose **Create your account** the first time, or **Sign in** if you already have one. Use the same site and account on your other devices. You do not need accounts with the site's hosting providers.

**Using a local installation:** start your local server and open `http://localhost:5180`. Device mode has no sign-in.

New workspaces start empty. Returning users open their saved records automatically. If you want examples, use **Settings → Data → Load samples**, ideally in a fresh workspace before adding your own data. Samples change the current workspace and sync if it is a cloud account.

## Start your day

**Today** puts your tasks first. Type into **What needs doing?** and choose **Add task** (or press Enter). New tasks are due today by default; **All tasks** opens the full list and task editor.

**Your daily focus** is an optional reminder to yourself, separate from a task. It saves as you type. In **A moment for you**, choose a labeled mood and use **Add win** to record something that went well. An optional evening reflection appears later in the day. The check-in count tracks your focus, mood, win, and evening reflection; it is not a task-completion score.

Use **Open library**, **Track habits**, or a section's setup link to continue. **Getting started** opens this guide. You can leave any check-in blank and go straight to your work.

Choose **Customize Today** to hide sections or reorder the sections below your tasks and daily focus. **Reset layout** restores the default arrangement. This preference is saved for this account in this browser.

New workspaces show **Make this space yours**, a checklist for a task, a habit, a book/import, and a backup. You can dismiss it at any time and reopen it with **Settings → Getting started → Show checklist on Today**.

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

## Find and edit books

Search the Library by title, author, or ISBN. Search, reading status, and shelf filters work together; **Clear filters** returns to your full collection. Switch between **Shelves** and **Grid** at any time.

Open a book to edit its details. Changes save automatically; **Close** finishes editing. Task details work the same way. **Delete book** and **Delete task** offer **Undo** for 10 seconds. Undo restores the deleted item and, for a book, its reading sessions and annotations. Habit, goal, Studio, and Feed deletions also offer Undo. Removing a whole channel or source still asks for confirmation because it includes related records. Undo does not revert unrelated edits. In cloud mode, a conflicting edit from another device may still need review.

Online covers start off for privacy. Enable them from the Library notice or **Settings → Privacy**. If a cover fails to load, use **Retry covers**, then scroll to the missing books. This retries visible artwork and searches; Open Library may not have every edition. You can always enter a book manually.

## Import books or Kindle notes

Use **Library → Import** for a book CSV or Kindle `My Clippings.txt` file. Review the preview and duplicate matches before confirming. Kindle imports can optionally create books that do not already exist in your library.

Source files are parsed in your browser. In cloud mode, the resulting records sync to your account. Recent imports appear under **Settings → Import history**; the Library import flow also supports undoing records created by the most recent import.

A **Kaizen JSON backup** is different: restore it through **Settings → Data → Import**, not Library → Import.

## Back up and restore

To back up, choose **Settings → Data → Export**. Keep the downloaded `kaizen-backup-YYYY-MM-DD.json` somewhere private. Kaizen does not automatically download backups for you.

To restore:

1. Open the workspace you intend to restore into. In cloud mode, check **Settings → Account & saving → Signed in as**.
2. Export that workspace first if it already contains anything you want to keep.
3. Choose **Settings → Data → Import** and select your Kaizen JSON backup.
4. Review the collection counts in **Review backup restore**. Choose **Cancel** to leave your data alone, or **Restore backup** to apply the file. Invalid files are rejected before any records change (50 MB maximum).
5. Wait for **Backup restored**, which confirms the browser write finished, then review your restored records. In cloud mode, wait for **Saved**; use **Save now** if needed.

**Restore is not a duplicate-aware merge.** It can replace collections in the destination workspace. In cloud mode those replacements, including removed records, can sync to your other devices. Restore into a fresh workspace when possible.

## Move local data to cloud

1. While the local workspace is still available, export it using the steps above.
2. Open your configured cloud site and sign into the account that should own those records.
3. Wait for existing cloud data to load. If the destination contains data, back it up and review the restore behavior above before proceeding.
4. Import the local JSON backup through **Settings → Data → Import**.
5. Choose **Save now**, wait for **Saved**, and verify the records on another device.

The app does not automatically assign an old local workspace to whichever account signs in first. There is no separate “migrate device data” button; use Export and Import.

## Check saving

The website runs in your browser, so an edit still needs to reach your account's cloud storage. Saving happens automatically while the app is open, shortly after you stop editing.

| Status | Meaning / action |
| --- | --- |
| **Saving…** | Changes or a cloud refresh are in progress. |
| **Saved** | The last cloud exchange succeeded, with no pending edits or conflicts. |
| **Saving on this device…** | The browser is still recording a change locally. |
| **Offline · saved on this device** | Cloud saving is paused. Reconnect and keep the app open. |
| **Couldn’t save** | Open **Settings → Account & saving**, check your connection, and use **Save now** or **Retry**. |
| **Changes need review** | Open Settings and review the conflict inbox. |
| **Backup needed** | Browser storage failed. Export immediately before reloading or signing out. |
| **Device only** | This installation stores your workspace in this browser. Export to move it. |

Wait for **Saved** before switching devices or clearing browser data. It confirms saving; it does not mean a separate backup has been made.

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
- In cloud mode, check the signed-in email, then select **Save now** and read any error.
- If the site owner recently changed the backend or Clerk instance, ask them which one holds your records.

If your original workspace is still accessible, export it first. Restore a verified backup only into the intended account. If browser storage was erased in device mode and no backup exists, there is no cloud copy to recover.

## Get help without sharing your records

**Settings → Help & guides → Download support report** creates a small JSON file with the app mode, timestamps, connection status, and pending/conflict counts. It excludes your records, account identifiers, tokens, and raw error messages. Review the file before sharing it; the app does not send it automatically.

If the app cannot render, the recovery screen offers a recovery copy and the same limited support report. A recovery copy contains your actual records and should be kept private.

To practice recovery, use a separate browser profile and a local device-mode installation. Import a backup there, check tasks, books, notes, and reading progress, and export again. Keep the original backup until you have verified the restored copy. Do not use your everyday cloud workspace for an experiment.
