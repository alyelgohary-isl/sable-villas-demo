// Full-page screenshot of the released page flow (everything after the film).
//   node tools/fullpage.mjs out.png [url]   (VIEWPORT=390x844 for mobile)
import { pw, launchOpts } from "./_browser.mjs";

const [out, url = "http://localhost:8014/"] = process.argv.slice(2);
const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
const browser = await pw.chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => !document.getElementById("loader") || document.getElementById("loader").classList.contains("done"), null, { timeout: 60000 }).catch(() => {});
// force all reveal-on-scroll elements visible, then shoot only the flow
await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in")));
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1500);
const top = await page.evaluate(() => { const el = document.querySelector(".page-flow") || document.querySelector("main"); return el.getBoundingClientRect().top + window.scrollY; });
const total = await page.evaluate(() => document.body.scrollHeight);
const hasFilm = true; // always stitch: pages use vh-based runways, so the viewport must stay fixed
if (!hasFilm) {
  // no vh-driven film: just grow the viewport to the flow and shoot once
  const h = Math.min(total - top, 12000);
  await page.setViewportSize({ width: vw, height: Math.round(h) });
  await page.evaluate((y) => window.scrollTo(0, y), top);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out });
  console.log(`saved ${out} flow ${Math.round(h)}px tall`);
} else {
  // film pages: keep the viewport (vh layout) and stitch viewport-sized strips
  const { PNG } = await import("node:buffer").then(() => ({ PNG: null })).catch(() => ({ PNG: null }));
  const strips = [];
  for (let y = top; y < total; y += vh - 100) {   // overlap so the cropped header never leaves a gap
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(700);
    const actual = await page.evaluate(() => window.scrollY);
    const buf = await page.screenshot();
    strips.push({ y: actual, buf });
    if (actual + vh >= total) break;
  }
  const { writeFileSync } = await import("node:fs");
  strips.forEach((s, i) => writeFileSync(`${out}.strip${i}.png`, s.buf));
  writeFileSync(`${out}.strips.json`, JSON.stringify({ top, vh, strips: strips.map((s) => s.y) }));
  console.log(`saved ${strips.length} strips for ${out}; stitch with tools/stitch.py`);
}
await browser.close();
