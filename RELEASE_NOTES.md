# ReqRadar v4.0.0 — Career Portfolio Navigator

## Major product redesign

Version 4 changes ReqRadar from a dense role-scoring interface into a guided career-portfolio workflow.

The app now follows this sequence:

```text
Ground in experience
→ understand work preferences
→ see opportunity families
→ choose a shortlist
→ activate application tracking
```

## Candidate baseline

- Resume remains the primary source of capability evidence.
- The app checks whether enough evidence has been reviewed before presenting reliable rankings.
- Resume accomplishment reflections distinguish achievement from enjoyment.
- Work themes are organized into career anchors, capability traps, development paths, and unresolved themes.
- Preliminary results are clearly labeled when confidence is insufficient.

## Opportunity landscape

- Active roles are summarized in a maximum of seven primary work families.
- Families are based on responsibilities and work patterns, not title alone.
- Family-level fit keeps Experience, Interest, Career Direction, Viability, and Confidence separate.
- Common responsibilities, repeated strengths, recurring concerns, scope patterns, and top roles are visible inside each family.
- Individual roles are ranked within comparable families instead of one global list.

## Portfolio decisions

New independent decision states:

- Inbox
- Explore
- Shortlist
- Pursue
- Monitor
- Not pursuing

Legacy statuses remain available for compatibility, but decision state now controls the portfolio journey.

## Application Navigator

New application stages:

- Validate role
- Networking
- Preparing
- Applied
- Recruiter conversation
- Interviewing
- Offer
- Closed

Application tracking begins only after a role is moved to Pursue. Each role supports a next action, due date, application notes, and recent activity.

## Navigation and mobile experience

- New primary navigation: Home, My work profile, Opportunity landscape, Shortlist, Application pipeline, and Library.
- Mobile bottom navigation focuses on Home, Profile, Landscape, Shortlist, and Pipeline.
- Advanced role tables, competency heatmaps, demand analysis, and multi-role comparison are moved to Library.
- The home screen adapts to candidate-baseline progress, portfolio structure, shortlist state, and active applications.

## Upload and change awareness

- Multi-file uploads continue to detect duplicates.
- New roles report the work family they joined.
- Home shows roles added since the last portfolio review.
- Users can mark the portfolio reviewed to reset the new-role count.

## Compatibility and storage

- Backup schema version: 9.
- Existing v1–v3 data is normalized into the v4 model.
- New decision and application data is included in manual device-sync backups.
- All data remains in browser storage.

## Performance

- Analytical cache signature updated to 4.0.0.
- Status, decision, application, notes, and workflow changes remain outside the heavy analytical signature unless they materially affect fit.
- Job analysis runs in short asynchronous chunks.
- Large advanced views are opened only from Library.
