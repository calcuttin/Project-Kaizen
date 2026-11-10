# Kaizen Books for iPhone

A native SwiftUI Bookshelf app using the same Clerk account and Supabase library as Project Kaizen and the standalone Bookshelf website. Open **[KaizenBooks.xcodeproj](KaizenBooks.xcodeproj)** in Xcode, select the **KaizenBooks** scheme and an iPhone simulator, then Run (⌘R). Xcode resolves the pinned ClerkKit/ClerkKitUI 1.7.1 packages automatically. Use Xcode 26 or later with Swift 6.2 support. Public frontend configuration is included; no secret key or signing team is needed for the simulator. Deployment target: iOS 17 or later.

For a physical iPhone, choose your development team in the app target’s Signing & Capabilities settings and select your connected phone. For installation through TestFlight, follow the [internal distribution setup](Distribution/README.md). The repository includes internal TestFlight export settings, but never signing credentials. A paid Apple Developer membership and a signed archive are required for TestFlight.

## Connect your library

On launch, choose **Sign in or create account** and use your existing Kaizen credentials. The native app shares books, shelves, progress, reading sessions, book notes, ratings and the current annual goal. Web highlights/annotations are visible; native annotation editing and cabinet customization are not implemented. Full Kaizen and Bookshelf links in Preferences open the two Vercel apps with the same account identity (each app signs in separately).

Changes save atomically on the phone before synchronization. While active, the app checks every 15 seconds and after edits; Preferences also has **Sync now**. Offline edits remain in an account-specific protected cache and resume after sign-in. Conflicts are shown in Preferences with explicit cloud/phone choices; there is no automatic last-write-wins replacement. Choosing a version applies to the complete record, not a field-by-field merge.

**Use my local library** opens the original prototype file. After signing in and completing a first sync, Preferences offers **Import my local iPhone books**. It copies personal books and their reading history once per account, skips matching title/author pairs, assigns fresh IDs and keeps the source file. Sample libraries are never uploaded. The existing cloud goal is retained. Local mode and account mode remain separate until this explicit import.

## Try the local library

1. **Reading:** explore the sample nightstand, open a book, or tap Log reading. Enter the page you reached; the app records only the newly read pages. Reaching the last page finishes the book.
2. **Bookshelf:** add a book, search title/author/ISBN, filter by reading status, and choose a shelf. Enter a new shelf name when adding or editing a book to create that grouping.
3. **Book details:** edit metadata, change status, rate a book, keep notes/highlights, or delete it with confirmation. Selecting Reading after Finished starts a new pass at page zero; prior journal entries remain.
4. **Journal:** see reading sessions, pages from the last seven calendar days, and books finished in the current calendar year. The annual target is optional and editable.
5. **Preferences:** start an empty library when finished exploring. This confirmation removes **all prototype data**, including books and notes added during demo mode. It never touches the web app.

The app opens on Bookshelf, with Shelves/Grid views, status and shelf filters, and a mark-read mode. Dark appearance matches the web default; Preferences offers Light and System alternatives. Native navigation and tap targets remain adapted to iPhone. Saved web shelf themes, object choices, arrangement and brightness are displayed on the phone. Cabinet editing and atmosphere animation remain on the website.

The initial six books are a public-title sample collection with fictional reading activity. Shelves use the web app’s original wooden environment and cabinet assets. Online covers are optional and disabled by default on this device. Enable them above the shelves or in Preferences to display Open Library artwork; this sends book details and your IP address to Open Library. Synced cover URLs are used first, then ISBN/title lookup; missing or offline artwork keeps a readable generated cover. The sample banner stays visible until you start an empty library.

## Scope and data

