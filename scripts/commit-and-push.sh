#!/usr/bin/env bash
set -e

git add -A
git commit -m "Deploy ReqRadar v3.1.0"
git push origin main
