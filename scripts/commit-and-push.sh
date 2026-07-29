#!/usr/bin/env bash
set -e

git add -A
git commit -m "Deploy ReqRadar v2.0"
git push origin main
