# Internal TestFlight release

This configuration prepares **Kaizen Books 0.1.0** (`org.projectkaizen.books`) for the owner's iPhone through internal TestFlight. It keeps the same Clerk development instance and Supabase library used by the two websites. A TestFlight upload is not a production-auth migration or a public App Store launch.

## Apple setup

1. Sign in to **Xcode → Settings → Apple Accounts** with an active Apple Developer Program membership. A free Personal Team cannot distribute through TestFlight. Accept any pending Apple agreements yourself.
2. In **KaizenBooks → Signing & Capabilities**, select the paid team. Debug uses automatic signing. Release builds for iphoneos use the **Apple Distribution** identity and the **Kaizen Books TestFlight** App Store Connect profile for team `GZLCX6QZ8L`. Register the existing bundle identifier and Associated Domains capability. Install that profile through Xcode’s **Download Manual Profiles** action; no registered device is required for this distribution profile. If the identifier is unavailable, stop and update the bundle identifier, callback URL scheme and Clerk native registration together before rebuilding.
3. Register the actual App ID prefix and bundle identifier in the current Clerk instance's native application settings. Verify the associated-domain association for `clean-marmot-1889.clerk.accounts.dev`. Never substitute a guessed team/prefix. Email-code sign-in worked on the signed simulator; physical-device redirects and passkeys remain unverified.
4. In App Store Connect, create an **iOS** app record with primary language **English (U.S.)**, the registered bundle ID, and an unused SKU such as `kaizen-books-ios`. Use **Kaizen Books** as the working name if available. No App Store publication is required for internal testing.

## Archive and upload

Select **KaizenBooks**, **Any iOS Device**, then **Product → Archive**. In Organizer choose **Distribute App → TestFlight Internal Only**. Use the configured distribution certificate/profile and include symbols. Increment `CURRENT_PROJECT_VERSION` for each upload (current source/upload: **4**; use **5** or higher for the next upload). Do not disable signing for this archive.

Equivalent commands from the repository root after installing the approved distribution certificate and profile:

```sh
xcodebuild archive \
  -project apps/ios/KaizenBooks.xcodeproj -scheme KaizenBooks \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath /tmp/KaizenBooks-TestFlight.xcarchive \
  -disableAutomaticPackageResolution

# This command uploads the signed app to Apple.
xcodebuild -exportArchive \
  -archivePath /tmp/KaizenBooks-TestFlight.xcarchive \
  -exportOptionsPlist apps/ios/Distribution/ExportOptions.plist \
  -exportPath /tmp/KaizenBooks-TestFlight-export \
  -allowProvisioningUpdates
```

The export settings select the same team and manual distribution profile, include dSYMs, preserve the source build number and restrict the build to **internal** TestFlight. Before upload, verify the signed app with `codesign --verify --deep --strict` and `codesign -d --entitlements -`. Its entitlements must include `application-identifier = GZLCX6QZ8L.org.projectkaizen.books`, `webcredentials:clean-marmot-1889.clerk.accounts.dev`, and `get-task-allow = false`. Confirm that the executable and dSYM UUIDs match. Never commit certificates, provisioning profiles, API private keys, passwords or archives. Xcode stores signing credentials locally.

An unsigned archive only validates compilation and bundled resources. Do not use it as the distribution source: export can sign the app while omitting the required Associated Domains entitlement. The initial build 1 upload exposed this issue and must remain unassigned; build 2 is the corrected signed archive. Apple processing/validation is a separate required check.

## Privacy and encryption

The app manifest declares account-linked library content, user ID and reading activity used for app functionality. Appearance preferences use UserDefaults within the app (`CA92.1`). The bundled Clerk/ClerkKitUI and PhoneNumberKit manifests describe their SDK usage separately; review the aggregate privacy report before broader distribution. The native app does not add advertising tracking.

`ITSAppUsesNonExemptEncryption` is false: reviewed code uses HTTPS, Apple Keychain/data protection and CryptoKit hashing; no custom or non-exempt encryption implementation was found in the pinned dependencies. Reassess this declaration if cryptography or dependencies change. This is not an assertion that the app uses no encryption.

The privacy manifest does not replace the App Store Connect privacy questionnaire or privacy policy. Complete those with the actual service configuration before a public release. Current development authentication and outstanding native acceptance checks remain tracked in [#49](https://github.com/calcuttin/Project-Kaizen/issues/49).

## Install and test

After Apple finishes processing the build, use the **Owner testing** internal group and add only the account owner as a tester. Keep automatic distribution disabled and explicitly select the verified processed build for that group. Install Apple's TestFlight app on the iPhone, accept the invitation and install Kaizen Books. An internal tester needs App Store Connect access; do not invite unrelated testers or enable a public link as part of this setup.

Build 4 upload and availability: [scanner release record](../../../docs/reviews/2026-11-10/ios-capabilities/release.md). Build 3 covers were confirmed on the maintainer’s phone.

Suggested “What to Test” text:

> Update to build 4. Open Add book, choose Scan barcode and allow camera access. Scan a 978/979 ISBN, tap Look up ISBN, review the title/author/page count, then Use these details and Save book. Scanning stays on-device; lookup sends ISBN/IP to Open Library. Also try typed ISBN-10/13, an existing ISBN, non-book barcodes, camera denial, cancellation/backgrounding and no connectivity. Manual entry should remain available. Use a clearly named test book for phone/web sync and delete only that test book afterward. Check large text and VoiceOver. Apple II/cabinet interactions remain pending.

Record the uploaded version/build, Apple processing result and the physical-device result in #49. Keep hosted backup/recovery deferred. Do not call the release complete until the build is available to the intended tester.

## References

- [Apple: distributing beta builds](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
- [Apple: add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers)
- [Apple: required-reason API declarations](https://developer.apple.com/documentation/technotes/tn3183-adding-required-reason-api-entries-to-your-privacy-manifest)
- [Apple: encryption export compliance](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations)
- [Clerk: native iOS setup](https://clerk.com/docs/ios/getting-started/quickstart)
