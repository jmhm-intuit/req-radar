# Questline 4.2

Questline is a local-first, mobile-first personal planning PWA.

- Version: `4.2.0`
- Data schema: `23`
- Storage key: `questline-v4-2`
- Public deployment: `https://jmhm-intuit.github.io/life-quest/`

## Version 4.2 focus

- Tasks can change destination across Resolve, Project, Exploration, and Renew/Fun without losing dates, progress, checklists, stars, areas, or history.
- Scheduling state is filtered separately as All, Scheduled, Unscheduled, or Overdue.
- Compact Task rows keep Rank and Star in fixed positions and reduce list density.
- Review uses one canonical completed-Activity dataset for the hero, weekly trend, pace comparison, life-area summaries, Big Moves, and Recovery Wins.
- Review History is populated automatically from completed weekly and monthly periods.
- Recovery assets resolve through the application asset registry with no broken placeholders.
- Life-area cards use compact evidence, consistent totals, and mobile-safe layout.

Run locally with:

```bash
python run_local.py
```

Questline stores personal records in the current browser. Export JSON or Excel before major upgrades.
