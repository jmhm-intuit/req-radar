# ReqRadar v3.1.0 — Dual Discovery & Portfolio Navigator

## Faster assessment structure

- Replaced `updatedAt`-based assessment invalidation with content and profile signatures.
- Status, pinning, notes, links, and other workflow-only changes reuse cached analysis.
- Debounced browser-storage writes for jobs, profile, and settings.
- Preserved cached results while stale roles refresh in short asynchronous batches.
- Reused prepared role scenarios across the General Theme baseline and Role Discovery synthesis.
- Kept similar-role comparisons lazy so they run only when opened.

## Layer 1: General Theme Discovery

- Detects common work themes across the current opportunity portfolio.
- Grounds each theme in representative responsibilities from multiple uploaded job descriptions.
- Captures interest reaction, preferred frequency, confidence, contextual conditions, and reflection.
- Produces a reusable General Theme Profile and Portfolio Theme Alignment score.
- Keeps AI/technology adoption separate from hands-on technical execution.

## Layer 2: Role-Specific Discovery

- Uses the General Theme Profile as the baseline for every role.
- Shows a transparent role-specific adjustment from -20 to +20.
- Limits normal role sessions to the three to five questions most likely to change the decision.
- Keeps role responses attached to that role rather than automatically rewriting global preferences.
- Preserves Role Reality Preview, plausible week, scenario reflection, and networking hypotheses.

## Focus Navigator

- Adds explainable smart focus buckets for navigating 20–50 opportunities.
- Adds quick views for Focus now, Needs discovery, Needs networking, Too old, Too technical, Not interested, and All roles.
- Adds grouping by focus bucket, role family, status, posting age, Interest Fit, Capability Fit, and networking stage.
- Collapses lower-priority categories by default.
- Renders ten roles per group initially with progressive expansion.
- Separates technical capability gaps from low interest in hands-on technical work.
- Supports manual focus-bucket overrides from the role detail panel.

## Compatibility

- Preserves existing jobs, resume evidence, skills, role discovery sessions, rankings, statuses, links, notes, and networking data.
- Imports backups from earlier ReqRadar versions and normalizes the new settings and focus fields.
- Backup schema v6 includes General Theme preferences and Focus Navigator settings.
- No user resume or internal job description is included in the deployment package.
