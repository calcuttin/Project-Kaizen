# Public roadmap

Kaizen's roadmap connects public reviews to actionable issues, implementation pull requests, and validation evidence.

[Review archive](docs/reviews/README.md) · [Open roadmap issues](https://github.com/calcuttin/Project-Kaizen/issues?q=is%3Aissue%20is%3Aopen%20label%3Aroadmap) · [AI-assisted work](https://github.com/calcuttin/Project-Kaizen/issues?q=is%3Aissue%20label%3Aai-assisted)

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
