# ReqRadar v1.6.0

ReqRadar is a browser-based workspace for uploading, analyzing, comparing, and tracking job requisitions.

## Live site

After the GitHub Pages workflow completes:

`https://jmhm-intuit.github.io/req-radar/`

## What is included in v1.6.0

- Manual device synchronization through one JSON backup.
- Backup preview showing new, updated, unchanged, and conflicting requisitions.
- Merge mode that keeps the newest version of matching records.
- Replace mode that restores a backup exactly.
- Backward-compatible import for v1.5 backup files.
- Global recruiting-page shortcut configurable from the app.
- Optional direct URL for every job requisition.
- Open or add requisition links from the main dashboard and job list.
- Job links and app settings included in backups.
- Version number visible in the sidebar and desktop header.
- Status changes directly from the main dashboard.
- Upload PDF or TXT job postings, or paste a job description.
- Extract common requisition fields in the browser.
- Detect exact duplicates by Job ID and SHA-256 source fingerprint.
- Compare titles, skills, category, team, hiring manager, seniority, and location.
- Track New, Pursuing, Maybe, Not pursuing, and Applied statuses.
- Search, filter, edit notes, and delete requisitions.
- Optional fictional demo portfolio.
- Responsive layout for phones and computers.
- Automatic deployment to GitHub Pages after a push to `main`.

## Manual synchronization

1. Open **Sync data**.
2. Select **Download backup** on the device with the newest data.
3. Move the downloaded JSON file to the second device.
4. Open ReqRadar on that device and select **Upload backup**.
5. Review the preview and choose **Merge** or **Replace**.

ReqRadar identifies matching records by Job ID, source-file fingerprint, and internal record ID. Merge mode adds missing records and uses the record with the newest `updatedAt` timestamp.

## Recruiting links

Use **Link settings** to save one global recruiting-page URL. Each requisition also has an optional direct job URL, which can be added during upload, from the requisition list, or in the detail drawer.

## Privacy and storage

This GitHub Pages version has no backend. PDF parsing, duplicate checks, comparisons, links, and sync preparation run in the browser. Requisition data is saved in `localStorage` for the current browser profile.

The original uploaded PDF is not stored. ReqRadar keeps the extracted text, metadata, file name, and SHA-256 fingerprint. Use **Sync data** to move information between devices.

Do not commit confidential job files or exported backups to the public GitHub repository. Upload them only through the running application, where they are processed locally.

## GitHub Pages configuration

The repository must use:

`Settings → Pages → Build and deployment → Source: GitHub Actions`

The included workflow builds the Vite application and publishes the `dist` directory after each push to `main`. The Vite production base is `/req-radar/`, matching the repository URL.

## Local development

Requirements:

- Node.js 20 or newer
- npm

```bash
npm install
npm run dev
```

Production check:

```bash
npm run build
npm run preview
```

## Static-version limitations

- Synchronization is manual; there is no shared cloud database.
- There is no authentication.
- There are no secure server-side AI calls.
- Scanned PDFs require OCR, which is not included.
- Field extraction is rules-based and should be reviewed before saving.
