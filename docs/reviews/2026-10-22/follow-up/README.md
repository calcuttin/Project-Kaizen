# Roadmap follow-up index — 2026-10-22

AI-assisted implementation and validation at the maintainer's request. This index connects the September and October reviews to the proposed fixes. **These PRs are not merged.** Links target their published branches so evidence is readable before merge.

| PR | Issues | Evidence |
| --- | --- | --- |
| [#28](https://github.com/calcuttin/Project-Kaizen/pull/28) | #18 | [Release checks and live account isolation](https://github.com/calcuttin/Project-Kaizen/blob/codex/release-verification/docs/reviews/2026-10-22/follow-up/release-verification.md) |
| [#29](https://github.com/calcuttin/Project-Kaizen/pull/29) | #4, #8 | [Task states, keyboard controls and contrast](https://github.com/calcuttin/Project-Kaizen/blob/codex/task-accessibility/docs/reviews/2026-10-22/follow-up/tasks-accessibility.md) |
| [#30](https://github.com/calcuttin/Project-Kaizen/pull/30) | #5–7 | [Saved search and habit scoring/editing](https://github.com/calcuttin/Project-Kaizen/blob/codex/search-habit-followup/docs/reviews/2026-10-22/follow-up/search-habits.md) |
| [#31](https://github.com/calcuttin/Project-Kaizen/pull/31) | #9–11 | [Onboarding, mobile Feed and backups](https://github.com/calcuttin/Project-Kaizen/blob/codex/onboarding-backups/docs/reviews/2026-10-22/follow-up/onboarding-backups.md) |
| [#32](https://github.com/calcuttin/Project-Kaizen/pull/32) | #12 | [Initial loading measurements and budget](https://github.com/calcuttin/Project-Kaizen/blob/codex/initial-load/docs/reviews/2026-10-22/follow-up/initial-load.md) |
| [#33](https://github.com/calcuttin/Project-Kaizen/pull/33) | #16 | [Recurring tasks and retained history](https://github.com/calcuttin/Project-Kaizen/blob/codex/recurring-tasks/docs/reviews/2026-10-22/follow-up/recurring-tasks.md) |
| [#34](https://github.com/calcuttin/Project-Kaizen/pull/34) | #18 | [Reproduced stale-session deletion gap and fix](https://github.com/calcuttin/Project-Kaizen/blob/codex/account-deletion-fence/docs/reviews/2026-10-22/follow-up/account-deletion.md) |

## Review order and evidence limits

- #30 builds on #29; #33 builds on #32; #34 builds on #28. Review and merge each base before its dependent PR, then retarget the dependent PR to main if GitHub does not do so automatically. #31 is independent.
- The first six PR branches combined locally without conflicts: 70 unit tests, 30 device browser tests, one mocked cloud-isolation test, production/bundle checks, schema fingerprint and public-source checks passed. Combined initial JavaScript was 176,936 gzip bytes against a 190,000-byte budget. The later deletion PR passed 109 database assertions and an actual concurrent-transaction check in GitHub CI.
- Live disposable-account checks passed for all 21 entity tables and nested storage isolation. Eight competing writes produced one acceptance/seven conflicts; three identical retries retained their original outcome. Test accounts and records were cleaned.
- A separate live test reproduced a stale-token write after deletion; #34 addresses it. Apply that migration before deploying its edge function and verify it live before claiming the protection is deployed.
- #8 still needs full operating-system screen-reader and physical-device/zoom verification. #18 still needs broader CSP feature coverage, deployed revision/protection verification, and provider backup/restore and abuse-limit evidence. Local/mocked checks do not establish those results.

Public search terms: REV-2026-09-08-APP, REV-2026-10-22-SECURITY-PRODUCT, account deletion, stale token, concurrency, onboarding, backup reminder, recurring tasks, initial load, keyboard, contrast. Independent human validation is not claimed.
