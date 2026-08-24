# ReqRadar v4.0.0 — Career Portfolio Navigator

ReqRadar is a local-first web app for turning a large, changing list of job requisitions into a small number of understandable career paths, a focused shortlist, and an actionable application pipeline.

## Product journey

```text
Resume and past experiences
→ capability evidence and experience reflection
→ work-theme profile
→ opportunity families
→ shortlist and role-specific discovery
→ active application pipeline
```

## What is new in v4.0.0

### Candidate baseline before ranking

ReqRadar now establishes a minimum candidate baseline before treating role rankings as reliable:

1. Resume uploaded
2. Experience evidence reviewed
3. At least two resume accomplishments reflected on
4. Work themes calibrated

Until the baseline is ready, family and role results are labeled preliminary and the app prioritizes the next discovery action rather than presenting false precision.

### Resume evidence and enjoyment remain separate

The resume establishes what the candidate has demonstrated. Experience reflection asks which parts of an accomplishment were energizing, how often the candidate wants to repeat them, and which conditions or drains shaped the experience.

This supports distinctions such as:

```text
Capability: Strong operating-model design evidence
Interest: High when building the model
Condition: Lower when repeatedly administering the cadence
```

### Opportunity families before individual roles

Active roles are organized into a maximum of seven primary work families based on responsibilities, work design, leadership mode, functional context, and technical depth. Each family shows:

- Experience Fit
- Interest Fit
- Career Direction Fit
- Evidence confidence
- Common work
- Repeated strengths
- Recurring concerns
- Best roles within the family

### Portfolio decisions and shortlist

Every role has a decision state independent from its analytical fit:

- Inbox
- Explore
- Shortlist
- Pursue
- Monitor
- Not pursuing

This prevents every uploaded role from immediately becoming an application.

### Application Navigator

Application tracking activates only after a role is deliberately moved to **Pursue**. The pipeline includes:

- Validate role
- Networking
- Preparing
- Applied
- Recruiter conversation
- Interviewing
- Offer
- Closed

Each active role has one visible next action, optional due date, and application notes.

### Mobile-first hierarchy

The five primary mobile destinations are:

- Home
- Profile
- Landscape
- Shortlist
- Pipeline

The dense fit table, competency heatmap, portfolio demand ledger, and multi-role comparison remain available under **Library** as advanced views rather than controlling the primary experience.

### Backward compatibility

Existing v1–v3 jobs, resume data, evidence, interest discovery, notes, links, networking data, statuses, rankings, and backups are migrated locally. Older statuses are translated into the new decision and application states.

## Data and privacy

ReqRadar runs entirely in the browser and stores data locally. Resume text and job descriptions are not uploaded to GitHub by the application. Use the built-in JSON backup to move data between browsers or devices.

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## GitHub Pages

The Vite production base is `/req-radar/`. The included GitHub Actions workflow builds and deploys the `dist` directory when changes are pushed to `main`.

Live site:

```text
https://jmhm-intuit.github.io/req-radar/
```

## Deployment package

The deployment ZIP contains a root-level `deploy.sh`. After uploading the ZIP to the Codespace:

```bash
cd /workspaces/req-radar

git pull --rebase origin main

unzip -p req-radar-v4.0.0-deploy.zip deploy.sh \
  > /tmp/deploy-req-radar-v4.0.0.sh

chmod +x /tmp/deploy-req-radar-v4.0.0.sh

/tmp/deploy-req-radar-v4.0.0.sh \
  req-radar-v4.0.0-deploy.zip
```
