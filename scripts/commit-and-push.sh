#!/usr/bin/env bash
set -e

git add -A

if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "Deploy ReqRadar v1.6"
fi

git branch -M main
git push origin main

echo ""
echo "GitHub Actions will publish the site after the workflow completes:"
echo "https://jmhm-intuit.github.io/req-radar/"
