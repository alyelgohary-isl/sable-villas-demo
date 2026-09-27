#!/usr/bin/env bash
# Split an mp4 into 960x960 webp frames at the film's 12fps.
#   tools/frames.sh clip.mp4 outdir [prefix] [fps]
# Homebrew ffmpeg has no libwebp encoder, so we go via PNG + cwebp.
set -euo pipefail
in="$1"; out="$2"; prefix="${3:-frame_}"; fps="${4:-12}"
mkdir -p "$out"
tmp="$(mktemp -d)"
size="${SIZE:-960}"; q="${Q:-82}"
ffmpeg -v error -i "$in" -vf "fps=$fps,scale=$size:$size:flags=lanczos" "$tmp/$prefix%04d.png"
for p in "$tmp"/*.png; do
  cwebp -quiet -q "$q" "$p" -o "$out/$(basename "${p%.png}").webp"
done
rm -rf "$tmp"
echo "$(ls "$out" | wc -l | tr -d ' ') frames -> $out"
