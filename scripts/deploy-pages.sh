#!/usr/bin/env bash
# 把 web/ 发布到 gh-pages 分支（GitHub Pages 的发布源）。
# 用法：bash scripts/deploy-pages.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
BRANCH="${1:-gh-pages}"

rm -rf .pages-build
mkdir .pages-build
cp -a web/. .pages-build/
rm -f .pages-build/DEPLOY.md
touch .pages-build/.nojekyll

cd .pages-build
git init -q
git add -A
git commit -q -m "pages: build from web/ @ $(date '+%Y-%m-%d %H:%M')"
git push -f "$(cd "$ROOT" && git remote get-url origin)" "HEAD:${BRANCH}"
cd "$ROOT"
rm -rf .pages-build
echo "→ 已更新 ${BRANCH}，Pages 会在一分钟内重新构建"
