#!/usr/bin/env bash
set -e

git add -A
git commit -m "Deploy ReqRadar v3.0.1 hotfix"
git push origin main
