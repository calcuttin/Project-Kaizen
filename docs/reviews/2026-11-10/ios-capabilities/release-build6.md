# Build 6 external TestFlight release

Review ID: **REV-2026-11-10-IOS-EXTERNAL-BETA**. Trackers: [#49](https://github.com/calcuttin/Project-Kaizen/issues/49), [#56](https://github.com/calcuttin/Project-Kaizen/issues/56). AI-assisted release preparation by Codex at the maintainer’s explicit request.

## Scope and validation

Build **0.1.0 (6)** has the same app implementation as build 5 (`4c6d33e` merged source). Only the build number changes; a separate `ExportOptions-External.plist` enables eligibility for external TestFlight. The original internal-only export remains available. This is a private external beta for the requested tester, not an App Store launch or public invitation link.

The app implementation retains its recorded 51 model tests and 14 distinct simulator UI flows. A fresh signed build 6 archive from `f0858e2` passed strict/deep signature verification, required login Associated Domains/App ID checks, camera/encryption declarations, Release test-fixture exclusion and matching executable/dSYM UUID verification: `98C9E2F7-ED9A-3B5E-A376-195D54EDB247`. Project/export plist lint and diff checks passed. No new app behavior was introduced or broader physical/live acceptance claimed.

## Distribution status

External group creation/tester addition was confirmed before this release. The group contains one explicitly requested tester and no public link. Tester contact details and any review-account credentials stay out of this public repository.

- [x] Prepare and verify signed build 6 with external eligibility.
- [ ] Complete upload and Apple processing.
- [ ] Complete beta description/contact/sign-in information and submit for Apple’s beta review.
- [ ] Confirm approval and availability to the existing External group; notify the requested tester automatically when approved where supported.

Current beta-review contact and dedicated account details are pending maintainer input. No personal account will be supplied to Apple. The existing Clerk development instance is unchanged; production-auth acceptance remains separately tracked. **Hosted backup/recovery remains deferred.**

[Build 5 capability checklist](release-build5.md#phone-acceptance-checklist) applies to this build. Physical camera, external Files providers, spoken VoiceOver, hardware keyboard, actual system Reduce Motion and new-feature live sync remain open in #49/#56. Apple II checkerboard-art cleanup also remains open.