- SwiftUI `TabView`, `NavigationStack`, native forms, sheets, SF Symbols, the web app’s exact dark/light color tokens, bundled Fraunces/Inter fonts, Dynamic Type layouts, and accessible control labels.
- Atomic JSON persistence in the app sandbox’s Application Support/KaizenBooks/library.json, with iOS complete file protection. State is committed in memory only after a successful write. Unreadable/invalid files are preserved and opened in a disabled state instead of silently resetting data.
- ClerkKit/ClerkKitUI handle native authentication. URLSession calls the existing authenticated `pull_changes` and `push_changes` Supabase RPCs. Only public frontend keys are bundled; session tokens stay with Clerk and are never written to library JSON. Bundled Inter and Fraunces retain their SIL Open Font Licenses. Build 4 adds public ISBN lookup and on-device barcode scanning with manual fallback. Purchases and notifications are not implemented.
- Sessions record forward progress. Marking a book Finished using the status menu does not invent a reading session. Goals count current-year completion dates and start fresh numerically each calendar year.
- Account caches live at `Application Support/KaizenBooks/accounts/<SHA256-of-user-id>.json`. The cursor, raw web records, tombstones, durable mutation outbox and conflicts are saved together. Web-only fields are preserved, UUID prototype IDs remain readable, and account switches invalidate in-flight responses. Deleting the app removes local files and unsent changes. Hosted backup/recovery remains deferred.

This is an internal beta, not a public App Store release. Simulator checks do not establish full physical-device or spoken VoiceOver coverage.

## Validation

Use Product → Test (⌘U), or from the repository root:

```sh
xcodebuild -project apps/ios/KaizenBooks.xcodeproj \
  -scheme KaizenBooks \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' \
  -derivedDataPath /tmp/kaizen-books-derived \
  -parallel-testing-enabled NO test CODE_SIGNING_ALLOWED=NO
```

Choose a simulator available in your Xcode installation (`xcrun simctl list devices available`). Tests use temporary model files and a separate UI-test library, never the normal prototype library. UI screenshots are retained in the Xcode test report.

Model coverage includes progress bounds/double counting, completion, disk persistence, invalid metadata, notes/ratings/goals, deletion cleanup, unreadable-file preservation, failed-write rollback, and resetting sample data. UI flows cover adding/searching/deleting a book, logging progress across an app relaunch, navigating the three main screens, shelf/grid selection, and mark-read mode.

`KaizenBooks/LibraryModel.swift` owns domain, persistence and synchronization scheduling. `CloudSync.swift` owns the RPC contract, record mapping and conflict logic; `AccountView.swift` owns session boundaries and account controls. The remaining app files contain the native screens and shared visual components. The Xcode project and shared scheme are checked-in source files; no project generator is required.

The app icon uses the approved Bookshelf variation of Project Kaizen’s mark: an open book inside the broken amber ring, on charcoal. `tools/generate-icon.swift` draws the vector paths directly with the shared brand colors (`#e8b04b` / `#0f1115`), producing an opaque 1024×1024 sRGB PNG. From `apps/ios`, run `swift tools/generate-icon.swift` to regenerate it, or pass an output path and pixel size for a small-size preview. Outer corners are left square for iOS to mask. The shared in-app Kaizen mark remains separate.

