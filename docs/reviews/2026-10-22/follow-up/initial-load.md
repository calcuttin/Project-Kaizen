# Initial loading measurement — #12

AI-assisted measurement and implementation, 2026-10-22. Baseline main `9545fe1`; device mode, empty workspace. `pnpm build && pnpm measure:load` serves the production build with gzip, disables cache/service workers, then runs three fresh Chromium contexts at 390×844 with 4× CPU slowdown, 150ms latency, and 1.6Mbps download. This workstation profile is repeatable, not a physical-device benchmark. Fonts remain external and timings may vary.

| Median of three cold loads | Before | After |
| --- | ---: | ---: |
| Initial JavaScript, gzip bytes | 212,701 | 175,000 |
| First contentful paint | 1,524 ms | 1,344 ms |
| Today task field available | 1,785 ms | 1,614 ms |
| Script execution | 69.6 ms | 69.3 ms |
| Total main-thread task duration | 239.1 ms | 247.1 ms |

Raw runs: [before](load-before.json), [after](load-after.json). JavaScript transfer fell 17.7%; observed time to the Today field fell 9.6%. CPU work did not show a meaningful improvement. ScriptDuration is execution time, not an isolated parser measurement; TaskDuration includes other browser work. No claim about production user percentiles or authenticated cloud loading is made.

## Boundaries changed

Tasks and Feed navigation metadata now lazy-load their pages. Today imports only shared row/editor components instead of the full route pages. Clerk's provider and auth UI load through the cloud application boundary; device mode no longer downloads that code. Store registration remains eager for persistence, sync, search, and backups. Loading and recovery states remain available.

The largest minified chunk fell from roughly 664 kB to 370 kB without raising Vite's warning threshold. `pnpm check:bundle` totals the entry + Today static dependency graph, gzipped, and enforces 190,000 bytes (~9% headroom above this measurement). It runs after the build in CI; timing is deliberately not a CI threshold. Revisit the budget with measured evidence, not merely to silence a failure.

Verification: production build, 58 unit tests, 20 device browser regressions and the mocked cloud account-isolation test. Cloud behavior is regression-tested, but live authenticated performance is not measured here.
