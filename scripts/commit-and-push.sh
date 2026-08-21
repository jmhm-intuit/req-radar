#!/usr/bin/env bash
set -Eeuo pipefail

git add -A
if git diff --cached --quiet; then
  echo "No new changes to commit."
else
  git commit -m "Deploy ReqRadar v3.2.0"
fi
git push origin main
