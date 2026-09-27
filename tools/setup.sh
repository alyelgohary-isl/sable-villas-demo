#!/usr/bin/env bash
# One-time machine setup for the motion-site tools (macOS with Homebrew).
set -euo pipefail
command -v brew >/dev/null || { echo "Install Homebrew first: https://brew.sh"; exit 1; }
brew list ffmpeg >/dev/null 2>&1 || brew install ffmpeg
brew list webp   >/dev/null 2>&1 || brew install webp          # cwebp/dwebp
command -v node  >/dev/null || brew install node
python3 -c "import requests, PIL" 2>/dev/null || pip3 install --user requests pillow
# headless browser for QA screenshots (uses playwright-core + chromium headless shell)
npx --yes playwright@latest install chromium-headless-shell >/dev/null
node -e "require.resolve('playwright-core')" 2>/dev/null || npm install -g playwright-core >/dev/null
echo "ok: ffmpeg, cwebp, node, python deps, headless chromium"
