// Confirm background loops actually play: prints readyState / currentTime for each <video> on a page.
//   node tools/videocheck.mjs http://localhost:8014/communities/ [more urls]
import { pw, launchOpts } from "./_browser.mjs";
const browser = await pw.chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
for (const url of process.argv.slice(2)) {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => [...document.querySelectorAll("video")].map((v) => ({
    src: (v.currentSrc || "").split("/").slice(-2).join("/"), readyState: v.readyState, paused: v.paused, t: +v.currentTime.toFixed(2), w: v.videoWidth, h: v.videoHeight, err: v.error && v.error.code,
  })));
  console.log(url, JSON.stringify(info));
}
await browser.close();