AI-assisted implementation by Codex, November 8, 2026. The existing web app and backend are unchanged. Native navigation follows [Apple’s SwiftUI navigation model](https://developer.apple.com/documentation/swiftui/navigation).

## Authentication and device setup

The checked-in public configuration uses the same **development Clerk instance** and Supabase project as the current web deployments. Its Native API was already enabled when inspected. This change does not enable Test mode or modify authentication settings. Before production distribution, configure the intended production Clerk instance and native application registration, update public configuration/associated domains together, and verify production sign-in and redirects.

The callback scheme is `org.projectkaizen.books`; associated domains include the existing Clerk frontend host. For a physical device, set your Apple signing team and register its App ID prefix plus bundle identifier with Clerk as described in the [iOS quickstart](https://clerk.com/docs/ios/getting-started/quickstart). Apple sign-in, provider OAuth, passkeys, TestFlight/App Store distribution, physical-device testing and full spoken VoiceOver are not certified by simulator tests.

## Screenshots

Captured from the running native app, with demo data:

- [Bookshelf opening screen](Previews/web-style-bookshelf.png)
- [Reading progress](Previews/reading-home.png)
- [Wooden bookshelf](Previews/native-wooden-bookshelf.png)
- [Book grid](Previews/book-grid.png)
- [Book details](Previews/book-detail.png)
- [Reading journal](Previews/reading-journal.png)
- [Dark appearance](Previews/reading-dark.png)
- [Largest Dynamic Type size](Previews/large-text-reading.png)

### Initial prototype verification — November 8, 2026

Xcode 27.2 built the final prototype successfully. All **6 model tests and 4 UI tests passed** on an iPhone 17 Pro simulator running iOS 26.5. The UI checks exercised add → search → open → delete, page logging → terminate → relaunch, all three tabs, and the largest accessibility text size. Light and dark screenshots were visually inspected. The full local test report is `/private/tmp/kaizen-books-final.xcresult` (temporary, not committed).

Verification fixed the initially hidden native search field, whitespace in bookshelf rows that did not respond to taps, a progress sheet that was too short with accessibility text, and low-contrast dark-mode button labels. Physical-device and complete spoken VoiceOver testing remain unverified.

### Web design revision — November 8, 2026

Replaced the initial cream/green aesthetic with the web app’s original dark/light tokens, gold actions, purple library accents, Fraunces/Inter typography, Kaizen logo, wooden shelves, and cabinet artwork. Bookshelf now opens first; Shelves/Grid and mark-read controls are functional. Existing local library data is preserved.

All **6 model tests and 5 UI tests passed** on iPhone 17 Pro / iOS 26.5, followed by a successful final build including the updated icon. The test report is `/private/tmp/kaizen-web-style-tests.xcresult` (temporary). See [design QA](design-qa.md) for visual comparisons and native adaptations.

### Shared-account integration — November 8, 2026

The native app now connects to the existing web account and library. **20 model tests passed**, covering persistence, version conflicts, retries, account isolation, migration and stale editors. **Five UI flows passed again after the final editor/layout fixes**; evidence is recorded in the [searchable review](../../docs/reviews/2026-11-08/ios-sync/README.md). A signed simulator build verified native email-code sign-in, book/progress/notes/rating sync with both Vercel apps, relaunch persistence and shared deletion. The approved disposable account and its sessions were deleted and all three apps returned to sign-in.

For live sign-in, use normal Xcode Run/build so Keychain access is locally signed. `CODE_SIGNING_ALLOWED=NO` is suitable only for isolated offline model/UI tests. [Release follow-up #49](https://github.com/calcuttin/Project-Kaizen/issues/49) retains physical-device, production-auth and distribution checks. Backup recovery remains deferred.

### Cover and shelf parity follow-up — November 10, 2026

The phone report exposed omitted artwork rendering and generic shelf styling in build 2. Build 3 source adds real cover rendering and saved web shelf appearance. **25 model tests and 5 UI tests passed**; a separate live simulator check confirmed real artwork with the sample library. [Diagnosis and evidence](../../docs/reviews/2026-11-10/ios-cover-parity/README.md). Signed build **0.1.0 (3)** is available in the owner TestFlight group; [release evidence and remaining phone acceptance](../../docs/reviews/2026-11-10/ios-cover-parity/release.md) are recorded separately. Update in TestFlight, then choose **Enable online covers** on Bookshelf or in Preferences.

## ISBN quick add and capability review

Build 4 adds **Scan barcode** and **Look up ISBN** in Add/Edit Book. Scan or type an ISBN, look it up, review the returned details, then save. Camera scanning runs on supported iPhones; manual entry remains available when the camera is unavailable or denied. Lookup sends the ISBN/IP to Open Library after the explicit action. Signed **0.1.0 (4)** is now **Testing** in the owner group. Update through TestFlight; [release evidence and remaining real-camera acceptance](../../docs/reviews/2026-11-10/ios-capabilities/release.md) are recorded separately. [Full web/native capability matrix and camera checklist](../../docs/reviews/2026-11-10/ios-capabilities/README.md).
