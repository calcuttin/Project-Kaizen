# First actions, mobile navigation, and backup reminders

Review follow-up: REV-2026-09-08-APP / issues #9, #10, #11. AI-assisted implementation and automated verification on 2026-10-22. No independent human usability study is claimed.

## Changes

- Empty Library starts with a book/import, explains optional shelves, and defers controls until books exist. A new workspace has no agreed reading target until the user saves one. Existing saved targets remain intact.
- Empty Studio offers channel creation with a manual-planning explanation. Idea capture and new pieces become available after a channel exists.
- Feed places content before a collapsed activity summary. Add source is the primary empty action. Mobile navigation has Today, Tasks, Library, and More; More retains every area and Settings.
- A nonmodal device-only reminder offers a backup download for populated workspaces with no backup or a backup at least seven days old. Dismissal lasts seven days; a new export resets the timestamp. Copy explains external storage and that sync is not a backup. Workspace reset has a separate card and retains confirmation.

## Verification

- 59 unit tests passed, including reminder threshold and dismissal boundaries; production/type checking build passed.
- Existing 20 device browser regressions passed. Three new tests cover fresh/populated Library and Studio at 390px/1280px, explicit goals, persistence, reminder dismissal, backup download, Feed ordering/reflow at 390px/768px, and mobile navigation access.
- No physical-device or full screen-reader audit is claimed. The existing large initial bundle warning is tracked separately in #12.
