# Questline 4.2 Deployment

Repository: `jmhm-intuit/life-quest`

Pages source: GitHub Actions

Workflow: **Deploy Questline 4.2 to GitHub Pages**

Public URL: `https://jmhm-intuit.github.io/life-quest/`

Upload `life-quest-v4.2-deploy.zip` to the repository root and run:

```bash
cd life-quest

git pull --rebase origin main

unzip -p life-quest-v4.2-deploy.zip deploy.sh \
  > /tmp/deploy-life-quest-v4.2.sh

chmod +x /tmp/deploy-life-quest-v4.2.sh

/tmp/deploy-life-quest-v4.2.sh \
  life-quest-v4.2-deploy.zip
```

The script validates the package before replacement, preserves `.git`, commits `Deploy Questline v4.2.0`, pushes `main`, and triggers GitHub Pages.

After deployment, fully close and reopen the installed PWA. When an older version remains cached, open the browser site, refresh once, and relaunch the home-screen app.
