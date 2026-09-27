#!/usr/bin/env python3
"""Fallback motion when clips can't be generated: build a frame sequence from stills.

  tools/synth.py push  in.png outdir prefix --frames 61 --zoom 1.18 [--to x,y]      slow push-in toward a point (0..1 coords)
  tools/synth.py cross a.png b.png outdir prefix --frames 61 --zoom 1.06            push on A while dissolving into B (blend in the last third)
  tools/synth.py hold  in.png outdir prefix --frames 12                            repeat a frame (a hold)

Frames are square webp at --size (default 960) so they drop straight into film.config.js.
Reverse legs need no files: point the timeline at f0=60,f1=0. This is a stand-in, not a
replacement for Kling: there is no parallax, and dissolves show a brief double image.
"""
import argparse, os
from PIL import Image

def ease(t):  # ease-in-out
    return t * t * (3 - 2 * t)

def load_sq(path, size):
    im = Image.open(path).convert("RGB")
    w, h = im.size; s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))
    return im.resize((size, size), Image.LANCZOS)

def crop_zoom(im, z, cx, cy):
    S = im.size[0]; w = S / z
    x = min(max(cx * S - w / 2, 0), S - w); y = min(max(cy * S - w / 2, 0), S - w)
    return im.crop((int(x), int(y), int(x + w), int(y + w))).resize((S, S), Image.LANCZOS)

def save(im, outdir, prefix, i):
    os.makedirs(outdir, exist_ok=True)
    im.save(os.path.join(outdir, f"{prefix}{i:04d}.webp"), quality=80, method=4)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["push", "cross", "hold"])
    ap.add_argument("inputs", nargs="+")
    ap.add_argument("--frames", type=int, default=61)
    ap.add_argument("--zoom", type=float, default=1.18)
    ap.add_argument("--to", default="0.5,0.5")
    ap.add_argument("--size", type=int, default=960)
    a = ap.parse_args()
    *ins, outdir, prefix = a.inputs
    cx, cy = map(float, a.to.split(","))
    if a.mode == "hold":
        im = load_sq(ins[0], a.size)
        for i in range(a.frames): save(im, outdir, prefix, i + 1)
    elif a.mode == "push":
        im = load_sq(ins[0], a.size)
        for i in range(a.frames):
            t = ease(i / (a.frames - 1)); save(crop_zoom(im, 1 + (a.zoom - 1) * t, cx, cy), outdir, prefix, i + 1)
    else:
        A = load_sq(ins[0], a.size); B = load_sq(ins[1], a.size)
        for i in range(a.frames):
            t = ease(i / (a.frames - 1)); z = 1 + (a.zoom - 1) * t
            fa = crop_zoom(A, z, cx, cy); fb = crop_zoom(B, 1 + (z - 1) * 0.5, cx, cy)
            mix = 0 if t < 0.66 else ease((t - 0.66) / 0.34)
            save(Image.blend(fa, fb, mix), outdir, prefix, i + 1)
    print(f"{a.frames} frames -> {outdir}/{prefix}*.webp")

if __name__ == "__main__":
    main()
