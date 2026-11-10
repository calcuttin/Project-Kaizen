# Reading, journal and account-tool capability follow-up

Review ID: **REV-2026-11-10-IOS-READING** · Related: [#56](https://github.com/calcuttin/Project-Kaizen/issues/56). Depends on shelf management [#60](https://github.com/calcuttin/Project-Kaizen/pull/60).

Codex implemented the next capability group at the maintainer’s request:

- Paused books stay in Reading with a Paused label and Resume & log reading action. Logging new pages resumes the book through the existing progress path.
- Preferences edits the shared pages-per-day target; Journal displays it when enabled. Zero means no daily target. Annual-only saves preserve existing daily settings and unrecognized web goal fields. A stale Preferences draft is rejected rather than overwriting a more recent goal.
- Journal shows all-time pages and opens book details from a session row.
- Imported annotations display page, location, date and source when present, in addition to existing kind/content. Plain notes remain editable as before.
- Preferences explicitly links to web Settings for account management/deletion, experience switching and JSON export/import. The copy explains separate browser sign-in, the need to sync before export, the scope of account deletion, and that local-only phone data is not included in web exports. Opening a link performs no destructive action. This exposes existing account tools; it does not implement hosted recovery.

Validation: **41 native model tests passed**, including daily-goal field preservation, stale goal drafts, paused/resume behavior, all-time totals and annotation context. The simulator daily-goal edit/save and journal-to-book navigation test passed. Its initial input landed before the existing zero; placing the test cursor at the trailing edge corrected the test and verified the intended value. The Settings destination is the existing `/settings` route. No personal cloud records were changed. Live multi-device goal verification and physical VoiceOver remain acceptance checks.

**Hosted backup/recovery remains deferred.** No merge, TestFlight release or live account deletion is claimed by this implementation review.
