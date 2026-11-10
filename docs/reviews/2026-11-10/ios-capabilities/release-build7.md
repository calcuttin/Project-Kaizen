# Build 7: Kaizen Books app icon

Review ID: **REV-2026-11-10-IOS-ICON**. Trackers: [#49](https://github.com/calcuttin/Project-Kaizen/issues/49), [#56](https://github.com/calcuttin/Project-Kaizen/issues/56). AI-assisted implementation and release preparation by Codex at the maintainer’s request.

## Scope

The maintainer selected icon concept 2: an open book inside Project Kaizen’s broken amber ring. Build **0.1.0 (7)** uses a crisp vector-rendered version with exact brand colors (`#e8b04b` on `#0f1115`). The app icon generator now draws paths directly instead of relying on SVG loading, which produced a blank previous icon. The 1024×1024 sRGB PNG is opaque, with square outer corners for the system mask. The shared in-app Kaizen mark is unchanged.

The build otherwise retains build 6’s implementation and existing shared-account services. Source/archive commit: `e79d3c8`. [PR #66](https://github.com/calcuttin/Project-Kaizen/pull/66) is based on the build 6 release branch (#65), which depends on the build 5 documentation branch (#64); no prerequisite PRs are merged by this task.

## Validation and release progress

- [x] Inspect the full-size icon and 60-pixel preview for readability.
- [x] Verify 1024×1024 dimensions, no alpha, and successful asset-catalog compilation.
- [x] Review generator/build-number diff and pass whitespace checks.
- [x] Verify fresh signed archive and upload with external eligibility. Apple accepted the upload at **23:30:39 UTC (6:30 p.m. Eastern)** on 2026-11-10.
- [x] Complete Apple processing, save build-specific What to Test and assign build 7 to **Owner testing**. App Store Connect confirms **Testing**, with **1 tester** in the group.
- [ ] Add build 7 to External and submit/enable testing after Apple approves build 6. Apple currently disables External selection: only one build of version 0.1.0 can be in beta review at a time. Build 6 remains **Waiting for Review**; build 7 is not queued automatically.
- [ ] Confirm physical installation, new icon appearance and app launch.

The signed archive passed strict/deep signature verification, required App ID/Associated Domains checks, camera/encryption declarations and Release fixture exclusion. The executable and dSYM UUID match: `98C9E2F7-ED9A-3B5E-A376-195D54EDB247` (unchanged app executable). The compiled icon inside the archive was decoded and visually inspected. After the maintainer restored the expired browser session, Apple processing and internal assignment completed. The Owner testing build list confirms **0.1.0 (7) — Testing**. The overall iOS build list still says Ready to Submit because external beta review is separate. Apple’s Add Group dialog disables External until the previously submitted build 6 is approved. No existing review was withdrawn, no build was expired and no tester access was expanded. Tester details and review credentials remain private. The isolated Apple review account prepared for build 6 remains available; no new account or data access is needed for this artwork-only release.

## What to test

Update to **0.1.0 (7)**. Confirm the amber open-book/ring icon appears on the Home Screen, App Library and app switcher. Check light/dark Home Screen appearance and launch from the icon. Recheck sign-in, library display and online covers. The [build 5 capability checklist](release-build5.md#phone-acceptance-checklist) still applies; use synthetic test records for edits and sync.

Physical camera, Files providers, spoken VoiceOver, hardware keyboard, system Reduce Motion and broader live sync acceptance remain open in #49/#56. **Hosted backup/recovery remains deferred.**

## Checks and next action

The initial PR database job encountered an occupied runner port (`54322`) before tests ran; the failed job was retried and the workflow passed. The other branch database check, web checks and both Vercel statuses also passed on `4a1a27a`; documentation-only follow-up heads run their own checks. No app behavior changed, so the prior 51 model tests / 14 simulator flows are historical coverage, not rerun claims for this release.

On the owner’s phone: **TestFlight → Kaizen Books → Update to 0.1.0 (7)**. Physical installation and icon appearance remain to be confirmed. Once Apple approves build 6, add **build 7** to the existing **External** group, submit if required and enable automatic tester notification. Build 6’s existing automatic notification remains configured; it does not automatically assign build 7. The dedicated review account remains available. **Hosted backup/recovery remains deferred.**
