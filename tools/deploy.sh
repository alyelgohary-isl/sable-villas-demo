#!/usr/bin/env bash
# Publish the site to GitHub Pages.
#   tools/deploy.sh <owner> <repo> [public|private]
# Needs either `gh` logged in, or GH_TOKEN (a token with repo + admin rights) in the environment / .env.
# What it does: relativizes URLs, creates the repo if missing, commits, pushes main,
# enables Pages with the Actions workflow, waits for the first deploy and prints the URL.
set -euo pipefail
owner="${1:?owner}"; repo="${2:?repo}"; vis="${3:-public}"
root="$(cd "$(dirname "$0")/.." && pwd)"; cd "$root"
[ -f .env ] && export $(grep -E '^GH_TOKEN=' .env | xargs) 2>/dev/null || true

api() { # method path [json]
  if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
    if [ -n "${3:-}" ]; then echo "$3" | gh api -X "$1" "$2" --input - ; else gh api -X "$1" "$2"; fi
  else
    [ -n "${GH_TOKEN:-}" ] || { echo "Need gh (logged in) or GH_TOKEN"; exit 1; }
    curl -sS -X "$1" -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
      "https://api.github.com$2" ${3:+-d "$3"}
  fi
}

python3 tools/relativize.py >/dev/null
[ -d .git ] || git init -q -b main
git add -A && git commit -qm "Deploy $(date +%F)" || true

if ! api GET "/repos/$owner/$repo" >/dev/null 2>&1 | grep -q '"id"'; then
  priv=$([ "$vis" = private ] && echo true || echo false)
  api POST "/user/repos" "{\"name\":\"$repo\",\"private\":$priv,\"has_issues\":false,\"has_wiki\":false}" >/dev/null || \
  api POST "/orgs/$owner/repos" "{\"name\":\"$repo\",\"private\":$priv}" >/dev/null || true
fi
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$owner/$repo.git"
git push -u origin main

# Pages via the Actions workflow (idempotent)
api POST "/repos/$owner/$repo/pages" '{"build_type":"workflow"}' >/dev/null 2>&1 || \
api PUT  "/repos/$owner/$repo/pages" '{"build_type":"workflow"}' >/dev/null 2>&1 || true

url="https://$owner.github.io/$repo/"
echo "Waiting for the first Pages deploy…"
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$url")
  [ "$code" = 200 ] && { echo "Live: $url"; exit 0; }
  sleep 15
done
echo "Pushed. Pages not yet answering at $url — check the Actions tab: https://github.com/$owner/$repo/actions"
