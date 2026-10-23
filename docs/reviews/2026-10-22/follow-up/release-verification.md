# Release verification follow-up — issue #18

AI-assisted implementation and verification by Codex, requested by the maintainer on 2026-10-22. Baseline: `9545fe19f7fdbe213db8c64e15f13408da5bd0c0`. This is evidence for the checks listed here, not a security certification.

## Repeatable checks

- `Release verification` builds the Docker image, runs `nginx -t`, and checks document, hashed JavaScript, SPA deep-link and missing-asset responses. It verifies security headers (including report-only CSP) and document/asset cache behavior. CI runs these checks because Docker is unavailable on this workstation.
- The Docker cloud build now accepts `VITE_CLERK_PUBLISHABLE_KEY` as well as the Supabase public configuration. These are public browser configuration values; never pass service-role or Clerk secret keys to the build.
- The deletion edge function has an isolated Deno configuration and frozen lockfile covering the resolved dependency graph. CI type-checks and audits it. To deliberately refresh the graph, run `deno check --frozen=false index.ts` in its directory, review the lock diff, then rerun `deno task check` and `deno task audit`.
- `node scripts/check-release-http.mjs https://your-deployment.example` checks public deployment responses without authentication. Add `--container` when checking the nginx image locally to assert its 404/cache behavior.

## Evidence

- Deno 2.9.8: edge type check passed; dependency audit reported no known vulnerabilities. Lifecycle scripts were not enabled.
- Read-only HTTP checks passed against the documented evaluation deployment, `https://project-kaizen-gamma.vercel.app`, for the root document, hashed script and `/tasks` deep link.
- The new container and edge jobs passed on GitHub. An independent database run failed while resolving the latest CLI release due to an unauthenticated GitHub rate limit. CI now uses setup-cli v3 with the fixed npm-published CLI 2.116.0, matching the application tool version.
- The existing main CI passed after a retry of a Microsoft package-server 403; no application failure caused that run's installation error.

## Live development verification

After the maintainer reactivated the paused backend, the documented evaluation deployment passed a two-account check using newly created disposable Clerk development users and synthetic records:

- All 21 entity tables: account B could not read, insert as, update, or delete account A's records. Account A's payloads remained intact.
- Nested import-artifact storage: cross-account read and upload were denied.
- The deployed deletion endpoint returned success for each disposable account. Account B's nested file remained accessible after account A was deleted, then account B was also deleted.

No pre-existing account was changed. Fixture identifiers, credentials, and tokens are excluded from this public record. These checks establish the tested boundaries, not deletion under concurrent writes or a complete production readiness assessment.

## Remaining verification

Controlled concurrent sync passed: eight same-record writers produced one acceptance and seven conflicts; three identical retries retained revision one. A separate live test reproduced a stale-token write after deletion; see [the deletion follow-up](account-deletion.md). Verification of that new protection after deployment, CSP feature compatibility, and operational rate-limit/backup configuration need separate evidence. Header presence does not establish that every sign-in/import/camera path is compatible with enforcement. CSP stays report-only for those broader restrictions. Use disposable development accounts and synthetic data; do not test against another person's records.

The linked Clerk application has a development instance; no production instance is configured. Credentials and fixture identities stay outside this public record. Cloud-provider backup and abuse controls must be verified by an operator with the relevant access.

Reference: [Deno dependency audit](https://docs.deno.com/runtime/reference/cli/audit/) checks the resolved lockfile; frontend pnpm auditing alone does not cover edge imports.

Read-only provider metadata showed the development project as active/healthy after reactivation. Its backup response reported point-in-time recovery disabled and no listed backup records. No restore was attempted and no provider configuration was changed. This does not establish backup coverage; the operator must choose and verify a recovery method before a production-readiness claim.
