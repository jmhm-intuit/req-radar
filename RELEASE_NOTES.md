# ReqRadar v2.0.0

## Career evidence foundation

- Resume upload now creates evidence-backed skills instead of a flat keyword list.
- Skills include category, estimated proficiency, evidence confidence, resume excerpts, confirmation, and exclusion controls.
- Legacy v1.7 skill lists are migrated into confirmed profile skills.

## Interest and career direction

- Added a ten-question career coaching interview using forced trade-offs.
- Added a configurable work-preference model across strategy, transformation, AI, leadership, ambiguity, autonomy, variety, recurring operations, and other dimensions.
- Added peak-experience capture with theme detection and confirmation.
- Added possible future career directions such as AI Transformation Leader.

## Job intelligence

- Every job now receives a structured fingerprint: role family, archetype, themes, leadership model, requirements, and work signals.
- Capability Fit distinguishes proven, transferable, developmental gap, critical blocker, unknown, and not relevant.
- Interest Fit compares actual work-design signals with confirmed preferences; missing information remains unknown.
- Career Direction Fit evaluates whether a role advances a future direction the user wants to test.
- Viability remains separate and enforces the 90-day stale posting rule unless the role is verified active.
- Recommendation confidence and questions that could change the recommendation are visible.

## Portfolio organization

- Added dynamic role families and summaries of common themes, average fit, and repeated gaps.
- Strong secondary role-family matches are retained, so one opportunity can appear in more than one meaningful cluster.
- Added a Capability Fit × Interest Fit portfolio map.
- Added portfolio-level recurring strengths and common gaps.
- Retained filters, pagination, inline status changes, manual ranking, direct job links, bulk upload, duplicate checks, and device sync.

## Networking experiments

- Networking is no longer part of the fit score.
- Each role can hold a hypothesis, targeted questions, conversation notes, and learnings that may change the assessment.

## Compatibility

- Imports and migrates ReqRadar v1.5, v1.6, and v1.7 backups.
- Backup schema v4 includes the complete career profile and enriched role data.

## Reliability improvements

- Cleaned common internal-career-site navigation and icon artifacts before title extraction.
- Requirement and interest analysis now prioritizes the actual overview, responsibilities, and qualifications instead of footer or cookie text.
- Related-role detection now surfaces meaningful adjacency even when titles differ.
