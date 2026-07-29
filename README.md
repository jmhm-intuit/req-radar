# ReqRadar v2.0.0

ReqRadar is a local-first career portfolio intelligence application designed for GitHub Pages.

It helps you move from a list of job requisitions to a structured career decision portfolio:

- Upload multiple PDF/TXT job requisitions in one batch.
- Upload a resume and extract evidence-backed skills with supporting excerpts.
- Review, confirm, exclude, and adjust skill proficiency.
- Complete a guided interest and energy interview based on concrete career trade-offs.
- Capture peak experiences and recurring career themes.
- Define possible future career directions to test.
- Create a structured fingerprint for every job: role family, themes, leadership model, work design, and requirements.
- Group 30+ roles into meaningful, multi-label families.
- Compare Capability Fit, Interest Fit, Career Direction Fit, and Practical Viability separately.
- View the portfolio on a Capability Fit × Interest Fit map.
- Distinguish proven skills, transferable skills, developmental gaps, unknowns, and critical blockers.
- Use networking as a learning experiment rather than as points in the fit score.
- Preserve manual status, priority, ranking, recommendation overrides, and job links.
- Export/import a complete JSON backup to sync devices manually.

## Privacy model

ReqRadar runs entirely in the browser. Resume text, job descriptions, preferences, and notes are stored in `localStorage`; they are not committed to GitHub or sent to a server. Export a JSON backup to move the portfolio between devices.

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

The included GitHub Actions workflow builds `dist/` and deploys after pushes to `main`. Vite is configured with `/req-radar/` as the production base path.
