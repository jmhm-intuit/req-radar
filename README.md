# ReqRadar v1.7.0

ReqRadar is a static, browser-based job search prioritization workspace designed for GitHub Pages.

## Highlights

- Bulk PDF/TXT requisition upload
- Duplicate prevention
- Resume-based Skills Fit
- Interest Fit and job-age recommendations
- Networking workflow
- Manual ranking controls
- Status filters and pagination for 30+ jobs
- Manual backup import/export for device sync
- Direct recruiting-page and job-requisition links

## Data and privacy

ReqRadar stores data in the browser's localStorage. Nothing is uploaded to GitHub or a server. Use **Sync devices** to download a JSON backup and import it into another browser.

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

The included workflow deploys `dist/` after pushes to `main`. The Vite base path is `/req-radar/`.
