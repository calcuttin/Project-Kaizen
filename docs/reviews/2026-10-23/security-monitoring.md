# GitHub security monitoring — 2026-10-23

Review ID: **REV-2026-10-23-SECURITY-MONITORING**. Tracks [security roadmap #18](https://github.com/calcuttin/Project-Kaizen/issues/18) and [parent roadmap #1](https://github.com/calcuttin/Project-Kaizen/issues/1).

Reviewed application revision: `20d1afcd681e668f634c98c2d9ed0f81e1b5037d`, matching local and remote main. The maintainer explicitly requested enabling the protections, fixing confirmed scan findings, and updating the roadmap. Codex performed configuration and verification; independent human validation is not claimed.

## Enabled repository protections

- Dependabot vulnerability alerts: enabled; verified through the repository API.
- Dependabot security updates: enabled and not paused.
- Secret scanning: enabled.
- Secret scanning push protection: enabled.
- CodeQL: GitHub-managed default setup, default query suite, covering Actions and JavaScript/TypeScript. No duplicate workflow file is required.

These are live repository settings, independent of this documentation PR's merge status. Existing weekly frontend dependency audits and edge-function release audits remain in place. Non-provider-pattern and secret-validity scanning were not part of the requested configuration.

## Verification

Initial CodeQL setup run [39981232806](https://github.com/calcuttin/Project-Kaizen/actions/runs/39981232806) passed for both languages. Actions reported zero findings. JavaScript/TypeScript reported three findings, all marked high security severity by CodeQL:

| Alert | Finding | Correction |
| --- | --- | --- |
| [1](https://github.com/calcuttin/Project-Kaizen/security/code-scanning/1) | Kindle title/author regular expression can backtrack polynomially on crafted whitespace | Use a final-parenthesis index and a bounded suffix inspection instead of the ambiguous regular expression |
| [2](https://github.com/calcuttin/Project-Kaizen/security/code-scanning/2) | Kindle date expression has overlapping whitespace and content matches | Require the date content to start with a non-whitespace character |
| [3](https://github.com/calcuttin/Project-Kaizen/security/code-scanning/3) | Feed title decoding could turn `&amp;quot;` into a quote by decoding twice | Decode supported entities with a single replacement pass |

The findings establish inefficient parsing and incorrect entity decoding. They do not, by themselves, prove server denial of service or executable HTML injection: the import is client-side, and titles are rendered as React text. Regression tests cover 100,000-character whitespace runs, malformed dates, parenthesized title/author boundaries, and nested encoded entities. No alert was dismissed or suppressed to make the checks pass. Fix-branch analysis and merge/deployment status are tracked in #18.

Repository API checks confirmed CodeQL configured for Actions and JavaScript/TypeScript with a weekly schedule. Dependabot and secret-scanning alert lists were empty after enablement; counts remain a point-in-time observation.

The fix branch passed 88 unit tests, TypeScript checking, the production build, the initial bundle budget (177,713 gzip bytes against 190,000), and targeted public-source checks. CI and CodeQL results for the published fix revision belong in the linked PR and roadmap issue.

The preceding same-day local review found zero known advisories in the frontend dependency audit and in a fresh advisory lookup for all 23 locked edge npm dependencies. The installed dependency lock snapshot matched the repository. All 84 local unit tests and public response/header checks passed. The targeted tracked-source/history scan found no credential matches; it is not a comprehensive secret detector. The deployed revision's [edge audit](https://github.com/calcuttin/Project-Kaizen/actions/runs/39892028249) also reported no known vulnerabilities.

Secret-scanning alerts can be read, but the scan-history API returned `Advanced Security is disabled on this repository` (404) despite the repository API confirming secret scanning and push protection enabled. Historical scan completion therefore cannot be established through that endpoint. No paid feature or plan change was attempted. Empty alert lists describe the observation time, not proof that secrets or vulnerabilities cannot exist.

## Scope and remaining work

This is repository monitoring and a bounded code/dependency check, not a full penetration test, container-image vulnerability assessment, or verification of live provider limits. CodeQL's default suite does not certify all application behavior or database policies. Future alerts need triage; enabling monitoring does not resolve the remaining real-camera, production-auth-domain/CSP, server-quota or accessibility checks.

**Hosted backup/recovery remains deferred at the maintainer's explicit request.** No recovery resources, restore, paid plan, database migration or application deployment was needed for these repository settings. Issues #1, #8 and #18 retain their outstanding criteria.

References: [GitHub repository security quickstart](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository) and [CodeQL default setup](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning).

Search terms: Dependabot, security updates, secret scanning, push protection, CodeQL, Actions, JavaScript, TypeScript, security monitoring, deferred backup recovery.
