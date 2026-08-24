# Deploy Questline 4.2

Place `life-quest-v4.2-deploy.zip` in the root of the cloned `life-quest` repository and run:

```bash
cd life-quest

git pull --rebase origin main

unzip -p life-quest-v4.2-deploy.zip deploy.sh \
  > /tmp/deploy-life-quest-v4.2.sh

chmod +x /tmp/deploy-life-quest-v4.2.sh

/tmp/deploy-life-quest-v4.2.sh \
  life-quest-v4.2-deploy.zip
```

The script validates the archive before replacement, preserves `.git`, commits `Deploy Questline v4.2.0`, pushes `main`, and triggers GitHub Pages.

Public URL: `https://jmhm-intuit.github.io/life-quest/`
