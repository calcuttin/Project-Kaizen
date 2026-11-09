# Native iPhone shared-account connection

**Review ID:** REV-2026-11-08-IOS-SYNC
**Date:** November 8, 2026 (America/New_York)
**Base:** `48fcbebb589033c2b6ae28307def6cd6463b4a80`
**Implementation:** `codex/ios-shared-account`
**Tracker:** [#49](https://github.com/calcuttin/Project-Kaizen/issues/49)
**Keywords:** iPhone, SwiftUI, Clerk, Supabase, Bookshelf, shared account, offline outbox, conflict, tombstone, migration, Keychain.

The maintainer requested connecting the native Bookshelf app to the account used by both web apps, and explicitly approved one disposable development identity plus permanent cleanup. Codex implemented, tested and documented the connection. Independent human validation is not claimed.

## Behavior and data boundaries

The native app signs in with ClerkKit/ClerkKitUI 1.7.1 and calls the existing authenticated `pull_changes`/`push_changes` RPCs. Both web apps and the phone share books, shelves, progress, reading sessions, book notes, ratings and annual goals. Web annotations are displayed read-only. No web application code, database migration or hosted authentication setting changed.

Account files use a SHA-256 owner-derived filename and iOS complete file protection. Raw records, cursor, tombstones, queued immutable mutations and conflicts persist atomically together. Session tokens remain in Clerk's Keychain storage, not library files. Token acquisition checks the current owner/session before and after awaiting Clerk; account switches invalidate late responses and disable retained old stores.

Unknown web fields, shelf configuration, prior-year goals and daily targets survive native edits. String web IDs and legacy UUID strings both work. Edits are version-checked; unresolved conflicts require a cloud/phone choice. Repeated requests retain their mutation IDs. HTTP 429 cooldown survives relaunch. Stale editor drafts cannot overwrite a changed book or resurrect a deleted one.

Local prototype books remain separate. Explicit import copies personal books/history once, skips matching title/author pairs, remaps IDs, excludes sample collections and retains the cloud goal and original local file. There is no automatic upload of prototype data.

## Verification

Xcode 27.2, iPhone 17 Pro simulator, iOS 26.5. These native checks ran locally; the existing Linux web/database CI does not compile Swift:

- **20 model tests passed**: existing persistence/progress cases plus raw-field preservation, account separation, retry identity, edits during requests, old acknowledgements, conflicts/remote deletion, late responses, throttling, invalid records, imports, legacy files, goal preservation, deletion cleanup and stale editors.
- **5 UI tests passed again after the final editor/layout changes**: add/search/delete, reading progress across relaunch, tab navigation/journal, largest Dynamic Type reading flow, and shelf/grid/mark-read controls.
- Signed simulator build succeeded. The initial unsigned offline test build could not use Clerk's Keychain; a normal Xcode simulator build fixed this without changing auth configuration. Use normal Run/build for live sign-in, not `CODE_SIGNING_ALLOWED=NO`.
- A native sync banner initially overlapped platform navigation. Moving it into its own layout row preserved both navigation and tab controls; the final signed build was visually checked.

### Live test, synthetic data only

1. Created one disposable test user in the existing development Clerk instance. Native API was already enabled; no provider settings changed. Used Clerk's documented [test email-code mechanism](https://clerk.com/docs/guides/development/testing/test-emails-and-phones), which sends no real email.
2. Signed in through the native Clerk UI and each Vercel app separately using that same identity.
3. Created `iPhone Sync Check` / `Synthetic Test`, 100 pages, on the phone. It appeared in [Bookshelf](https://kaizen-bookshelf.vercel.app/library).
4. Bookshelf logged page 25 and saved a note plus four-star rating. All appeared on the phone.
5. The phone logged page 40. Both websites displayed page 40 after refresh.
6. [Full Kaizen](https://project-kaizen-gamma.vercel.app/library) logged page 55. The phone displayed page 55 after relaunch, with session history totaling 55 pages and the web note/rating retained.
7. Deleted the synthetic book from the native confirmation dialog. Bookshelf displayed zero books. An authenticated pull scoped to that test identity confirmed the book and its reading sessions were tombstoned.
8. Called the existing account-deletion endpoint for this exact test identity. It returned `deleted: true`; Clerk's exact-user lookup returned 404 and its scoped active-session list was empty. All three apps returned to sign-in. Temporary credentials and only that test account's simulator cache were removed; the original local library was preserved.

Screenshots contain synthetic records only:

- [iPhone shared progress](iphone-shared-progress.png)
- [iPhone web note and rating](iphone-shared-notes.png)
- [Full Kaizen shared progress](full-kaizen-progress.jpg)

## Remaining release criteria

This is a simulator-tested prototype, not a distributed iPhone release. [#49](https://github.com/calcuttin/Project-Kaizen/issues/49) tracks review/merge, Apple signing/App ID prefix/native registration, physical-device and spoken VoiceOver checks, intended production Clerk configuration and provider OAuth/passkey/redirect validation, and optional TestFlight/App Store distribution. Native annotation editing, cabinet customization, camera scanning and background synchronization are outside this change. Empty cloud shelves are preserved but the current native shelf view groups books only.

Existing #8 and #18 acceptance criteria remain open. **Hosted backup/recovery remains deferred.** No backup destination, recovery project, restore, paid plan or production identity migration was created. Existing web deployments remain at the prior release.
