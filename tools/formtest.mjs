// End-to-end form test without a real Formspree account: starts a mock endpoint,
// points the page's config at it, fills and submits a form, and prints what arrived.
//   node tools/formtest.mjs http://localhost:8014/contact/ "form.form"
import http from "node:http";
import { pw, launchOpts } from "./_browser.mjs";

const [url = "http://localhost:8014/contact/", selector = "form.form"] = process.argv.slice(2);
const received = [];
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    received.push({ method: req.method, ctype: req.headers["content-type"], body });
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end('{"ok":true}');
  });
});
await new Promise((r) => server.listen(8016, r));

const browser = await pw.chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url, { waitUntil: "load" });
await page.evaluate(() => { window.SABLE.formEndpoint = "http://localhost:8016/submit"; window.SABLE.recaptchaSiteKey = "6LcFAKEKEY-not-real"; });

// fill every required field with something plausible
await page.evaluate((sel) => {
  const form = document.querySelector(sel);
  form.querySelectorAll("input, select, textarea").forEach((el) => {
    if (el.type === "hidden" || el.name === "_gotcha") return;
    if (el.tagName === "SELECT") { el.selectedIndex = Math.min(1, el.options.length - 1); return; }
    if (el.type === "checkbox") { el.checked = true; return; }
    if (el.type === "email") el.value = "test@example.com";
    else if (el.type === "tel") el.value = "705 555 0100";
    else el.value = el.name === "postal" || /postal/i.test(el.id) ? "P1L 1A1" : "Test";
  });
}, selector);
await page.click(`${selector} [type="submit"]`);
await page.waitForFunction((sel) => document.querySelector(sel).classList.contains("sent"), selector, { timeout: 15000 }).catch(() => errors.push("form never reached the sent state"));

const r = received[0];
if (r) {
  const boundary = (r.ctype.match(/boundary=(.+)/) || [])[1];
  const fields = r.body.split("--" + boundary).map((p) => (p.match(/name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n$/) || []).slice(1, 3)).filter((x) => x.length);
  console.log("received", r.method, "multipart fields:");
  for (const [k, v] of fields) console.log(`  ${k} = ${v.length > 60 ? v.slice(0, 57) + "…" : v}`);
} else console.log("nothing received");
console.log("success state shown:", await page.evaluate((sel) => document.querySelector(sel).classList.contains("sent"), selector));
console.log("honeypot present:", await page.evaluate((sel) => !!document.querySelector(`${sel} input[name=_gotcha]`), selector));
if (errors.length) console.log("ERRORS:", errors.join(" | "));
await browser.close();
server.close();
