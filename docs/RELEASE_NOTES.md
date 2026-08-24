# Questline 4.2.0 Release Notes

Questline 4.2 is a focused usability and integrity release. It makes Tasks movable as their meaning changes and rebuilds Review around one trustworthy analytics pipeline.

## Task mobility

- Task categories are now Resolve, Project, Exploration, and Renew/Fun.
- Scheduling is a separate filter: All, Scheduled, Unscheduled, or Overdue.
- The Task action menu now includes **Change destination**.
- A Task can move from Resolve into a Project or Exploration, between Projects or Explorations, or detach back to Resolve or Renew/Fun.
- Project placement can include a workstream.
- Exploration placement can include an investigation thread.
- Destination changes preserve title, ID, checklist, dates, original-date history, progress, rank inputs, stars, areas, notes, and timestamps.
- Each move is retained in destination history.
- The date action is labeled Date or Replan and remains separate from destination changes.

## Compact Tasks

- Rank appears in a consistent compact position next to Star.
- Rank-descending ordering is used inside Task groups and Resolve lanes.
- Overdue treatment remains visually distinct from Rank.
- Task cards use less vertical space and keep the title dominant.

## Review integrity

- The recognition hero, Weekly Trend, Pace & Significance, Big Moves, Recovery Wins, and life-area cards use one canonical completed-Activity dataset.
- Week boundaries are consistent across all components.
- Rolling averages use only the historical periods that actually contain available history.
- Primary areas own progress; shared areas receive contribution without changing global totals.
- Recovery Hero assets resolve through the central asset registry.
- Broken-image placeholders are prevented by canonical asset references.

## Review presentation

- Review opens on Areas by default.
- Life-area cards use one compact evidence block instead of duplicate metric layouts.
- Strong Momentum and Needs Proactive Focus are easier to scan on mobile.
- Recovery Wins shows the first three records and an optional View All action.
- Safe-area padding prevents bottom navigation from covering Review content.

## Review history

- Weekly and monthly summaries are generated automatically after periods with completed Activity history.
- History can switch between Weeks and Months.
- Manual reflection remains optional.

## Technical

- Version: `4.2.0`
- Schema: `23`
- Storage key: `questline-v4-2`
- Migration begins with `questline-v4-1`
