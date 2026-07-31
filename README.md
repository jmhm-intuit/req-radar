# ReqRadar v3.1.0

ReqRadar is a local-first career portfolio and opportunity-discovery application designed for GitHub Pages.

Version 3.1 introduces **Dual Discovery & Portfolio Navigator**: a faster structure that learns broad work preferences once, reuses them across the portfolio, and asks role-specific questions only when a responsibility or uncertainty could materially change the decision.

## What is new in v3.1.0

### General Theme Discovery

ReqRadar now identifies responsibilities and work patterns that recur across the uploaded opportunities. The applicant can reflect on common themes using real examples from the current job descriptions, including:

- Strategy and problem framing
- Transformation and operating-model design
- Executive influence
- Direct people leadership
- Building systems versus running recurring cadence
- Analytical intensity
- AI and technology adoption
- Hands-on technical execution

Each theme records interest, confidence, preferred frequency, contextual conditions, and supporting reflection. These answers form a reusable baseline Interest Fit across relevant roles.

### Role-Specific Discovery

Opening one opportunity starts a separate, shorter discovery layer. The baseline from General Theme Discovery is shown beside a bounded role-specific adjustment. The applicant sees the responsibilities, work mix, leadership model, and uncertainties that are distinctive to that role.

Role-specific answers remain attached to the role. They no longer rewrite the global preference profile after every response.

### Focus Navigator for 20–50 opportunities

The opportunity inventory is organized into explainable focus buckets:

- Ready to pursue
- Needs role discovery
- Needs networking
- High-interest stretch
- Capable but not compelling
- Too technical right now
- Not interested enough
- Too old — verify active
- Critical blocker
- Not pursuing / closed

The list can also be grouped by role family, status, posting age, Interest Fit, Capability Fit, or networking stage. Lower-priority groups are collapsed by default and each group initially renders only ten roles.

### Performance improvements

- Analytical cache keys now use job content and relevant profile evidence rather than `updatedAt`.
- Status, notes, pinning, and other workflow changes no longer force a full portfolio reassessment.
- Job, profile, and settings writes are debounced rather than saving on every keystroke.
- Cached assessments remain visible while only stale jobs refresh in small asynchronous batches.
- Role scenarios are generated once per job assessment and reused by the interest layers.
- Similar-role comparisons remain deferred until the comparison workspace is opened.

## Core capabilities

- Upload multiple PDF/TXT job requisitions in one batch.
- Upload a resume and create evidence-backed skills with supporting excerpts.
- Compare Capability Fit, Interest Fit, Career Direction Fit, and Practical Viability separately.
- Group roles by recurring themes and role families.
- Filter, rank, pin, and change job status from the main inventory.
- Record networking hypotheses, contacts, and learnings.
- Export/import the complete portfolio as JSON for manual device sync.
- Store recruiting-page and optional job-requisition links.

## Privacy model

ReqRadar runs entirely in the browser. Resume text, job descriptions, preferences, discovery responses, and notes are stored locally; they are not committed to GitHub or sent to a server. Use the JSON backup to move data between devices.

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

The included GitHub Actions workflow installs dependencies, builds `dist/`, and deploys after a push to `main`. Vite uses `/req-radar/` as the production base path.
