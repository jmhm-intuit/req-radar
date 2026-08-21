# ReqRadar v3.2.0 — Evidence-Based Fit Navigator

## Evidence architecture

- Added a Candidate Evidence Graph organized by competency family.
- Added manual accomplishment evidence to resume-derived competencies.
- Added behavioral proficiency, evidence confidence, and candidate review controls.
- Preserved the distinction between missing evidence and absence of a capability.
- Improved semantic adjacency matching for manually entered and resume-derived competency names.

## Job Success Profile

- Converts each posting into outcomes, recurring responsibilities, context, scope, technical mode, and a visual workprint.
- Separates stated information, strong inferences, and unknowns.
- Classifies requirements by centrality, expected proficiency, criticality, and learnability.

## Match Ledger

- Links every material job requirement to posting evidence and candidate evidence.
- Adds Proven, Transferable, Partial, Developmental gap, Not demonstrated, Critical blocker, Unknown, and Not relevant classifications.
- Adds match confidence and explanations.
- Supports manual per-role classification overrides.

## Technical-scope assessment

- Separates technical environment, technical fluency, and hands-on technical execution.
- Applies out-of-scope treatment only when hands-on execution is central and comparable evidence is insufficient.
- Prevents AI transformation and technical business roles from being treated like software-builder roles merely because they reference technology.

## Fit Signature and decision model

- Separates Scope, Readiness, Attraction, Career Direction, Viability, and Evidence Confidence.
- Adds independent Scope and Recommended Action labels.
- Applies gates before blended ranking.
- Adds ranking robustness and sensitivity explanations.
- Keeps unknown information as uncertainty rather than silently lowering fit.

## Portfolio intelligence

- Replaces the crowded default matrix with an evidence-based Fit Portfolio.
- Adds hierarchical Competency Heatmap.
- Adds Portfolio Demand view to identify recurring strengths, transferable areas, and blockers.
- Adds side-by-side comparison for two to five roles.
- Adds workprint and responsibility comparisons.
- Preserves General Theme Discovery, Role-Specific Discovery, focus navigation, role families, and workflow tracking.

## Compatibility

- Preserves jobs, resume evidence, profile skills, discovery responses, statuses, rankings, notes, links, networking data, and manual overrides from previous versions.
- Backup schema v7 remains compatible with earlier ReqRadar backup imports.
- Analysis cache signatures include engine version 3.2.0 so outdated v3.1 assessments are refreshed safely.
- No resume, internal job PDF, personal data, or credentials are included in the deployment package.
