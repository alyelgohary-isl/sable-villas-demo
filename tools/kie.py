#!/usr/bin/env python3
"""Small KIE.ai client for the film pipeline.

Usage (all commands read KIE_API_KEY from .env in the project root):

  kie.py upload  <file>                       -> prints public URL (valid ~24h)
  kie.py image   --prompt P [--ref f ...] [--ar 1:1] [--res 2K] --out out.png
  kie.py video   --prompt P --start f [--end f] [--dur 5] [--ar 1:1] [--mode pro] --out out.mp4
  kie.py poll    <taskId>                     -> prints result JSON
  kie.py credits                              -> prints the account balance (check BEFORE planning spend)

Refs / start / end may be local files (uploaded automatically) or http URLs.
"""
import argparse, base64, json, os, sys, time, mimetypes
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://api.kie.ai/api/v1"
UPLOAD = "https://kieai.redpandaai.co/api/file-base64-upload"


def api_key():
    k = os.environ.get("KIE_API_KEY")
    if not k:
        for line in open(os.path.join(ROOT, ".env")):
            if line.startswith("KIE_API_KEY="):
                k = line.split("=", 1)[1].strip()
    if not k:
        sys.exit("KIE_API_KEY not found")
    return k


def H():
    return {"Authorization": f"Bearer {api_key()}", "Content-Type": "application/json"}


def upload(path):
    if path.startswith("http"):
        return path
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    data = base64.b64encode(open(path, "rb").read()).decode()
    r = requests.post(UPLOAD, headers=H(), json={
        "base64Data": f"data:{mime};base64,{data}",
        "uploadPath": "stallion",
        "fileName": os.path.basename(path),
    }, timeout=120)
    r.raise_for_status()
    j = r.json()
    d = j.get("data") or {}
    url = d.get("fileUrl") or d.get("downloadUrl") or j.get("fileUrl")
    if not url:
        sys.exit(f"upload failed: {j}")
    print(f"  uploaded {os.path.basename(path)} -> {url}", file=sys.stderr)
    return url


def create(model, inp):
    r = requests.post(f"{API}/jobs/createTask", headers=H(),
                      json={"model": model, "input": inp}, timeout=60)
    r.raise_for_status()
    j = r.json()
    if j.get("code") != 200:
        sys.exit(f"createTask failed: {j}")
    tid = j["data"]["taskId"]
    print(f"  task {tid} ({model})", file=sys.stderr)
    return tid


def poll(tid, every=8, limit=1800):
    t0 = time.time()
    while time.time() - t0 < limit:
        r = requests.get(f"{API}/jobs/recordInfo", headers=H(), params={"taskId": tid}, timeout=60)
        r.raise_for_status()
        d = r.json().get("data") or {}
        state = d.get("state")
        if state == "success":
            res = d.get("resultJson")
            if isinstance(res, str):
                res = json.loads(res)
            print(f"  done in {int(time.time()-t0)}s, credits={d.get('creditsConsumed')}", file=sys.stderr)
            return res
        if state in ("fail", "failed", "error"):
            sys.exit(f"task failed: {d.get('failCode')} {d.get('failMsg')}")
        time.sleep(every)
    sys.exit("timeout")


def first_url(res):
    for k in ("resultUrls", "result_urls", "urls"):
        v = res.get(k)
        if v:
            return v[0]
    if res.get("resultUrl"):
        return res["resultUrl"]
    sys.exit(f"no url in result: {res}")


def download(url, out):
    r = requests.get(url, timeout=600)
    r.raise_for_status()
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    open(out, "wb").write(r.content)
    print(f"  saved {out} ({len(r.content)//1024} KB)", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    u = sub.add_parser("upload"); u.add_argument("file")
    p = sub.add_parser("poll"); p.add_argument("taskId")
    sub.add_parser("credits")

    im = sub.add_parser("image")
    im.add_argument("--prompt", required=True)
    im.add_argument("--ref", action="append", default=[])
    im.add_argument("--ar", default="1:1")
    im.add_argument("--res", default="2K")
    im.add_argument("--out", required=True)

    vd = sub.add_parser("video")
    vd.add_argument("--prompt", required=True)
    vd.add_argument("--start", required=True)
    vd.add_argument("--end")
    vd.add_argument("--dur", default="5")
    vd.add_argument("--ar", default="1:1")
    vd.add_argument("--mode", default="pro")
    vd.add_argument("--out", required=True)

    a = ap.parse_args()
    if a.cmd == "credits":
        r = requests.get(f"{API}/chat/credit", headers=H(), timeout=30); r.raise_for_status()
        print(r.json().get("data"))
    elif a.cmd == "upload":
        print(upload(a.file))
    elif a.cmd == "poll":
        print(json.dumps(poll(a.taskId), indent=2))
    elif a.cmd == "image":
        inp = {"prompt": a.prompt, "image_input": [upload(f) for f in a.ref],
               "aspect_ratio": a.ar, "resolution": a.res, "output_format": "png"}
        res = poll(create("nano-banana-2", inp))
        download(first_url(res), a.out)
    elif a.cmd == "video":
        urls = [upload(a.start)] + ([upload(a.end)] if a.end else [])
        inp = {"prompt": a.prompt, "image_urls": urls, "duration": str(a.dur),
               "aspect_ratio": a.ar, "mode": a.mode, "sound": False,
               "multi_shots": False}
        res = poll(create("kling-3.0/video", inp))
        download(first_url(res), a.out)


if __name__ == "__main__":
    main()
