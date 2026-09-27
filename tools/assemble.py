#!/usr/bin/env python3
"""Assemble the site's pages from work/src/*.html: injects the shared header and
footer (work/src/_header.html, _footer.html), and fills {{ROOT}}, {{V}},
{{YEAR}} and the nav's aria-current. Run from the site root after editing a source."""
import os, re, glob, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "work", "src")
V = time.strftime("%Y%m%d%H%M")
header = open(os.path.join(SRC, "_header.html")).read()
footer = open(os.path.join(SRC, "_footer.html")).read()
for src in sorted(glob.glob(os.path.join(SRC, "*.html"))):
    name = os.path.basename(src)
    if name.startswith("_"):
        continue
    slug = name[:-5]
    out = os.path.join(ROOT, "index.html") if slug == "index" else os.path.join(ROOT, slug, "index.html")
    root = "./" if slug == "index" else "../"
    html = open(src).read()
    h = header.replace('href="{{ROOT}}%s/"' % slug, 'href="{{ROOT}}%s/" aria-current="page"' % slug)
    html = html.replace("{{HEADER}}", h).replace("{{FOOTER}}", footer)
    html = html.replace("{{ROOT}}", root).replace("{{V}}", V).replace("{{YEAR}}", time.strftime("%Y"))
    left = re.findall(r"{{[A-Z_0-9]+}}", html)
    if left:
        print(f"WARNING {name}: unfilled placeholders {sorted(set(left))}")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w").write(html)
    print(f"{name} -> {os.path.relpath(out, ROOT)}")
