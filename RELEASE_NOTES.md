# ReqRadar v3.0.1 — Startup Reliability Hotfix

## White-screen resolution

- Moved portfolio assessment work out of the first synchronous render and into short asynchronous batches.
- Reused each job fingerprint instead of rebuilding it repeatedly for every comparison.
- Deferred pairwise comparison work until the Similar Roles workspace is opened.
- Lazy-loaded PDF.js and its worker only when a PDF is selected.
- Added a nonwhite startup screen with progress messaging before React mounts.
- Added a top-level recovery screen for unexpected runtime errors.
- Added guarded local-storage writes so quota or browser-storage failures show an actionable warning rather than unmounting the app.
- Added recovery export and an explicit option to reset only ReqRadar browser data.

## Compatibility

- Preserves the v3.0 Fit Discovery Studio, all v2/v3 migrations, and the existing local-storage keys.
- Existing jobs, resume evidence, preferences, scenario responses, links, notes, rankings, and backups remain available.
- No user data is included in this deployment package.

---

# ReqRadar v3.0.0 — Fit Discovery Studio

## A deeper self-discovery experience

- Replaced the fixed, overlapping interest questionnaire with adaptive, job-specific scenarios.
- Added a dedicated Fit Discovery workspace and a full-screen discovery studio.
- Added question de-duplication through structured facets and one targeted scenario per facet.
- Added a visible “This feels repetitive” action that explains the distinction or lets the applicant skip it.

## Role Reality Preview

- Translates each job description into recurring responsibilities, key stakeholders, impact modes, likely work rhythm, and success signals.
- Separates **stated**, **strongly implied**, **possible interpretation**, and **unknown** information.
- Creates an evidence-linked “plausible week in the role” without presenting assumptions as facts.
- Preserves important unknowns rather than silently converting them into neutral scores.

## Scenario-based reflection

- Generates six to eight scenarios that reflect the actual role fingerprint.
- Captures whether work would be energizing, comfortable, tolerable, draining, avoided, or context-dependent.
- Captures desired frequency and confidence based on direct experience, related experience, estimate, or uncertainty.
- Supports conditional preferences such as team maturity, decision authority, manager quality, frequency, scale, and amount of administration.
- Connects reactions to peak career experiences and written reflection.

## More realistic leadership discovery

- Separates direct people management from influence without authority.
- Distinguishes setting direction, coaching, delegation, performance management, hiring/team design, people administration, executive influence, peer alignment, and organizational communication.
- Allows an applicant to discover that some aspects of leadership are energizing while others are draining or conditional.

## Fit synthesis and recommendations

- Adds Work Content, Work Design, and Leadership/Social Fit alongside Capability and Career Direction.
- Shows energizers, drains, conditions, contradictions, confidence, and unresolved questions.
- Blends scenario evidence into Interest Fit progressively; sparse discovery evidence does not overpower the job-description signals.
- Keeps recommendation, practical viability, user status, and next action separate.

## Networking as a learning loop

- Generates a job-specific hypothesis to test.
- Converts unknowns into targeted networking questions.
- Records whether an assumption was confirmed, disproved, nuanced, or remains unknown.
- Records whether interest increased, stayed the same, or decreased after learning more.

## Career profile evolution

- Adds an emerging preference profile grouped into energizers, conditional preferences, likely drains, and areas that need more evidence.
- Migrates Version 2 abstract interview answers as tentative rather than confirmed preferences.
- Updates the career profile gradually from scenario evidence instead of rewriting it after a single answer.

## Compatibility

- Preserves jobs, resume evidence, skill overrides, role groups, networking notes, ranking controls, statuses, and manual sync.
- Imports previous ReqRadar backups and normalizes missing Version 3 discovery fields.
- Backup schema v5 includes Fit Discovery sessions and the emerging preference profile.
