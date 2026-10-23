# Merged release and live verification — 2026-10-22

AI-assisted implementation, deployment, and verification by Codex at the maintainer’s explicit request. Dates use America/New_York; provider records after midnight use 2026-10-23 UTC. Independent human validation is not claimed.

## Release source and checks

Application release: [`f9d1ef34654965bfb0ee20a156bfe6e7b0798c63`](https://github.com/calcuttin/Project-Kaizen/commit/f9d1ef34654965bfb0ee20a156bfe6e7b0798c63). PRs merged in dependency order: #28, #29, #32, #31, #34, #30, #33. Every PR’s checks passed before merging; dependent branches were retargeted after their bases merged. No check was bypassed.

The final merged revision passed [CI](https://github.com/calcuttin/Project-Kaizen/actions/runs/39881462499) and [release verification](https://github.com/calcuttin/Project-Kaizen/actions/runs/39881462322). Earlier combined verification recorded 70 unit tests, 30 device browser tests, mocked cloud isolation, production build, bundle budget, schema fingerprint and public-source checks. Database CI includes 109 assertions and concurrent-transaction deletion tests. See the [evidence index](README.md) for scope-specific reports.

## Backend deployment and live checks

The existing hosted database had the committed Clerk auth functions and all 24 application tables, but no migration-history ledger. Only the new additive `202610220004_account_deletion_fence.sql` was applied, inside a transaction with bounded statement/lock timeouts. Older initialization migrations were not replayed or marked as applied. Future migration automation must reconcile this existing ledger gap before a blanket migration push.

The updated `delete-account` edge function was deployed after the migration. Read-only inspection confirmed 25 restrictive policies and 25 write triggers across application tables and storage. Authenticated clients cannot access the private schema or invoke the service-only deletion fence.

Two newly created disposable Clerk development accounts exercised the deployed backend:

- All 21 entity-table read/insert/update/delete ownership boundaries passed.
- Nested storage cross-account reads and writes were denied. Account B’s file survived account A’s deletion.
- After deletion, each account’s still-valid test token received HTTP 403 when trying to recreate a task or profile, could not upload a file, and read no tasks.
- Repeating deletion with the same token returned successful cleanup.
- Both disposable identities were deleted. A privileged aggregate check found zero fixture rows across all 24 application tables and zero fixture files. Two minimal private deletion tombstones remain intentionally; fixture tokens were removed from the private harness manifest.

No pre-existing account was modified. These checks exercise development identities against the configured public deployment; they do not certify a separate production Clerk instance.

## Web deployment tracking

Target: [Project Kaizen](https://project-kaizen-gamma.vercel.app/). Public document, asset and `/tasks` deep-link responses passed the release HTTP/header smoke check. Vercel canceled the final application-revision build during the rapid merge sequence; an earlier merge completed. This documentation follow-up triggers a fresh deployment containing the entire merged release. Its final production revision, result, and smoke evidence are recorded in [release tracker #18](https://github.com/calcuttin/Project-Kaizen/issues/18), rather than treating the earlier smoke check as proof of the final revision.

## Roadmap disposition and remaining validation

Completed implementation: #4–7, #9–12, and #16. #8 remains open for full operating-system screen-reader and physical-device/zoom validation. #18 remains open for broader report-only CSP feature/custom-domain coverage, provider abuse limits, and backup/recovery evidence. Provider metadata did not establish backup coverage (PITR disabled; no backup list returned), and no restore drill was performed. The device backup reminder in #11 does not establish hosted recovery coverage.

Search terms: deployment, release verification, stale token, account deletion, RLS, storage isolation, migration history, AI-assisted development in the open.
