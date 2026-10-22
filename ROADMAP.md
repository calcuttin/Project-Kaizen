# Public roadmap

Kaizen's roadmap connects public reviews to actionable issues, implementation pull requests, and validation evidence.

[Review archive](docs/reviews/README.md) · [Open roadmap issues](https://github.com/calcuttin/Project-Kaizen/issues?q=is%3Aissue%20is%3Aopen%20label%3Aroadmap) · [AI-assisted work](https://github.com/calcuttin/Project-Kaizen/issues?q=is%3Aissue%20label%3Aai-assisted)

## October 2026 security and product fixes

Implementation: [PR #17](https://github.com/calcuttin/Project-Kaizen/pull/17) · Release verification: [tracker #18](https://github.com/calcuttin/Project-Kaizen/issues/18).

Source: [REV-2026-10-22-SECURITY-PRODUCT](docs/reviews/2026-10-22/review.md) · [Implementation, screenshots, and verification](docs/reviews/2026-10-22/fixes/README.md).

The maintainer authorized Codex to implement and publish this work. The implementation merged in PR #17 on 2026-10-22. Deployment verification is tracked separately in #18. Independent human validation is not recorded. Existing issue acceptance checklists remain open until their full scope is verified.

| Scope | Progress in this change | Remaining verification or work |
| --- | --- | --- |
| Dependency advisories, invalid dates/habit targets, cover privacy, import limits | Implemented with regression checks; frontend dependency audit reports zero advisories | Deployed environment and edge dependency graph verification |
| Browser security headers | nginx/Vercel parity and broader report-only CSP | Container validation, actual auth domains, deployed CSP compatibility before enforcement |
| #2–4: dates, palette keyboard, completed tasks | Implemented with unit/browser evidence | Review full issue acceptance criteria before closure |
| #5: saved-record search | Searches four areas; saved matches precede creation and open records | Complete per-area/lens/account-switch acceptance matrix |
| #6–7: habit scoring and edit/archive/restore | Implemented; history preservation and reload tested | Broader boundary cases and independent acceptance review |
| #8: accessibility | Larger labeled habit day controls with programmatic state | Board keyboard workflow, screen-reader/contrast/zoom audit (project filters already have native buttons) |
| #9: first actions | Today task capture precedes collapsed setup | Remaining Library/Studio onboarding and reading-goal work |
| #12: initial loading | Five pages load on demand; main chunk 822.03 → 664.26 kB | Constrained-device measurements, remaining shared imports, measured size budget |
| #10, #11, #16 | Remain planned | Mobile Feed, backup reminder/settings, recurring tasks |

Release follow-up: [repeatable container, edge and public HTTP checks](docs/reviews/2026-10-22/follow-up/release-verification.md).

Verification: **58 unit tests, 20 device browser tests, and 1 mocked cloud isolation browser test passed**, along with the production build, schema fingerprint and targeted public-source check. Mocked cloud tests do not establish deployed database/storage isolation. See the linked implementation record for limits and follow-up checks.

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
