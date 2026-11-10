# Public roadmap

Kaizen's roadmap connects public reviews to actionable issues, implementation pull requests, and validation evidence.

[Review archive](docs/reviews/README.md) · [Open roadmap issues](https://github.com/calcuttin/Project-Kaizen/issues?q=is%3Aissue%20is%3Aopen%20label%3Aroadmap) · [AI-assisted work](https://github.com/calcuttin/Project-Kaizen/issues?q=is%3Aissue%20label%3Aai-assisted)

## Native capability PR stack — 2026-11-10

The remaining source-level capabilities in [#56](https://github.com/calcuttin/Project-Kaizen/issues/56) now have implementations under review: **[#59 Apple II](https://github.com/calcuttin/Project-Kaizen/pull/59) → [#60 shelves](https://github.com/calcuttin/Project-Kaizen/pull/60) → [#61 reading/account tools](https://github.com/calcuttin/Project-Kaizen/pull/61) → [#62 imports/undo](https://github.com/calcuttin/Project-Kaizen/pull/62) → shelf motion**. [Motion and final validation](docs/reviews/2026-11-10/ios-capabilities/motion.md) · [Updated capability matrix](docs/reviews/2026-11-10/ios-capabilities/README.md). New features are not yet merged or released to TestFlight. Live sync, external Files providers, physical camera/VoiceOver/hardware keyboard acceptance and Apple II checkerboard-art cleanup stay open. Hosted backup/recovery remains deferred.

## Native import and undo follow-up — 2026-11-10

CSV/Goodreads and Kindle file previews, duplicate handling, explicit book matching, local/shared annotations and guarded import undo are implemented for [#56](https://github.com/calcuttin/Project-Kaizen/issues/56). Book deletion also offers immediate undo with full cloud metadata and tombstone-aware restoration. [Review and validation](docs/reviews/2026-11-10/ios-capabilities/imports-undo.md). This follows reading PR #61 after #59 and #60. External file-provider and physical acceptance remain open. Hosted backup/recovery stays deferred.

## Native reading and account-tool follow-up — 2026-11-10

The next [#56](https://github.com/calcuttin/Project-Kaizen/issues/56) implementation adds paused Reading, shared daily goals, all-time journal totals, journal-to-book navigation, annotation context and explicit web handoffs for account/data tools. [Review and validation](docs/reviews/2026-11-10/ios-capabilities/reading.md). It depends on shelf PR #60, after Apple II #59. Imports, deletion undo, shelf motion and physical acceptance remain tracked. Hosted backup/recovery stays deferred.

## Native Apple II and shelf follow-up — 2026-11-10

Work is progressing through [#56](https://github.com/calcuttin/Project-Kaizen/issues/56). The native Apple II implementation adds a labeled shelf control and toolbar shortcut, a bounded BASIC interpreter, demo/help/catalog commands and command history. [Review and validation](docs/reviews/2026-11-10/ios-capabilities/apple-ii.md). Stable-ID shelf management now adds empty/same-name shelves, create/rename/remove/reorder and cabinet appearance controls. [Shelf review and validation](docs/reviews/2026-11-10/ios-capabilities/shelves.md). Apple II is [PR #59](https://github.com/calcuttin/Project-Kaizen/pull/59); the shelf PR depends on it. Implementation, merge/release and physical-device acceptance are tracked separately. Hosted backup/recovery stays deferred.

## Native capability review and ISBN quick add — 2026-11-10

The maintainer confirmed build 3 covers work on their iPhone. [Tracker #56](https://github.com/calcuttin/Project-Kaizen/issues/56) and a [website/native capability audit](docs/reviews/2026-11-10/ios-capabilities/README.md) now distinguishes missing interactions from working artwork: Apple II, shelf management/empty and same-name shelves, imports, paused-reading visibility, daily goals, journal controls, annotation context and account/data-tool handoff remain tracked. Native barcode scanning and ISBN metadata lookup are implemented for build 4, with review-before-save and manual fallback. [PR #57](https://github.com/calcuttin/Project-Kaizen/pull/57) merged after all checks passed. Signed **0.1.0 (4)** was uploaded, processed by Apple and is **Testing** in the owner group. Physical camera acceptance remains open. [Release evidence and phone checklist](docs/reviews/2026-11-10/ios-capabilities/release.md). Hosted backup/recovery stays deferred.

## Native cover and shelf appearance follow-up — 2026-11-10

Phone inspection confirmed that TestFlight build 2 omitted publisher artwork and substituted generic shelf styling. The native follow-up maps and renders web cover URLs, adds opt-in Open Library lookup/retry, and uses saved themes and cabinet objects with the web artwork. Simulator model/UI regressions and a live sample-cover visual check passed. [Diagnosis, changes and validation limits](docs/reviews/2026-11-10/ios-cover-parity/README.md) · [Tracker #49](https://github.com/calcuttin/Project-Kaizen/issues/49). [PR #53](https://github.com/calcuttin/Project-Kaizen/pull/53) and [#54](https://github.com/calcuttin/Project-Kaizen/pull/54) merged in order after all checks passed. Signed **0.1.0 (3)** was uploaded, processed by Apple and is **Testing** in the owner group. Update through TestFlight, then choose **Enable online covers**. Phone visual/sync and spoken VoiceOver acceptance remain open. [Build 3 release evidence](docs/reviews/2026-11-10/ios-cover-parity/release.md). Hosted backup/recovery stays deferred.

## Native iPhone TestFlight — 2026-11-10

The Apple team/App ID, distribution certificate/profile, App Store Connect app and Clerk native login registration are configured. Signed **0.1.0 (2)** passed signature, entitlement and matching-symbol inspection and was uploaded for internal TestFlight. Apple made build 2 Ready to Test, and it is now Testing in the owner-only group with manual build selection. Installation and a populated library were later observed through iPhone Mirroring; full physical sign-in/sync and VoiceOver acceptance remain open in [#49](https://github.com/calcuttin/Project-Kaizen/issues/49). Build 1 remains unassigned because its export omitted Associated Domains. [Release runbook](apps/ios/Distribution/README.md) · [Validation and limits](docs/reviews/2026-11-10/ios-testflight/README.md). Existing shared development authentication is retained; production-auth acceptance remains open. Hosted backup/recovery stays deferred.

## Native iPhone Bookshelf — 2026-11-08

[Tracker #49](https://github.com/calcuttin/Project-Kaizen/issues/49) covers the native shared-account connection and device-release follow-up. The SwiftUI app uses the existing Clerk/Supabase services, with protected account caches, durable offline edits, explicit conflicts and opt-in local-library import. A disposable-account test verified book/progress/notes synchronization across iPhone, Bookshelf and Full Kaizen, plus shared deletion and account cleanup. [Searchable review and evidence](docs/reviews/2026-11-08/ios-sync/README.md) · [Xcode setup](apps/ios/README.md). Apple signing/registration is complete; physical-device and production-auth/distribution acceptance remain open. Hosted backup/recovery stays deferred.

## Shared accounts and Vercel hosting — 2026-11-08

PR #39 and #41 merged in order after passing checks. [Full Kaizen](https://project-kaizen-gamma.vercel.app) and [Bookshelf](https://kaizen-bookshelf.vercel.app) are deployed as separate Vercel projects from the same application revision, Clerk identity system and Supabase database. Users can switch experiences without creating another account. A disposable-account test verified book creation and reading progress in both directions; account deletion completed and both apps signed out. [Release evidence and remaining checks](docs/reviews/2026-11-08/vercel-rollout.md); #18 retains the broader provider acceptance work. Hosted backup/recovery remains deferred.

## Dependency follow-up — 2026-11-08

[Review and validation](docs/reviews/2026-11-08/dependency-follow-up.md) combine compatible updates from #42 and #44–46, and remove an unused mail-service port conflict from database CI. React 19 (#43) remains separate because it exceeds the unchanged JavaScript budget. #18 was reopened after the documentation merge closed it with unfinished criteria. #8 retains spoken screen-reader and physical-device/broader native zoom validation. Current publication and merge status is recorded in #18. Hosted backup/recovery remains deferred.

## Repository monitoring — 2026-10-23

[Dependency follow-up](docs/reviews/2026-10-23/dependency-follow-up.md) evaluates PRs #20–27 together, updates compatible tooling/runtime packages and Actions, aligns Node typings and Supabase CLI, and fixes browser-test isolation/timing assumptions. React 19 remains separate because its measured initial bundle exceeded the existing budget. Current publication/merge status belongs in #18; the remaining manual/provider criteria stay open and backup recovery remains deferred.

Dependabot alerts/security updates, secret scanning, push protection and GitHub-managed CodeQL default setup are enabled. [Configuration and scan evidence](docs/reviews/2026-10-23/security-monitoring.md) records results and limits; [#18](https://github.com/calcuttin/Project-Kaizen/issues/18) remains the live security tracker. Hosted backup/recovery remains deferred.

## October 2026 security and product fixes

Implementation: [PR #17](https://github.com/calcuttin/Project-Kaizen/pull/17) · Release verification: [tracker #18](https://github.com/calcuttin/Project-Kaizen/issues/18).

Source: [REV-2026-10-22-SECURITY-PRODUCT](docs/reviews/2026-10-22/review.md) · [Implementation, screenshots, and verification](docs/reviews/2026-10-22/fixes/README.md).

The maintainer authorized Codex to implement and publish this work. The implementation merged in PR #17 on 2026-10-22. Deployment verification is tracked separately in #18. Independent human validation is not recorded. Existing issue acceptance checklists remain open until their full scope is verified.

## Follow-up implementation PRs — 2026-10-22

[Review/evidence index](docs/reviews/2026-10-22/follow-up/README.md). All seven follow-up PRs are merged. [Deployment and live verification record](docs/reviews/2026-10-22/follow-up/deployment.md); current web deployment status is recorded in [#18](https://github.com/calcuttin/Project-Kaizen/issues/18).

| Scope | Implementation | Remaining |
| --- | --- | --- |
| #4 and #8: task states and accessibility | #29: distinct empty/filter/completed states, board keyboard actions, habit labels/targets, measured contrast | Full screen-reader and physical-device/zoom validation for #8 |
| #5–7: search and habits | #30: area grouping, workspace/lens checks, scoring explanation and boundary/edit/archive tests | Complete |
| #9–11: first actions, mobile Feed, backups | #31: explicit reading goals, manual Studio setup, queue-first Feed, More navigation, weekly reminder and separate reset | Complete |
| #12: initial loading | #32: 17.7% less initial JS in the measured device-mode profile; reproducible evidence and size budget | Complete; no live-cloud performance claim |
| #16: recurring tasks | #33: daily/weekly/monthly repeats with retained history and duplicate protection | Complete |
| #18: release/security | #28: verified container/edge checks and live table/storage isolation; #34: confirmed stale-session deletion fix | Deletion guard deployed and verified; broader CSP and operational backup/abuse checks remain |

#2, #3 and #14 are complete. All seven follow-up PRs retain AI-assisted attribution and evidence limits. Bases merged before their dependent PRs: #29 before #30, #32 before #33, and #28 before #34. Live GitHub issue bodies record current deployment and checklist status.

## Remaining checks — 2026-10-22

[Fresh evidence and accessibility fixes](docs/reviews/2026-10-22/remaining-checks/README.md) cover task-list keyboard activation, selected states and dialog focus. Live auth/sync, cover lookup and import-worker preview passed; Clerk abuse settings and bounded rejection checks were inspected. #8 retains spoken screen-reader and physical-device/actual-zoom verification. #18 retains complete CSP/camera/custom-domain and data-service throttling coverage. Hosted backup/recovery work is deferred at the maintainer’s request; no physical device is available for the remaining mobile checks. Current fix/deployment status is recorded in the issues.

## Scanner, throttled sync and native zoom — 2026-10-22

[Review and evidence](docs/reviews/2026-10-22/resilience/README.md): scanner cancellation/error cleanup and client HTTP 429 cooldown/retry fixes are tracked in #18. Native Safari 200% task creation, keyboard editor opening, scrolling and return focus were verified for #8. Full spoken screen-reader, native 400%/physical-device coverage, real camera/custom-domain checks and server-enforced quotas remain open. Client cooldown is not server-side abuse prevention. Hosted backup/recovery remains deferred. The issues record PR and deployment status.

## September 2026 application review

Tracking issue: [#1 — September 2026 AI-assisted application review](https://github.com/calcuttin/Project-Kaizen/issues/1).

Source: [REV-2026-09-08-APP — report and screenshots](docs/reviews/2026-09-08/review.md).

Codex inspected the application, reproduced selected behaviors, reviewed source, and ran local checks. The maintainer requested the review and authorized publication. Independent human reproduction of the findings is not yet recorded. The table below preserves the original work items. The October progress table above and linked issues record implementation progress; publication alone does not mean a change is merged or live.

| Priority | Work item | Review evidence | Tracking |
| --- | --- | --- | --- |
| P1 | Validate quick-add dates and recover gracefully from route errors | Step 3 | [#2](https://github.com/calcuttin/Project-Kaizen/issues/2) |
| P1 | Keep keyboard focus inside the command palette and restore Escape behavior | Step 6 | [#3](https://github.com/calcuttin/Project-Kaizen/issues/3) |
| P2 | Show a completed-task empty state and make Show done consistent across views | Step 2 | [#4](https://github.com/calcuttin/Project-Kaizen/issues/4) |
| P2 | Find existing workspace records through global search | Step 6 | [#5](https://github.com/calcuttin/Project-Kaizen/issues/5) |
| P2 | Make habit consistency account for tracking start and weekly targets | Step 4 | [#6](https://github.com/calcuttin/Project-Kaizen/issues/6) |
| P2 | Edit and archive habits without losing their history | Step 4 | [#7](https://github.com/calcuttin/Project-Kaizen/issues/7) |
| P2 | Make project filters, task board cards, and habit controls accessible | Steps 2, 4, 6 | [#8](https://github.com/calcuttin/Project-Kaizen/issues/8) |
| P2 | Prioritize useful first actions on Today, Library, and Studio | Steps 1, 5, 7 | [#9](https://github.com/calcuttin/Project-Kaizen/issues/9) |
| P2 | Put the Feed queue before empty statistics on phones | Step 8 | [#10](https://github.com/calcuttin/Project-Kaizen/issues/10) |
| P3 | Add a dismissible backup reminder and separate destructive settings | Step 9 | [#11](https://github.com/calcuttin/Project-Kaizen/issues/11) |
| P3 | Measure initial loading and split route-specific JavaScript | Engineering verification | [#12](https://github.com/calcuttin/Project-Kaizen/issues/12) |

## Priorities and status

- **P1:** core reliability and accessibility barriers.
- **P2:** everyday workflow, discovery, and usability.
- **P3:** lower urgency improvements and measured optimization.

Issue state is authoritative for current progress. Priorities indicate intended order; they are not deadlines. The tracking issue links each finding, and implementation PRs should link to the issues they address.

## Contribute and verify

Use an existing issue before creating a duplicate. Reproduce it against the recorded revision or explain how current behavior differs. Include the issue/review ID in a proposed fix, state any AI assistance, and attach relevant test or interaction evidence.

A finding is complete when its acceptance criteria are met and the implementation and verification are linked publicly. If the evidence is wrong or the design changes, record the correction in the issue and append a follow-up to the original review.
