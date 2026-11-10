# Internal TestFlight upload and native login registration

- **Review ID:** `REV-2026-11-10-IOS-TESTFLIGHT`
- **Tracker:** [#49](https://github.com/calcuttin/Project-Kaizen/issues/49) · [PR #53](https://github.com/calcuttin/Project-Kaizen/pull/53).
- **Keywords:** iPhone, SwiftUI, TestFlight, distribution signing, provisioning, Clerk, Associated Domains, internal testing, dSYM.
- **Attribution:** AI-assisted configuration, signing inspection and upload by Codex, with explicit maintainer approval for signing credentials and native login registration. Physical-device acceptance is not claimed.

## Completed configuration

The paid Apple team is active. The existing bundle ID `org.projectkaizen.books` is registered under prefix/team `GZLCX6QZ8L`, and App Store Connect app **Kaizen Books** exists. The approved Apple Distribution certificate and **Kaizen Books TestFlight** App Store Connect provisioning profile were created and installed locally. Release device builds use that profile; Debug retains automatic signing. No certificate, private key, provisioning profile, archive or IPA is committed.

Clerk now registers `GZLCX6QZ8L.org.projectkaizen.books` and callback `org.projectkaizen.books://callback` in the existing shared development instance. The public association endpoint returned that exact App ID under `webcredentials.apps`. The existing web authentication instance and library backend are retained.

## Archive and upload evidence

Xcode **27.2 (27B52)** archived **0.1.0 (2)** for generic iOS/arm64 with distribution signing. `codesign --verify --deep --strict` succeeded with normal keychain access. Its entitlements include the exact App ID, `webcredentials:clean-marmot-1889.clerk.accounts.dev`, `beta-reports-active = true` and `get-task-allow = false`. The export pipeline preserved those entitlements. Executable and dSYM UUIDs match: `B326F213-0F73-31B1-B23D-601E21E26552`.

The internal-only upload completed at **2026-11-10 15:20 UTC** with `EXPORT SUCCEEDED` and Apple's uploaded-package-processing acknowledgment. Upload acceptance is distinct from successful processing and tester availability.

The first upload, **0.1.0 (1)**, was exported from the unsigned compile archive. Inspection showed that export omitted Associated Domains. It was never assigned to a testing group; **do not enable build 1**. Build 2 corrects this by signing the archive itself using the distribution profile. The runbook now requires entitlement verification and preserves the source build number.

The **Owner testing** group contains only the existing account owner, with automatic distribution disabled. Apple processing and selecting build 2 for that group are pending at this checkpoint.

## Limits and remaining work

Physical iPhone installation, sign-in, shared sync, offline/reconnect and full spoken VoiceOver remain unverified. Earlier native model/UI and disposable-account sync results remain historical evidence; this signing-only follow-up did not rerun those tests. Production Clerk/provider/passkey acceptance and public App Store distribution are separate work. PR #53 remains open for review.

**Hosted backup/recovery remains deferred.** No backup destination, recovery project or restore was created.
