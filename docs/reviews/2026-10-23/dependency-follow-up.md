# Dependency and remaining-issue follow-up — 2026-10-23

Review ID: **REV-2026-10-23-DEPENDENCIES**. Base: `de49cf4cdf011b9c283081f02b5ec94f5e67b7e0` (deployed PR #38). Tracks roadmap [#1](https://github.com/calcuttin/Project-Kaizen/issues/1), accessibility [#8](https://github.com/calcuttin/Project-Kaizen/issues/8), and security/release [#18](https://github.com/calcuttin/Project-Kaizen/issues/18).

The maintainer requested review of remaining issues and dependency PRs, safe fixes, and roadmap updates. Codex inspected all eight open dependency PRs and tested a combined candidate. Independent human validation is not claimed. Publication does not mean these updates are merged or deployed; the linked issues record current status.

## Dependency disposition

| Existing PR | Result in this follow-up |
| --- | --- |
| #20: setup-node | Upgrade to v7, pinned to verified upstream commit `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| #21: checkout | Upgrade to v7, pinned to verified upstream commit `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| #22: pnpm action | Upgrade to v6, pinned to verified upstream commit `0977fd99725f1db4007ccb2928dbb4e90d06cc86` |
| #23: development tools | Playwright 1.64.1, plugin-react 6.1.2, fake-indexeddb 6.2.6, marked 18.1.1, Supabase CLI 2.121.0, Vite 8.3.5 and Vitest 5.0.5; use Node 24 typings 24.19.2 instead of Node 26 typings |
| #24: React 19 | Leave open: the combined React 19.3.1 candidate with matching React/DOM 19.3.0 types exceeded the initial-load budget |
| #25: Lucide | Declared compatible range updated; lockfile resolves 1.61.0 |
| #26: nanoid | 6.0.2 |
| #27: React Router | 7.18.4 |

All eight existing PRs had passing individual checks at inspection time. They predated the final combined update and are not proof of combined compatibility. Existing PRs remain open until the replacement is merged; #24 requires separate performance work.

The three updated Actions use Node 24 internally, verified from their upstream action metadata. The application/test runtime remains Node 24. Supabase CLI is aligned between the package dependency and database CI; the edge SDK and hosted database are unchanged. Compatible ranges selected newer Vite/Lucide versions than the older PRs; their upstream release notes were inspected. Lockfile versions, not only manifest ranges, were tested.

Future Dependabot changes group React, React DOM and both type packages together. Routine development-tool groups include minor/patch versions, leaving major tooling updates as separate PRs. Node type major upgrades are ignored until the actual runtime is upgraded; Node 24 minor/patch updates remain eligible. The security-monitoring features enabled earlier remain active.

## React 19 performance gate

The React 19 candidate passed TypeScript, the production build and all 89 unit tests, but initial Today JavaScript measured **201,247 gzip bytes**, exceeding the existing **190,000-byte** budget. With the same tooling/runtime-package updates and React 18 restored, it measured **178,639 bytes**. The limit was not raised. React and both type packages are retained at their prior 18.x versions in this follow-up. Revisit #24 with loading/performance work and matching React DOM typings; no React 19 deployment or complete browser certification is claimed.

## Browser-test reliability fixes

An unrelated local Python server occupied port 5180. The old device test configuration silently reused it and received 404 responses. Test servers now bind to loopback, always start their own instance, and accept validated `KAIZEN_E2E_PORT` / `KAIZEN_CLOUD_E2E_PORT` overrides. Device mode and bundled-import settings are explicit. Validation used unused ports 5187/5188; the unrelated server was not modified.

The updated browser exposed assumptions in reload tests: visible optimistic state was treated as proof of an IndexedDB commit. Tests now read committed browser storage before deliberately replacing the document, and still assert rehydrated values afterward. No fixed sleeps or suppressed assertions were added. The habit keyboard test also waits for its saving dialog to close before focusing a background control, matching the actual modal interaction. These are test synchronization fixes, not a claim that closing a browser during an unfinished write is lossless.

## Verification and limits

The retained dependency set passed 89 unit tests, all 34 device-browser tests, both mocked-cloud browser tests, the production/TypeScript build, schema fingerprint, targeted public-source checks, and dependency audit (zero known advisories). The initial bundle is below the unchanged budget. CI, container/database and CodeQL results are recorded in the PR and roadmap issues.

This pass does not establish live production auth or physical-device behavior. The remaining #8 criteria need full spoken screen-reader and physical-device/broader zoom checks; no physical device is available. #18 still needs real camera and production custom-auth-domain/CSP verification plus production server-enforced quotas. Client retry handling and passing CI do not establish those controls.

**Hosted backup/recovery remains deferred at the maintainer's explicit request.** No backup destination, recovery project, restore, paid plan or hosted schema change was created. No remaining acceptance criterion is checked off solely because dependencies were updated.

References: [React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide), [Vitest migration guide](https://vitest.dev/guide/migration/), [Dependabot grouping and ignore rules](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference), [checkout v7](https://github.com/actions/checkout/releases/tag/v7.0.0), [setup-node v7](https://github.com/actions/setup-node/releases/tag/v7.0.0), [pnpm action v6](https://github.com/pnpm/action-setup/releases/tag/v6.0.0), [Vite 8.3.5](https://github.com/vitejs/vite/releases/tag/v8.3.5), [Lucide 1.61.0](https://github.com/lucide-icons/lucide/releases/tag/1.61.0).

Search terms: dependency PR, React 19, bundle budget, Node typings, Playwright, IndexedDB, modal focus, test port, Supabase CLI, pinned Actions, deferred recovery.
