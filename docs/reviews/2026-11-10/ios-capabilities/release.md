# Build 4 barcode scanner TestFlight release

- **Review ID:** `REV-2026-11-10-IOS-ISBN-RELEASE`
- **Trackers:** [#49 — native release/device acceptance](https://github.com/calcuttin/Project-Kaizen/issues/49), [#56 — capability gaps](https://github.com/calcuttin/Project-Kaizen/issues/56).
- **Attribution:** AI-assisted merge, artifact verification, upload and roadmap maintenance by Codex, authorized by the maintainer. Real-camera acceptance remains the maintainer's next test.

## Merge and validation

[PR #57](https://github.com/calcuttin/Project-Kaizen/pull/57) merged on **2026-11-10 at 18:26 UTC** as `bc9bcd57907b9da4c4e9a8241d6308f134104c22`. Every reported check passed on final head `68b8d2536087cb291eaffd3cd4d6c9814ff5008b`: both branch/PR web and database jobs, CodeQL Actions/JavaScript-TypeScript and both Vercel previews. GitHub reported clean/mergeable, with no reviews requesting changes or unresolved review threads.

[PR CI](https://github.com/calcuttin/Project-Kaizen/actions/runs/42874435927) · [Branch CI](https://github.com/calcuttin/Project-Kaizen/actions/runs/42874425557) · [CodeQL](https://github.com/calcuttin/Project-Kaizen/actions/runs/42874429517).

The merged native tree `b76d5f04503772a471af1471ca620d8aac303f6f` matches the tested PR source exactly. The recorded **32 model tests and 7 distinct simulator UI flows** apply to this source; the final camera-lifecycle correction also passed its targeted fallback regression and iPhone Release compilation. [Implementation, screenshots and capability boundaries](README.md).

Post-merge main checks also passed: web, database, container, edge and both CodeQL analyses. Both Vercel deployment statuses succeeded.

## Signed artifact and availability

- **Version:** 0.1.0 (4), bundle `org.projectkaizen.books`, internal TestFlight only.
- A fresh signed device archive passed `codesign --verify --deep --strict`.
- Entitlements contain App ID `GZLCX6QZ8L.org.projectkaizen.books`, `webcredentials:clean-marmot-1889.clerk.accounts.dev`, `beta-reports-active = true`, and `get-task-allow = false`.
- Executable/dSYM arm64 UUIDs match: `03197F1A-0289-3C04-AA8B-63003296B26F`.
- The archive includes the camera purpose string explaining local ISBN scanning. The Debug-only ISBN fixture is absent from the Release binary.
- Apple accepted the upload at **18:30 UTC on 2026-11-10**. Apple processing completed, and build 4 is now **Testing** in the existing **Owner testing** group with **1** tester/invite. The barcode-specific What to Test instructions are saved. Assignment was manual; automatic distribution remains disabled. Export inspection confirmed that the login Associated Domains entitlement was retained.

Signing credentials, provisioning profiles, archives and logs stay local. Build 1 remains unassigned because its export omitted Associated Domains. No personal cloud library records were changed during this release.

## Test on the iPhone

1. In TestFlight, update **Kaizen Books** to **0.1.0 (4)**.
2. Open **Add book → Scan barcode** and allow camera access. Scan a book's 978/979 ISBN barcode. Camera images remain on-device; scanning fills the ISBN only.
3. Tap **Look up ISBN**, review the returned title/author/page count, then **Use these details → Save book**. The lookup sends the ISBN/IP to Open Library; check the edition before saving.
4. Also try typing an ISBN-10/13, an existing ISBN, cancellation, no connectivity and denied camera access. Manual entry should remain available. Non-book/price barcodes must not be accepted as ISBNs.
5. Use a clearly labeled test book for phone/web sync and delete only that test record afterward. Check VoiceOver and large text. Keep existing personal books unchanged while testing.

Physical scanning, camera-permission behavior, interrupted/background capture and spoken VoiceOver are **not** certified by simulator tests. Report the results in #49/#56. The maintainer already confirmed build 3 covers on their phone; that does not establish scanner acceptance. Apple II and other capability gaps remain open. **Hosted backup/recovery remains deferred.**
