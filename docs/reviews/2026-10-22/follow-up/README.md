# Roadmap follow-up index — 2026-10-22

AI-assisted implementation and validation at the maintainer's request. This index connects the September and October reviews to the merged fixes. **All seven PRs merged after their checks passed.** Evidence links below resolve within the merged review archive. See the [deployment record](deployment.md) for live backend checks and the release revision; [#18](https://github.com/calcuttin/Project-Kaizen/issues/18) records current web deployment status.

| PR | Issues | Evidence |
| --- | --- | --- |
| [#28](https://github.com/calcuttin/Project-Kaizen/pull/28) | #18 | [Release checks and live account isolation](release-verification.md) |
| [#29](https://github.com/calcuttin/Project-Kaizen/pull/29) | #4, #8 | [Task states, keyboard controls and contrast](tasks-accessibility.md) |
| [#30](https://github.com/calcuttin/Project-Kaizen/pull/30) | #5–7 | [Saved search and habit scoring/editing](search-habits.md) |
| [#31](https://github.com/calcuttin/Project-Kaizen/pull/31) | #9–11 | [Onboarding, mobile Feed and backups](onboarding-backups.md) |
| [#32](https://github.com/calcuttin/Project-Kaizen/pull/32) | #12 | [Initial loading measurements and budget](initial-load.md) |
| [#33](https://github.com/calcuttin/Project-Kaizen/pull/33) | #16 | [Recurring tasks and retained history](recurring-tasks.md) |
| [#34](https://github.com/calcuttin/Project-Kaizen/pull/34) | #18 | [Reproduced stale-session deletion gap and fix](account-deletion.md) |

## Merge order and evidence limits

- Merged in order: #28, #29, #32, #31, #34, #30, #33. Dependent PRs were retargeted to main after their bases merged; all checks passed before each merge.
- The first six PR branches combined locally without conflicts: 70 unit tests, 30 device browser tests, one mocked cloud-isolation test, production/bundle checks, schema fingerprint and public-source checks passed. Combined initial JavaScript was 176,936 gzip bytes against a 190,000-byte budget. The later deletion PR passed 109 database assertions and an actual concurrent-transaction check in GitHub CI.
- Live disposable-account checks passed for all 21 entity tables and nested storage isolation. Eight competing writes produced one acceptance/seven conflicts; three identical retries retained their original outcome. Test accounts and records were cleaned.
- A separate live test reproduced a stale-token write after deletion; #34 addresses it. Its database migration and edge function are now deployed in that order. Fresh disposable-account tests confirmed stale-token task/profile writes and storage uploads are denied, reads return no tasks, and deletion retries succeed. All fixture records/files were removed.
- #8 still needs full operating-system screen-reader and physical-device/zoom verification. #18 still needs broader CSP feature coverage, web deployment tracking, and provider backup/restore and abuse-limit evidence. Local/mocked checks do not establish those results.

Public search terms: REV-2026-09-08-APP, REV-2026-10-22-SECURITY-PRODUCT, account deletion, stale token, concurrency, onboarding, backup reminder, recurring tasks, initial load, keyboard, contrast. Independent human validation is not claimed.
