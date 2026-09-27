// QA screenshots of the home film at given progress points.
//   node tools/shoot.mjs out_dir 0.1 0.2 ...   (uses http://localhost:8014/?p=)
import { mkdirSync } from "node:fs";
import { pw, launchOpts } from "./_browser.mjs";

const [outDir, ...ps] = process.argv.slice(2);
const base = process.env.BASE || "http://localhost:8014/";
mkdirSync(outDir, { recursive: true });

const browser = await pw.chromium.launch(launchOpts);
const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.type() + ": " + m.text()); });

for (const p of ps) {
  const url = p === "bottom" ? base : `${base}?p=${p}`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => !document.getElementById("loader") || document.getElementById("loader").classList.contains("done"), null, { timeout: 60000 }).catch(() => errors.push(`p=${p}: loader never finished`));
  if (p === "bottom") { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(2500); }
  if (String(p).startsWith("y")) { await page.evaluate((y) => window.scrollTo(0, y), parseInt(String(p).slice(1), 10)); await page.waitForTimeout(1200); }
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => ({ scrollY: window.scrollY, frame: typeof currentFrame !== "undefined" ? currentFrame : null }));
  await page.screenshot({ path: `${outDir}/p_${p}.png` });
  console.log(`p=${p} scrollY=${info.scrollY} frame=${info.frame}`);
}
if (errors.length) console.log("ERRORS:\n" + [...new Set(errors)].join("\n"));
await browser.close();
