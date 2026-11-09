# iPhone TestFlight preparation

- **Review ID:** `REV-2026-11-09-IOS-TESTFLIGHT`
- **Base:** `31d39d19e82001e1ecd28cb14d5d320ca7a6c7e0` (merged native shared-account PR #50).
- **Tracker:** [#49](https://github.com/calcuttin/Project-Kaizen/issues/49).
- **Keywords:** iPhone, SwiftUI, TestFlight, App Store Connect, signing, archive, privacy manifest, dSYM, internal testing.
- **Attribution:** AI-assisted inspection, implementation and local validation by Codex. No independent human or physical-device validation is claimed.

## Findings and changes

The native project had no app privacy manifest, no export configuration, and Release emitted DWARF without a separate dSYM. Xcode had no signed-in Apple account; the local signing-identity check returned zero valid identities. There was no configured development team.

Added the app privacy manifest to its resource build phase, declaring account-linked user ID, library content and reading activity for app functionality and local appearance preferences through UserDefaults (`CA92.1`). Existing SDK privacy manifests remain bundled separately. Enabled Release dSYMs and disabled Release testability. Added the non-exempt-encryption flag based on the current use of HTTPS and Apple's security APIs. Added internal-only TestFlight export options, signing-artifact ignore rules and a [distribution runbook](../../../../apps/ios/Distribution/README.md).

No account, backend, authentication instance or user data was changed. The existing Clerk development configuration is retained for the owner's internal beta. Public production authentication remains separate work.

## Validation — November 9, 2026

Xcode **27.2 (27B52)** successfully archived **Release / generic iOS device / arm64**, using the pinned Clerk 1.7.1, Nuke 13.2.3 and PhoneNumberKit 5.0.14 packages. Signing was explicitly disabled for this local compile check because no Apple team was available.

- `ARCHIVE SUCCEEDED`; no compiler errors. The only reported warning was skipped App Intents metadata extraction because the app does not depend on AppIntents.
- Built bundle: `org.projectkaizen.books`, version **0.1.0 (1)**, iPhone only, minimum iOS **17.0**, SDK **iphoneos27.2**.
- App privacy manifest, ClerkKit, ClerkKitUI and PhoneNumberKit privacy manifests are present inside the archived app.
- Export-compliance flag is present in the generated Info.plist.
- Archive contains `KaizenBooks.app.dSYM`; its arm64 UUID matches the executable: `D0E65E88-1DE9-30F0-9048-03793803B2C0`.
- Source plists/project passed `plutil -lint`; `git diff --check` passed.
- No app behavior changed, so the earlier 20 model/5 UI test results remain historical evidence; this preparation did not rerun them.

## Remaining release gate

This is an **unsigned compile-validation archive**, not an installable or uploaded build. Apple validation and SDK eligibility have not been established by compilation. Needed next: sign in to a paid Apple Developer team, register/verify the App ID and Clerk native association, create/select the App Store Connect app, produce a signed archive, upload it, wait for successful processing and enable the owner as an internal tester. Then verify installation, native sign-in and shared sync on the physical iPhone.

TestFlight availability, physical-device behavior, full spoken VoiceOver and production provider/redirect flows remain unverified. [#49](https://github.com/calcuttin/Project-Kaizen/issues/49) stays open. **Hosted backup/recovery remains deferred.** No backup or recovery project was created.
