# Questline 4.2 Migration Guide

Questline 4.2 reads the Version 4.1 browser store and earlier supported stores. The earlier payload remains in its original storage key and Questline also creates the normal migration backup.

Migration preserves:

- Task IDs, titles, categories, parents, workstreams, exploration-thread links, checklists, dates, original dates, date history, progress, completion, Rank inputs, stars, areas, notes, duplicate markers, archive state, and Trash state
- Project and Exploration IDs, workstreams, investigation entries, milestones, Ideas, and Next Moves
- Habit definitions, opportunities, actual outcomes, recurrence, cycle history, and priority settings
- Reviews, notes, Inbox records, calendar snapshots, quiet areas, badges, recurring achievements, and tombstones

## New Task fields

Version 4.2 adds `destinationHistory` when a Task moves between Resolve, Project, Exploration, or Renew/Fun. Existing Tasks begin with an empty destination history.

## Review snapshots

When Questline opens, completed prior weeks and months with available Activity history receive an automatic summary if one does not already exist. Existing manual reviews are retained.

## Review counting

Version 4.2 recalculates Review from source records. It does not migrate contradictory display totals from earlier versions.

Export JSON or Excel before extended testing on personal data.
