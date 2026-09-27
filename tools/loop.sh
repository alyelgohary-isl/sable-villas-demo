#!/usr/bin/env bash
# Encode a Kling clip as a small muted background loop for the site.
#   tools/loop.sh in.mp4 out.mp4 [width]
# H.264, no audio, faststart, yuv420p so Safari/iOS autoplay it inline.
set -euo pipefail
in="$1"; out="$2"; w="${3:-1280}"
ffmpeg -v error -y -i "$in" -an -vf "scale=$w:-2:flags=lanczos" \
  -c:v libx264 -profile:v high -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart "$out"
echo "$out $(du -h "$out" | cut -f1)"
