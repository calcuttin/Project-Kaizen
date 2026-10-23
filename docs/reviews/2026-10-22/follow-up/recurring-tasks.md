# Recurring tasks — #16

AI-assisted implementation and automated validation, 2026-10-22. Built on the shared task editor from the loading PR.

## Behavior

Create a task normally, open its editor, and choose Daily, Weekly, or Monthly under Repeat. An undated task starts from today. Completing it through the checkbox, editor status, or board creates one next task and retains the completed occurrence. New tasks retain title, notes, project, domain, tags and step titles; completed steps reset. Scheduled work dates do not carry over.

The due-date schedule determines the next date strictly after both the prior due date and completion day. Missed dates are skipped rather than generating a backlog. Monthly schedules retain the original day and clamp to the end of shorter months (January 31 → February 28 → March 31).

Choose Does not repeat on the current occurrence to stop the series; clearing its due date also stops it. Reopening an older completed occurrence does not generate a second successor. Deleting the successor does not cause an old occurrence to recreate it. The editor explains where to change a series that has already advanced. This first version has no custom intervals, end dates, or ahead-of-time calendar expansion.

## Persistence and verification

Recurring metadata travels with the task through the existing generic sync and backup format; no database schema change is required. New successors use stable series/occurrence identities and revision zero, so they do not inherit a parent's cloud revision. Divergent concurrent edits still use existing conflict handling; this is not a claim of live multi-device transactional verification.

64 unit tests passed, including missed dates, weekly boundaries, DST-adjacent local dates, leap years/month ends, each completion path, reopening/deletion duplicate protection, stable two-device identities, backup restore, and malformed recurring backup rejection. Eight task/review browser checks passed, including a new weekly-repeat → reload → stop → retained-history workflow. Production/type checking build and the initial JS budget passed (about 176 kB gzip against a 190 kB budget).
