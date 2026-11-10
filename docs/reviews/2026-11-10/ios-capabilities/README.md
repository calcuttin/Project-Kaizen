# Bookshelf website → iPhone capability review

- **Review ID:** `REV-2026-11-10-IOS-CAPABILITIES`
- **Scope:** Bookshelf/library, Reading, Journal and shared-account controls. Full Kaizen task/habit tracking is deliberately outside this books-only iPhone app.
- **Roadmap:** [#56 — capability gaps](https://github.com/calcuttin/Project-Kaizen/issues/56), [#49 — native release/device acceptance](https://github.com/calcuttin/Project-Kaizen/issues/49).
- **Baseline:** released iPhone 0.1.0 (3), main `b602d66`; scanner follow-up prepares build 4.
- **Attribution:** AI-assisted source comparison and implementation by Codex at the maintainer's request. The maintainer confirmed that covers work on their physical iPhone; that does not establish scanner, full sync or VoiceOver acceptance.

## Capability matrix

The findings compare reachable website controls with reachable native controls. A data-model field alone is not treated as a working feature.

| Capability | Website | iPhone / remaining work | Priority |
| --- | --- | --- | --- |
| Apple II computer | Opens BASIC playground, demo, command help and library listing | Static artwork with no action. Add an accessible button and native terminal; test commands, cancellation and bounded execution. | High |
| Shelf management | Create empty shelves, rename/remove, choose themes/objects, lighting/brightness/layout and restore defaults | Books can be assigned by shelf name and saved artwork is displayed. No standalone shelf editor; empty shelves disappear. Native grouping/selection uses names, so same-name web shelves cannot be distinguished. Use stable shelf IDs before adding full management. | High |
| Camera / ISBN quick add | Scan barcode or enter ISBN and look up metadata | Implemented in this follow-up: scan or type → lookup → review details → save. Build 4 upload and physical camera acceptance remain pending. | Implemented, acceptance open |
| Bulk import | CSV/Goodreads and Kindle clippings, preview/matching, duplicate handling and undo of imported records | Only the separate one-time local-iPhone-library import exists. Add file picker, review/matching and bounded import/undo. Web import remains available. | Medium |
| Paused books on Reading | Includes reading and paused books | Reading tab filters only `reading`; paused books remain reachable through Bookshelf. Include paused books with clear status and resume behavior. | Medium |
| Reading goal | Annual books and pages/day | Annual goal/enable control only. Existing cloud pages/day is preserved but not editable/displayed. | Medium |
| Journal | All-time page total and rows that open book details | Weekly pages and session list, but no all-time total or journal-to-book navigation. | Low |
| Imported annotation context | Kindle import carries kind, content, page/location/date | Native display shows kind/content only. Add source/page/location/date context. Neither inspected website nor native UI has a general structured-annotation editor; this is not a native-only editing gap. Plain book notes are editable in both. | Medium |
| Deletion recovery | Book deletion offers undo | Native confirmation then deletion, no undo. Shared deletion itself works; recovery affordance differs. | Medium |
| Shelf motion | Ambient effects, rotating orrery and play/pause controls with reduced-motion handling | Static artwork, no interactive orrery, ambient switch or equivalent lighting animation. | Low |
| Account/data tools | Experience switching, account settings, JSON export/import and account deletion in web Settings | Native sign-in/out, conflicts, sync-now and links to both websites. The wider account/data tools require web handoff; no native equivalents. This is distinct from deferred hosted backup/recovery. | Medium |
| Core library | Add/edit/search, status and shelf filtering, shelves/grid, notes, rating, progress and goals | Present. Some navigation/edit patterns differ (explicit native Save versus web autosave), which is intentional, not missing capability. | Present |
| Covers and shelf artwork | Opt-in online covers, saved themes/objects | Present in build 3; physical cover rendering confirmed by the maintainer. Exact visual effects and interactions remain separate above. | Confirmed for covers |

## Source evidence

- Web: [library and book editor](../../../../src/modules/library/LibraryPage.tsx), [shelf controls](../../../../src/modules/library/ShelfScene.tsx), [Apple II](../../../../src/modules/library/RetroTerminal.tsx), [imports](../../../../src/modules/library/ImportCenter.tsx), [Reading/Journal](../../../../src/modules/library/ReadingPage.tsx), [account/data settings](../../../../src/modules/settings/SettingsPage.tsx).
- Native: [Bookshelf/Reading](../../../../apps/ios/KaizenBooks/KaizenBooksApp.swift), [static cabinet](../../../../apps/ios/KaizenBooks/Design.swift), [book editor/annotations](../../../../apps/ios/KaizenBooks/BookDetailView.swift), [Journal/preferences](../../../../apps/ios/KaizenBooks/JournalView.swift), [account controls](../../../../apps/ios/KaizenBooks/AccountView.swift), [name-based shelves and reading filter](../../../../apps/ios/KaizenBooks/LibraryModel.swift).

## Scanner implementation

[ISBN validation/lookup](../../../../apps/ios/KaizenBooks/ISBNLookup.swift) accepts checksum-valid ISBN-10 or book-prefix ISBN-13, normalizes to ISBN-13, and rejects unrelated product codes. [The camera sheet](../../../../apps/ios/KaizenBooks/ISBNScanner.swift) uses Apple's on-device VisionKit EAN-13 scanner with a camera purpose string. A supported device and camera permission are required. Unsupported/restricted/denied/interrupted cameras retain manual ISBN entry. Closing or leaving the scanner stops capture; no photos are saved or uploaded.

Scanning fills the ISBN only. **Look up ISBN** explicitly sends the ISBN/IP to Open Library using a separate unauthenticated ephemeral session. Metadata is reviewed before applying it to the form; nothing is saved automatically. Missing author/page counts remain editable. A normalized ISBN match warns about an existing copy. Missing books, malformed data, outages and rate limits show manual-entry guidance. ISBN edits, cancellation and editor dismissal invalidate late responses. Online artwork remains a separate local opt-in. The old Add Book text incorrectly claiming no online cover requests was corrected.

The change prepares **0.1.0 (4)**; build 3 on TestFlight is unchanged. No new backend schema or account permissions are needed. This scanner change does not implement the other matrix gaps.

## Validation and release boundaries

- **32 model tests passed** (25 existing plus 7 ISBN tests): checksums/normalization, canonical public requests without auth/cookies, missing/malformed metadata, unsafe cover URLs, invalid input without network, rate limiting and late-response cancellation.
- **7 distinct simulator UI tests passed** across the regression and targeted runs. They cover the five existing flows, scanner-unavailable/invalid-ISBN fallback, and metadata review/apply/save. Manual entry persists a normalized ISBN that can be found through search. The review test asserts that lookup alone leaves Save disabled, then checks the saved title/author/page count. Synthetic metadata is injected only with both UI-test flags in Debug; the fixture is excluded from Release.
- An unsigned **Release build for generic iPhone succeeded**. This checks device compilation, not camera operation or signed distribution.
- A separate public HTTP lookup for ISBN `9780140328721` returned *Fantastic Mr. Fox*, Roald Dahl, 96 pages. This verifies the live endpoint response, not a physical scan or a signed-in app round trip. No personal books or account credentials were sent.
- Direct manual simulator control could not activate the signed-out local-library button in Device Hub during this pass; the automated app flows and their screenshot attachments provide UI evidence instead. A live manual in-app lookup is not claimed.
- Project/Info plist lint, documentation links and `git diff --check` passed. No personal cloud data was changed.

[Metadata review screenshot](isbn-review.png) · [Scanner-unavailable fallback](scanner-fallback.png). The review screenshot uses a synthetic UI-test book; it is not Open Library's real record for that ISBN.

### Physical camera checklist for the next TestFlight build

- Scan a real 978 ISBN and, if available, a 979 ISBN; ensure only one result returns to the form.
- Show a price/add-on or ordinary product barcode; it must not be accepted as a book ISBN.
- Allow camera access, then separately deny/restrict it; manual entry must remain usable.
- Cancel scanning, lock/background the app and reopen; capture must stop and the form's typed data must survive.
- Look up the scanned ISBN, verify the edition/page count, then save one clearly labeled test book and verify shared sync.
- Try no connectivity, an unknown valid ISBN, an existing ISBN, large text and spoken VoiceOver.

**Hosted backup/recovery remains deferred.** Physical cover success is recorded separately from camera, sync and accessibility acceptance.

References: [Apple camera scanning](https://developer.apple.com/documentation/visionkit/scanning-data-with-the-camera) · [Open Library Books API](https://openlibrary.org/dev/docs/api/books).
