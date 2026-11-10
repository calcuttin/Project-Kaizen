# iPhone cover and shelf appearance gap

- **Review ID:** `REV-2026-11-10-IOS-COVER-PARITY`
- **Tracker:** [#49](https://github.com/calcuttin/Project-Kaizen/issues/49).
- **Keywords:** iPhone, TestFlight, SwiftUI, book covers, Open Library, coverUrl, shelf themes, cabinet objects, visual parity.
- **Attribution:** AI-assisted diagnosis and implementation by Codex after the maintainer reported the mismatch on their physical phone. The mirrored app was inspected read-only; no personal book records were edited or included in this review.

## Root cause and testing gap

TestFlight build 2 used generated title covers throughout. The native cloud projection retained `coverUrl` inside the original payload for write preservation, but never exposed it to the native book model or rendered an image. It also replaced almost every shelf theme and cabinet with generic artwork. These were implementation omissions, not an observed network failure.

The earlier simulator tests checked book operations and sync without asserting publisher artwork or complete visual parity. Passing those tests did not establish that the app matched the website. Phone Mirroring confirmed the reported fallback covers and generic shelf styling. The installed app and populated account library were visible, but this inspection did not perform a new physical-device round-trip sync test.

## Changes

- Map web cover URLs and hue into native books; preserve them through ordinary edits and invalidate the cover when title, author or ISBN changes. Optional fields preserve compatibility with existing caches.
- Render Open Library artwork in details, reading cards, grid covers and shelf spines. Use a readable fallback when disabled, missing or offline. Look up missing artwork by ISBN and then exact title, following the website's matching strategy.
- Add the website's explicit online-cover disclosure, enable/disable control and retry action. This is a local device preference, disabled by default. Requests use a separate unauthenticated ephemeral session, accept stored artwork only from HTTPS Open Library cover URLs, throttle metadata searches, and use bounded account-scoped memory caching. They never mutate cloud books.
- Project saved shelf themes, cabinet objects, arrangement and brightness without overwriting source metadata. Reuse the website's theme labels, palettes, environment images and object artwork; preserve saved shelf ordering and match spine proportions more closely.
- Release build number **3**. #53 and #54 merged in order after passing checks, and the signed archive was uploaded. [Release evidence and current availability](release.md).

## Validation

- **25 model tests passed**, including new coverage for cover projection/preservation, old-cache loading, identity invalidation, shelf metadata preservation, opt-in, stored-cover requests without auth headers, ISBN 404 fallback/title matching, cache reuse and rate-limit handling.
- **5 simulator UI tests passed** for reading persistence, add/search/delete, reading/journal, accessibility text size and shelves/grid/mark-read. UI regression launches explicitly disable external artwork so those tests do not depend on a public service.
- A separate live visual check used only the synthetic local sample library on an iPhone 17 Pro simulator. After enabling online covers, actual publisher artwork appeared on shelf spines and the Piranesi detail cover. This verifies the renderer beyond mocked download responses.
- Xcode project plist lint and `git diff --check` passed. No backend migration or live account mutation was needed.

## Remaining boundaries

Signed build **0.1.0 (3)** is now **Testing** in the owner group. Physical phone acceptance remains open; see the [release record and phone checklist](release.md). This is closer visual parity, not a claim of complete web feature parity: cabinet editing/animations, ISBN camera scanning and background sync remain web-only or unimplemented in the native app. Exact cabinet lighting effects are not reproduced. Online covers require enabling on this device and depend on Open Library availability; unavailable artwork retains the fallback.

**Hosted backup/recovery remains deferred.**

References: [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers) · [Open Library Search API](https://openlibrary.org/dev/docs/api/search).
