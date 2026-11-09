# November dependency and remaining-issue review

Review ID: **REV-2026-11-08-DEPENDENCIES**. AI-assisted review, implementation and verification by Codex at the maintainer's request. Baseline: `92d25921e6edde22c7913e9161d1d6f681ecb2e1`. Dates use America/New_York.

## Dependency disposition

| PR | Decision | Candidate |
| --- | --- | --- |
| #42 | Include | pnpm/action-setup 6.1.1, pinned to `73e46992e05b19abd31f2f3c20e0e7370d762115`; pnpm remains 11.19.0 |
| #44 | Include six compatible tooling updates | Playwright 1.65.0, Vite 8.3.6, React plugin 6.2.1, Vitest 5.1.0, fake-indexeddb 6.2.7, marked 18.1.3 |
| #45 | Include | Lucide React 1.69.0 |
| #46 | Include | React Router DOM 7.18.5 |
| #43 | Keep separate | React/React DOM 19.3.1 and matching types fail the existing initial-JavaScript budget. Its CI measured 201,188 gzip bytes against the unchanged 190,000-byte ceiling. React 18 remains in this candidate. |

The four included PR diffs were combined against current main and installed with the frozen lockfile. No unrelated version refresh or major runtime upgrade was added. Their PRs remain open until the combined candidate merges; publication alone does not supersede them.

## Database CI failure and fix

The failed database job in #45 stopped during `supabase start`, before pgTAP or deletion-concurrency assertions: the mail service could not bind host port 54324. Its other database run passed. [Failed run](https://github.com/calcuttin/Project-Kaizen/actions/runs/42555746257).

CI now starts Supabase with `--exclude mailpit`, the supported mail-service exclusion in pinned CLI 2.121.0. The database suites do not send email. This avoids the unnecessary mail UI port binding while retaining database startup, migration reset, all pgTAP tests, and the actual concurrent-transaction deletion check. Local development configuration and hosted provider settings are unchanged. The fresh candidate's GitHub checks are the validation gate for this workflow change.

## Verification

- Node 24.22.1 and pnpm 11.19.0; frozen install succeeded in an isolated source snapshot so the separate local Bookshelf/iPhone prototypes and their dependencies were untouched.
- Type checking and all **101 unit tests** passed.
- All **34 device-mode browser tests** and **2 mocked-cloud browser tests** passed using updated Playwright/Chromium. These include keyboard task controls, selected state, focus return, habit labels, narrow layouts, measured contrast, account isolation, and HTTP 429 retry.
- Production build, schema fingerprint, targeted public-source scan, and whitespace checks passed.
- Initial Today JavaScript: **180,052 gzip bytes**, below the unchanged **190,000-byte** budget. This is the existing device-mode build measurement, not a live-cloud load-time claim.
- Registry audit: **zero advisories**. GitHub open Dependabot, CodeQL and secret-scanning alert lists each returned zero at review time. A targeted source scan and empty alert lists do not establish complete historical secret-scan coverage.
- Runtime changes are not merged or deployed by this review. The PR and issue updates record current CI/publication status.

## Remaining roadmap

- **#8:** implementation and automated checks continue to pass; full spoken OS screen-reader navigation and physical-device/broader native zoom coverage remain unverified. The maintainer previously reported no physical device available. No unavailable manual check is marked complete.
- **#18:** reopened after it closed at the #47 documentation merge. Its real-camera, intended production auth-domain/CSP and server-enforced data-service quota criteria remain unfinished. Reopening corrects tracking status; it is not new evidence of a production regression.
- **Hosted backup/recovery remains deferred at the maintainer's request.** No restore, recovery resource, hosted migration, or paid-plan change was performed.
- **#1:** remains the parent roadmap. Original dated review evidence is retained.

Upstream references: [pnpm action 6.1.1](https://github.com/pnpm/action-setup/releases/tag/v6.1.1), [Vite 8.3.6](https://github.com/vitejs/vite/releases/tag/v8.3.6), [React Router 7.18.5](https://github.com/remix-run/react-router/releases/tag/react-router%407.18.5), [Supabase service exclusions](https://supabase.com/docs/reference/cli/supabase-start). [React 19 failing bundle gate](https://github.com/calcuttin/Project-Kaizen/actions/runs/42555623273).
