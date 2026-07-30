# ReqRadar v3.0.0

ReqRadar is a local-first career portfolio and opportunity-discovery application designed for GitHub Pages.

Version 3 introduces **Fit Discovery Studio**: an adaptive, scenario-based experience that helps an applicant imagine the real work behind a job description, connect it to past experience, uncover conditional preferences, and identify what must be validated through networking.

## Core capabilities

- Upload multiple PDF/TXT job requisitions in one batch.
- Upload a resume and create evidence-backed skills with supporting excerpts.
- Organize 30+ opportunities into role families and recurring work themes.
- Compare Capability Fit, Interest Fit, Career Direction Fit, and Practical Viability separately.
- Filter, sort, rank, pin, and change job status from the main inventory.
- Export/import the complete portfolio as JSON for manual device sync.
- Store recruiting-page and optional job-requisition links.

## Fit Discovery Studio

For each opportunity, ReqRadar now provides:

1. **Role Reality Preview** — responsibilities, stakeholders, impact model, work rhythm, success signals, and explicit unknowns.
2. **Plausible Week** — an evidence-linked visualization of what repeating the work could feel like.
3. **Adaptive Scenario Cards** — six to eight job-specific situations rather than a duplicated fixed questionnaire.
4. **Nuanced responses** — reaction, preferred frequency, confidence, “it depends” conditions, and reflection from past experience.
5. **Five-part fit synthesis** — work content, work design, leadership/social fit, career direction, and capability.
6. **Networking experiments** — hypotheses and questions that can confirm, disprove, or refine assumptions.

People leadership is decomposed into setting direction, coaching, delegation, performance management, hiring/team design, and people administration. Influence without authority, executive influence, and peer alignment are assessed separately.

Earlier Version 2 interest answers are retained as tentative evidence and refined through real job scenarios.

## Privacy model

ReqRadar runs entirely in the browser. Resume text, job descriptions, preferences, scenario responses, and notes are stored in `localStorage`; they are not committed to GitHub or sent to a server. Use the JSON backup to move data between devices.

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
