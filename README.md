# ReqRadar v3.2.0

ReqRadar is a local-first career opportunity intelligence application designed for GitHub Pages. It helps a candidate understand what each role actually requires, connect those requirements to evidence from past experience, and prioritize a portfolio of 15–50 opportunities without reducing every decision to one opaque score.

Version 3.2 introduces the **Evidence-Based Fit Navigator**.

## What is new in v3.2.0

### Fit Signature

Every role now receives six separate outputs:

- **Scope** — In scope now, Credible stretch, Out of scope, or Insufficient evidence
- **Readiness** — how well reviewed experience evidence supports the role's day-one demands
- **Attraction** — how appealing the recurring work appears
- **Career direction** — whether the role supports a desired future direction
- **Viability** — whether the opportunity is current and practical
- **Evidence confidence** — how reliable the assessment is

The app also provides an action recommendation: Pursue, Explore, Hold, Do not pursue, or Verify active.

### Candidate Evidence Graph

Resume skills are organized into competency families and connected to specific evidence. Each competency can include:

- proficiency and confidence
- supporting resume excerpts
- manually added accomplishments
- candidate confirmation or exclusion
- multiple evidence items from different experiences

Missing resume evidence is labeled **Not demonstrated in the current profile**, rather than claiming the candidate does not possess the capability.

### Job Success Profile

Each job description is translated into:

- expected outcomes
- recurring responsibilities
- competency demands
- work context and scope
- technical mode
- a visual workprint showing the likely balance of work
- explicit unknowns that should be validated

### Match Ledger

Every material job requirement is paired with candidate evidence and classified as:

- Proven
- Transferable
- Partial
- Developmental gap
- Not demonstrated
- Critical blocker
- Unknown
- Not relevant

The ledger shows the posting evidence, expected proficiency, centrality, learnability, candidate evidence, confidence, and explanation. Every classification can be corrected manually.

### Technical-scope clarity

ReqRadar now distinguishes:

- a **technical environment**
- **technical fluency and decision-making**
- **hands-on technical execution**

A role is marked technically out of scope only when hands-on execution is central and comparable evidence is not demonstrated. Working with engineering or AI teams is not automatically treated as a technical blocker.

### Portfolio views for 15–50 roles

The primary two-by-two matrix has been replaced by more useful views:

- **Fit Portfolio** — a ranked Fit Signature table with scope and action filters
- **Competency Heatmap** — family-level comparison with drill-down to requirements and evidence
- **Portfolio Demand** — recurring market demands versus the candidate's evidence coverage
- **Compare Roles** — side-by-side comparison of two to five opportunities using fit signatures, workprints, responsibilities, common strengths, differentiators, and gaps

### Ranking quality

The app applies gates before ranking. Mandatory credentials and central hands-on technical blockers cannot be offset by a high interest score. It also indicates whether a recommendation is robust or sensitive to how readiness, interest, career direction, and viability are weighted.

## Existing capabilities retained

- Batch upload of PDF and TXT job requisitions
- Resume upload and evidence extraction
- General Theme Discovery and job-specific Fit Discovery
- Status, pinning, manual priority, score adjustments, and recommendation overrides
- Role grouping, networking notes, and learning hypotheses
- Duplicate detection
- JSON backup export/import for manual device sync
- Recruiting-page and job-requisition links
- Visible app version

## Privacy model

ReqRadar runs entirely in the browser. Resume text, job descriptions, notes, preferences, and assessments are stored locally on the current device. They are not committed to GitHub or sent to a server. Use the JSON backup to move data between devices.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## GitHub Pages

The included workflow installs dependencies, builds `dist/`, and publishes it after a push to `main`. Vite uses `/req-radar/` as the production base path.
