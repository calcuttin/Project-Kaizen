# Account deletion write guard — #18

AI-assisted source review and controlled live reproduction on 2026-10-22. Only a newly created disposable development account and synthetic records were used. No pre-existing account was modified.

## Confirmed behavior

The deployed endpoint returned successful deletion, but the disposable user's still-valid test JWT could immediately insert a new task for the same subject (HTTP 201). A second cleanup sweep removed the synthetic record; the fixture identity was already deleted. The test token had a one-hour expiry to avoid harness expiry during verification. This demonstrates the valid-token window; it does not assert a one-hour production session lifetime or cross-account access.

Separately, eight simultaneous same-record sync writes produced one acceptance and seven conflicts, and three simultaneous identical retries retained the same revision-one result. The existing profile upsert serializes those sync transactions. Both accounts used for that check were deleted.

## Fix

A private subject tombstone is written before file/database cleanup. Authenticated writes take a shared transaction lock for their subject; beginning deletion takes its exclusive counterpart, waiting for in-flight writes. After the fence commits, a trigger rejects late writes even when their outer statement started before the fence. Restrictive policies hide remaining records/files from that session. The service role retains cleanup access. Client roles cannot create a fence or inspect the private tombstone table.

The deletion endpoint stops if it cannot establish the fence, leaves the fence in place if cleanup needs retry, and treats an already-deleted Clerk identity as successful cleanup. Minimal subject + request-time tombstones remain privately to prevent old sessions from recreating data; no content, email, or token is retained there.

## Deployment and verification

Apply `202610220004_account_deletion_fence.sql` before deploying the updated deletion function. Deploy both before marking this protection live. An interrupted deletion intentionally leaves the account unable to read/write application data until cleanup is retried; do not remove its fence as a routine retry step.

Local type checking, database-type fingerprint, public-source check, and Deno edge check passed. New database tests cover role restrictions, all 25 guarded tables (24 application tables + storage), old-token read/write/sync denial, cleanup retries, and another account's continued access. A separate local-only concurrency script holds an active write, queues deletion and a later write, and verifies the later statement is rejected after the fence. These database checks run in GitHub CI because Docker is unavailable on this workstation; their results must pass before merge.

This PR does not deploy the migration or edge function to the live backend. Broader CSP, provider backup/restore, abuse limits, and independent screen-reader validation remain separate release criteria.
