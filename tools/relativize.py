#!/usr/bin/env python3
"""Rewrite root-absolute URLs (href="/x", src="/x", data-*="/x", poster="/x",
css url("/x")) into relative ones so the site works from any base path:
GitHub Pages project sites, a Webflow/Netlify export, or file://.
Full URLs (http…, //cdn…) and canonical/og tags are left alone.

  python3 tools/relativize.py          # rewrites in place
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATTR = re.compile(r'((?:href|src|poster|data-[a-z-]+|content)=")/(?!/)([^"]*)"')
CSSURL = re.compile(r'url\((["\']?)/(?!/)([^)"\']*)\1\)')
SKIP_ATTR_VALUES = ("http://", "https://")

def rel_prefix(depth):
    return "../" * depth if depth else "./"

def fix_html(path, depth):
    s = open(path, encoding="utf-8").read()
    pre = rel_prefix(depth)
    def sub(m):
        attr, rest = m.group(1), m.group(2)
        # content="/..." only matters for og:image-style tags; full URLs are untouched anyway
        if rest == "" or rest.startswith("#"):
            return f'{attr}{pre}{rest}"'
        return f'{attr}{pre}{rest}"'
    n = len(ATTR.findall(s))
    s2 = ATTR.sub(sub, s)
    if s2 != s:
        open(path, "w", encoding="utf-8").write(s2)
    return n

def fix_css(path, depth):
    s = open(path, encoding="utf-8").read()
    pre = rel_prefix(depth)
    s2 = CSSURL.sub(lambda m: f'url({m.group(1)}{pre}{m.group(2)}{m.group(1)})', s)
    n = len(CSSURL.findall(s))
    if s2 != s:
        open(path, "w", encoding="utf-8").write(s2)
    return n

total = 0
for dirpath, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("work", "node_modules", "frames", "videos", "key_frames")]
    for f in files:
        p = os.path.join(dirpath, f)
        depth = os.path.relpath(dirpath, ROOT).count(os.sep) + (0 if os.path.relpath(dirpath, ROOT) == "." else 1)
        if f.endswith(".html"):
            n = fix_html(p, depth); total += n
            if n: print(f"{os.path.relpath(p, ROOT)}: {n} urls -> {rel_prefix(depth)}")
        elif f.endswith(".css"):
            n = fix_css(p, depth); total += n
            if n: print(f"{os.path.relpath(p, ROOT)}: {n} css urls -> {rel_prefix(depth)}")
print(f"rewrote {total} urls")
