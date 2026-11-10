# Build 3 internal TestFlight release

- **Review ID:** `REV-2026-11-10-IOS-COVER-PARITY-RELEASE`
- **Tracker:** [#49](https://github.com/calcuttin/Project-Kaizen/issues/49).
- **Attribution:** AI-assisted merge, signing verification, upload and roadmap maintenance by Codex, authorized by the maintainer. Physical phone acceptance is separate.

## Merge and checks

[PR #53](https://github.com/calcuttin/Project-Kaizen/pull/53) merged first at `26cb518d9d54a7456b793600211f7780d1a7a311`. Its initial database CI failure was a runner port 54322 collision; the failed job passed on retry. Every reported check passed on `192d5d1` before merge.

[PR #54](https://github.com/calcuttin/Project-Kaizen/pull/54) was retargeted from #53's branch to main. The resulting squash-merge conflicts were resolved without changing its tested source tree. Fresh branch/PR web and database CI, CodeQL and both Vercel checks passed on `23d867153a5f7b35c9e09a9fbf3bd70702d64255`; #54 merged second at `c8fc920da7920127abf25699d38fce9fa3b9567a`. No reviews requested changes or unresolved review threads were present.

[PR CI](https://github.com/calcuttin/Project-Kaizen/actions/runs/42859202650) · [Branch CI](https://github.com/calcuttin/Project-Kaizen/actions/runs/42859181041) · [CodeQL](https://github.com/calcuttin/Project-Kaizen/actions/runs/42859183505).

Post-merge main checks also passed: web, database, container, edge and both CodeQL analyses. Both Vercel deployment statuses succeeded. These do not replace native/device acceptance.

## Signed artifact

- Version **0.1.0 (3)**, bundle `org.projectkaizen.books`, internal TestFlight only.
- Archived native tree `1768c7bd4e27d7ab8e90f8a0f781361843336d0f` exactly matches `apps/ios` on merged main. The previously recorded **25 model tests, 5 simulator UI tests and live sample-cover visual check** apply to this unchanged native source.
- Distribution signature passed `codesign --verify --deep --strict`.
- Entitlements include App ID `GZLCX6QZ8L.org.projectkaizen.books`, `webcredentials:clean-marmot-1889.clerk.accounts.dev`, `beta-reports-active = true`, and `get-task-allow = false`.
- Executable and dSYM share arm64 UUID `C2835B26-2C6F-3A5F-91AA-0654A4A38377`.
- Apple accepted the upload at **16:58 UTC on 2026-11-10**. Apple processing completed, and App Store Connect now shows build 3 **Testing** in the existing **Owner testing** internal group with **1** tester/invite. The cover-specific What to Test checklist was saved. Automatic distribution remains disabled; build 1 remains unassigned. Export inspection confirmed that the login Associated Domains entitlement was retained.

Certificates, profiles, archives and signing logs remain local. No credentials or personal library contents are published.

## Phone acceptance

Update Kaizen Books in TestFlight to **0.1.0 (3)**, then choose **Enable online covers** on Bookshelf or in Preferences. The choice is local to the phone and starts off. Its disclosure explains that Open Library receives book details and the device's IP address.

Check shelf spines, Grid, Reading and book details; compare saved shelf themes and objects with the website. Missing or offline artwork should retain readable fallback covers. Try disabling/retrying covers. Verify the existing library and progress remain intact, then use only a clearly named test book for round-trip sync, offline/reconnect and relaunch checks. Spoken VoiceOver and physical visual acceptance remain open in #49.

Build 1 remains unassigned because its export omitted Associated Domains. This release does not claim complete web feature parity or production-auth acceptance. **Hosted backup/recovery remains deferred.**
