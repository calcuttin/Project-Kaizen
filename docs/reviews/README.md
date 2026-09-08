# Public review archive

Kaizen develops in the open. This archive records what was reviewed, what was observed, how AI contributed, what was actually verified, and which GitHub issues and pull requests follow from the findings.

[Project README](../../README.md) · [Roadmap](../../ROADMAP.md) · [Open roadmap issues](https://github.com/calcuttin/Project-Kaizen/issues?q=is%3Aissue%20is%3Aopen%20label%3Aroadmap) · [AI-assisted findings](https://github.com/calcuttin/Project-Kaizen/issues?q=is%3Aissue%20label%3Aai-assisted)

## Find a review

| Date | Review ID | Scope and searchable keywords | Evidence / attribution | Record |
| --- | --- | --- | --- | --- |
| 2026-09-08 | REV-2026-09-08-APP | Application UX, accessibility, Tasks, Today, Health, Library, Studio, Feed, Settings, date validation, keyboard, search, habits, mobile, backup, bundle size | Codex browser/source review with synthetic data; reproduction and verification limits recorded | [Application review and screenshots](2026-09-08/review.md) · [Tracker #1](https://github.com/calcuttin/Project-Kaizen/issues/1) |
| 2026-09-06 | Legacy security review | Account isolation, authentication, RLS, storage, imports, deployment, privacy | Historical record; see its own validation and boundaries; AI attribution not retroactively inferred | [Public-release and account-isolation review](../security/review-2026-09-06.md) |

The historical security review stays at its existing path to preserve links. Its statements describe the situation at the time of that review.

## Search

- GitHub issues: use `is:issue label:roadmap`, `is:issue label:ai-assisted`, or a review ID such as `REV-2026-09-08-APP`.
- Priorities: `is:issue is:open label:priority:P1` shows the most urgent review findings.
- Repository code search: `repo:calcuttin/Project-Kaizen path:docs/reviews keyboard`.
- Locally: `rg -n -i 'keyboard|search|habits' docs/reviews`.
- Every report records its date, revision, areas, keywords, attribution, and issue links. Search the report text as well as issue titles.

## Add the next review

1. Create `docs/reviews/YYYY-MM-DD/review.md` from [TEMPLATE.md](TEMPLATE.md). For multiple reviews on the same date, use a descriptive subfolder or filename.
2. Give it a stable ID: `REV-YYYY-MM-DD-SCOPE`. Record the exact revision and environment.
3. Separate reproduced defects, source-confirmed findings, visual observations, and proposals. State what was not tested.
4. Record AI and human contributions independently. Publication authorization is not the same as independent human reproduction. Do not imply human approval of technical conclusions without evidence.
5. Add numbered evidence files containing only synthetic or explicitly publication-approved data. Inspect the exact saved images before committing; remove machine-local paths and secrets from report text. Use relative image links and commit-pinned GitHub source links.
6. Create or reuse an actionable issue for each bounded fix. Include the review ID, evidence, acceptance criteria, and links back to the report. Use `roadmap`, `ai-assisted` when applicable, a type, and a priority label.
7. Add the report to the table above and link its tracking issue. Link implementation PRs and follow-up validation from the issues.
8. Publish through a pull request. Keep the original observations as a dated record; append corrections or follow-up evidence rather than silently rewriting history.

## Follow a finding to a fix

**Review → issue → implementation PR → validation evidence → issue closure.**

GitHub issues are the live source of implementation status. Roadmap priorities describe intended order, not deadlines or delivery promises. A passing test run is evidence only for the checks that actually ran.

Public review material is intended to make AI-assisted work inspectable and correctable by contributors. Sensitive security reports and private user data belong outside this public archive.
