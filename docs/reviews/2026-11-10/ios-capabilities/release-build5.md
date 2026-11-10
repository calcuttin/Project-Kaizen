# Build 5 native capability TestFlight release

Review ID: **REV-2026-11-10-IOS-CAPABILITIES-RELEASE**. Trackers: [#49](https://github.com/calcuttin/Project-Kaizen/issues/49), [#56](https://github.com/calcuttin/Project-Kaizen/issues/56). AI-assisted merge, artifact verification, upload and roadmap maintenance by Codex, explicitly authorized by the maintainer. Physical acceptance is separate from release availability.

## Ordered merges

All reported pre-merge checks passed; GitHub reported each PR clean and mergeable, with no change requests or unresolved review threads. Each dependent PR was retargeted to main after its predecessor merged. The computed merge tree exactly matched its already-tested source; no rebase or conflict edits were needed.

| PR | Capability | Merge commit | Time (2026-11-10 UTC) |
| --- | --- | --- | --- |
| [#59](https://github.com/calcuttin/Project-Kaizen/pull/59) | Apple II | `97c3687bf52d4e1a256413b3a6851f576055b7f4` | 20:37:58 |
| [#60](https://github.com/calcuttin/Project-Kaizen/pull/60) | Shelf management | `92196ec3240b3e189a09c3555e7998299b70a4f8` | 20:38:28 |
| [#61](https://github.com/calcuttin/Project-Kaizen/pull/61) | Reading, journal and account handoffs | `c9b756065c8f7ca4860ea694322ea72d63c06018` | 20:39:13 |
| [#62](https://github.com/calcuttin/Project-Kaizen/pull/62) | Imports and undo | `395739073714374ac1406d52ef1bf59286ca5870` | 20:40:09 |
| [#63](https://github.com/calcuttin/Project-Kaizen/pull/63) | Accessible shelf motion | `4c6d33e30108ddb6c51fdee52e2ea3a5b300c374` | 20:40:29 |

The final native tree `48f4e04dec12477208b9972bfe1ac058f8ba4998` exactly matches tested head `b9f3de6`. The recorded **51 model tests and 14 distinct simulator UI flows** therefore apply to the merged native source. [Implementation reviews and screenshots](README.md). Native test coverage is separate from GitHub Linux checks.

## Signed artifact and availability

A fresh signed archive was built from merged main `4c6d33e` as **0.1.0 (5)**, bundle `org.projectkaizen.books`. It passed strict/deep code-signature verification. Entitlements retain `GZLCX6QZ8L.org.projectkaizen.books`, `webcredentials:clean-marmot-1889.clerk.accounts.dev`, `beta-reports-active = true`, and `get-task-allow = false`. Executable/dSYM arm64 UUIDs match: `29CAB8D4-05F7-34BD-977F-9FB45AB8016B`. Camera and encryption declarations are present; Debug ISBN/import/reduced-motion fixtures are absent from the Release binary.

Apple accepted the upload at **20:43:33 UTC on 2026-11-10**. Export logs confirm the login Associated Domains entitlement was retained. Apple initially displayed build 5 as **Processing**. Subsequent app/build-list reads returned “Sorry, something went wrong,” including from a fresh Safari tab. Final processing, Owner testing assignment and saved What to Test instructions are **pending verification**; upload success alone is not tester availability.

All post-merge main checks passed: [web/database CI](https://github.com/calcuttin/Project-Kaizen/actions/runs/42897602726), [container/edge verification](https://github.com/calcuttin/Project-Kaizen/actions/runs/42897602795) and [CodeQL Actions/JavaScript-TypeScript](https://github.com/calcuttin/Project-Kaizen/actions/runs/42897603468). Both Vercel deployment statuses succeeded for `4c6d33e`.

Signing credentials, profiles, archives and upload logs stay local. No personal cloud library data was changed. No new testers, public link or external distribution are part of this release.

## Phone acceptance checklist

Update to Kaizen Books 0.1.0 (5).

1. Tap the Apple II computer on a shelf (or the Apple II toolbar button). Try Load demo, RUN, HELP and BOOKS; type PRINT 2+2. Confirm commands and keyboard dismissal work.
2. Manage shelves: create a clearly named test shelf, try themes, objects, layout, lighting and brightness; rename and reorder it. Check empty and same-name shelves. Remove only your test shelf and confirm its books remain unshelved.
3. Import books: select a small CSV/Goodreads file or Kindle My Clippings.txt from Files. Review the preview and Kindle matches before importing; test duplicate handling and Undo last import. Use synthetic test data first.
4. Test book-delete Undo on a clearly named test book only. Undo is immediate/session-local, not a backup.
5. Check paused books in Reading, daily page goals, all-time journal totals, journal-to-book navigation and annotation context. Preferences links account/data tools to the website.
6. Play/pause the solar system; toggle Ambient shelf motion and iOS Reduce Motion. Check large text, VoiceOver, app background/resume and phone/web sync using only test records.
7. Recheck covers and barcode/manual ISBN entry from build 4.

Known follow-up: the Apple II artwork still has a baked checkerboard edge/background. Physical and live-sync acceptance is still in progress. Hosted backup recovery remains deferred.

Simulator checks do not establish real camera behavior, external Files/iCloud-provider behavior, spoken VoiceOver, hardware-keyboard support, the actual system Reduce Motion toggle or round-trip sync of these new features against a live account. These remain open in #49/#56. Existing production-auth acceptance also remains open. **Hosted backup/recovery stays deferred; no recovery destination or restore was created.**
