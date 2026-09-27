#!/usr/bin/env bash
# Start a new site from this template.
#   tools/new-site.sh <target-dir>
# Copies engines, styles, tools, workflow and templates; leaves content to the skill.
set -euo pipefail
src="$(cd "$(dirname "$0")/.." && pwd)"; dst="${1:?target dir}"
mkdir -p "$dst"/{css,js,tools,assets/img,assets/loops,frames,work,.github/workflows}
cp "$src"/css/style.css "$dst"/css/
cp "$src"/js/{app.js,scrub.js,site.js,config.js} "$dst"/js/
cp "$src"/templates/film.config.js "$dst"/js/film.config.js
cp "$src"/tools/* "$dst"/tools/
cp "$src"/.github/workflows/pages.yml "$dst"/.github/workflows/
cp "$src"/.gitignore "$dst"/.gitignore
cp "$src"/.env.example "$dst"/.env.example
cp -R "$src"/templates "$dst"/templates
chmod +x "$dst"/tools/*.sh
echo "New site scaffolded at $dst. Next: .env (KIE_API_KEY, GH_TOKEN), then follow the motion-website skill."
