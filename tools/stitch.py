#!/usr/bin/env python3
"""Stitch the viewport strips written by tools/fullpage.mjs into one image.
   python3 tools/stitch.py out.png"""
import json, sys, os
from PIL import Image
out = sys.argv[1]
meta = json.load(open(out + ".strips.json"))
top, vh, ys = meta["top"], meta["vh"], meta["strips"]
ims = [Image.open(f"{out}.strip{i}.png").convert("RGB") for i in range(len(ys))]
w = ims[0].width
height = int(ys[-1] + vh - top)
sheet = Image.new("RGB", (w, height), (0, 0, 0))
HEADER = 90  # fixed header height; crop it from every strip after the first
for i, (im, y) in enumerate(zip(ims, ys)):
    if i == 0:
        sheet.paste(im, (0, int(y - top)))
    else:
        sheet.paste(im.crop((0, HEADER, im.width, im.height)), (0, int(y - top) + HEADER))
sheet.save(out)
for i in range(len(ys)): os.remove(f"{out}.strip{i}.png")
os.remove(out + ".strips.json")
print(f"stitched {out} {w}x{height}")
