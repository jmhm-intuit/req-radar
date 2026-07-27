#!/usr/bin/env bash
set -e

git add -A
git commit -m "Deploy ReqRadar v1.7"
git push origin main
