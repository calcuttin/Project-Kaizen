# Shared account: Full Kaizen and Bookshelf

AI-assisted implementation review, 2026-11-08.

Release follow-up: [both experiences on Vercel](2026-11-08/vercel-rollout.md). The observations below describe the initial implementation/private Sites review; the follow-up records subsequent audience, merge, hosting and verification changes.

## Behavior

- One Clerk account and the existing Supabase workspace support both experiences.
- Signup offers Full Kaizen or Bookshelf only; Settings allows switching anytime.
- The allowlisted `kaizenExperience` user metadata is a UI preference, never an authorization claim.
- Bookshelf shows Library, Reading, Journal and Settings. Switching retains all tasks, habits and books.
- Existing users without a preference receive the deployment default. An explicit saved preference applies on both sites.
- The standalone Site uses hash routing and the shared source, with Bookshelf as its default.
- Old browser-only prototype libraries remain untouched; signed-in users may explicitly review and copy them. Imports skip existing books and sample books by default.
- Account deletion still deletes the whole shared account, with explicit confirmation copy.

## Validation

- 101 unit tests passed, including account preference updates, metadata preservation, mismatched-owner rejection, route visibility, reading progress and idempotent prototype imports.
- Type checking and production builds passed for the main application and the standalone cloud/hash-routing deployment. The main initial bundle remains below the unchanged 190,000 gzip-byte budget.
- Browser checks verified switching in both directions retains a task and library, logging pages updates the journal, and the real Clerk Project-Kaizen sign-in modal loads with the existing public configuration.
- Reloading preserves the experience; direct task navigation redirects to Bookshelf, and Bookshelf search excludes task records. The reading page fits a measured 344 CSS-pixel viewport without horizontal overflow. This is browser resizing, not physical-device validation.
- Live sign-in, cross-origin synchronization and two-account isolation have not been exercised for this release. Existing ownership enforcement and database policies are reused without schema changes.

## Follow-up

- Verify an existing account on both deployments, then a new Bookshelf signup and return to Full Kaizen.
- The current Clerk application is a development instance. A production Clerk migration remains a separate release step.
- The Site retains its previously approved owner-private audience. Public signup requires an explicit audience change; Clerk sign-in and database ownership checks must remain enabled.
- Main Project Kaizen needs the shared feature branch deployed to show the same switch there.
- Choose a Bookshelf name separately. Native iPhone authentication/sync remains separate work.
- Physical-device assistive-technology testing remains pending. Backup/recovery remains deferred.
