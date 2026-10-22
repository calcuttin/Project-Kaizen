# Fixes following REV-2026-10-22-SECURITY-PRODUCT

Proposed for review on `codex/security-product-fixes`, based on `95f552d`. AI-assisted implementation and verification by Codex, authorized by the maintainer. This records implementation evidence, not independent human approval. The maintainer authorized publication of this branch and the review to GitHub. The changes have not been merged or deployed.

## Implemented

| Review finding | Change | Verification |
| --- | --- | --- |
| S1: development advisories | Vite 8.2.4, Vitest 4.1.12, source-map-js 1.2.2; weekly dependency audit workflow and Dependabot configuration. Edge function imports pinned to Supabase JS 2.115.0 and Clerk backend 2.33.8. | Frontend dependency audit: zero advisories, including development dependencies. [Saved result](dependency-audit.json). |
| S2 / #2: dates and recovery | Impossible dates stay in quick-add text with an explanation; large relative dates cannot overflow. Task store and backup/sync validation reject invalid dates. Legacy date formatting is defensive. Router failures expose recovery download, Settings, and reload. | Calendar/restore/store/atomic sync tests; invalid-date browser test and [screenshot](01-date-validation.png). |
| S3: habit targets | Positive finite targets and 1–7 days per week enforced. Malformed legacy habits remain editable with an explanation and disabled logging controls on Health. Streak traversal stops at missing data/creation and has an upper bound. | Store tests for zero, negative and non-finite targets; browser test for disabled Add habit. |
| S4: cover privacy | Cancels waiting/in-flight cover searches when consent changes or the workspace locks/changes. Checks owner and consent immediately before transmission. | Fake-timer tests confirm queued work does not transmit and active requests are aborted; existing cover retry browser test still passes. |
| S5: imports | 5 MB / 1,000-record limit, worker parsing, cancellation, file read errors, stale-result protection, and indexed book matching. | CSV/Kindle browser imports and parsing/matching tests. |
| S5: headers | Equivalent headers for nginx and Vercel; broader CSP introduced in report-only mode. | Configuration inspected and production build passed; live enforcement remains a deployment step. |
| #3: palette keyboard | Native modal dialog, inert background, Escape and trigger focus restoration; combobox/listbox semantics and selected-result scrolling. | Browser regression and manual Shift+Tab → Escape check. |
| #4: completed tasks | “All caught up” with Show completed; Board honors Show done. | Browser regression. |
| #5: record search | Saved tasks, books, feed items and publishing pieces appear before creation actions; selection opens the record. | Search ordering unit test; browser test opens the saved task; [screenshot](02-record-search.png). |
| #6–7: habits | Score excludes days before local creation date; weekly-frequency habits use target progress rather than a daily streak. Edit, archive, restore, preserved logs, and larger labeled day controls. Save confirmation waits for browser persistence. | Unit tests and create → log → edit → archive → restore → reload browser test. |
| #9: Today | Task capture precedes a collapsed setup checklist. | Updated checklist/navigation tests and [current layout](03-today.png). |
| #12: loading | Today, Health, Library, Studio and Settings pages load on demand; data stores still register eagerly for backup and sync. | Production build and route/browser tests. |

## Results and practical limits

- **58 unit tests passed** across 18 files. Targeted parsing/matching checks also passed after the final matching adjustment.
- **20 browser tests passed**, including all existing device workflows and three new review regressions.
- **1 mocked cloud account-isolation browser test passed.** This does not verify the deployed Clerk/Supabase environment.
- Type checking/production build, schema fingerprint, targeted public-source scan and diff whitespace checks passed.
- Main JS chunk decreased from **822.03 kB to 664.26 kB** (about 19%); gzip decreased from **238.13 kB to 191.96 kB**. Shared and route chunks are separate, so this is a main-chunk comparison, not a measured total-transfer or page-speed improvement. The 500 kB build warning remains. Deferred screens need to have been loaded/cached before they can open offline.

## Deployment follow-up

- Review, merge, and verify deployment before treating these fixes as live. Scheduled checks become active after merge. Roadmap issues remain open while acceptance and deployment verification are pending.
- CSP remains **report-only** for script/connect/font/frame restrictions. Validate sign-in, Supabase requests, optional covers, Google fonts, import workers and camera features against the actual deployment. Add any custom Clerk/auth domains before enforcing it. Violations are visible in browser developer tools; no remote reporting endpoint was configured. Existing frame/object/base restrictions remain enforced.
- Docker and Deno executables were unavailable in this workspace. nginx configuration and exact edge imports were edited, but a container build, Deno type check and edge dependency-graph audit were not run. Pinned top-level edge imports do not pin every transitive dependency.
- Real two-account database/storage policy checks, concurrent sync conflict handling, account deletion during active sync, and operational rate-limit/backup checks remain separate controlled-environment work. No live users or production data were modified.
- Recurring tasks (#16), the remaining mobile Feed refinements (#10), backup reminder UX (#11), and broader accessibility work (#8) are roadmap features beyond the confirmed fixes implemented here.

The original [review](../review.md) remains a dated record. These changes are ready for code review and deployment verification; they are not a security certification.
