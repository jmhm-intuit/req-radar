# ReqRadar v1.5.0

ReqRadar is a browser-based workspace for uploading, analyzing, comparing, and tracking job requisitions.

## Live site

After the GitHub Pages workflow completes:

`https://jmhm-intuit.github.io/req-radar/`

## What is included in v1.5.0

- The app version is visible in the sidebar and desktop header.
- Change a requisition status directly from the main dashboard table.
- Status changes are saved immediately in browser storage and confirmed with a notification.
- Upload PDF or TXT job postings, or paste a job description.
- Extract common requisition fields in the browser.
- Detect exact duplicates by Job ID and SHA-256 source fingerprint.
- Compare titles, skills, category, team, hiring manager, seniority, and location.
- Track New, Pursuing, Maybe, Not pursuing, and Applied statuses.
- Search, filter, edit notes, and delete requisitions.
- Export and import a JSON backup.
- Load an optional fictional demo portfolio.
- Responsive layout for phones and computers.
- Automatic deployment to GitHub Pages after a push to `main`.

## Privacy and storage

This GitHub Pages version has no backend. PDF parsing and duplicate checks run in the browser. Requisition data is saved in `localStorage` for the current browser profile.

The original uploaded PDF is not stored. ReqRadar keeps the extracted text, metadata, file name, and SHA-256 fingerprint. Use **Export backup** to move data between devices or browsers.

Do not commit confidential job files to the public GitHub repository. Upload them only through the running application, where they are processed locally.

## GitHub Pages configuration

The repository must use:

`Settings → Pages → Build and deployment → Source: GitHub Actions`

The included workflow builds the Vite application and publishes the `dist` directory after each push to `main`. The Vite production base is `/req-radar/`, matching the repository URL.

## Local development

Requirements:

- Node.js 20 or newer
- npm

```bash
npm ci
npm run dev
```

Production check:

```bash
npm run build
npm run preview
```

## Release version

The version is read from the `version` field in `package.json` during the Vite build and displayed automatically in the interface.

## Static-version limitations

- Data does not synchronize between devices unless you export and import a backup.
- There is no authentication or shared database.
- There are no secure server-side AI calls.
- Scanned PDFs require OCR, which is not included.
- Field extraction is rules-based and should be reviewed before saving.
