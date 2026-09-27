// Shared: locate playwright-core and a Chromium binary without hardcoded paths.
//   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core  CHROME=/path/to/chrome  override both.
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const require = createRequire(import.meta.url);

function findPlaywright() {
  if (process.env.PLAYWRIGHT_CORE) return require(process.env.PLAYWRIGHT_CORE);
  for (const name of ["playwright-core", "playwright"]) { try { return require(name); } catch (_) {} }
  const npx = join(homedir(), ".npm", "_npx");
  if (existsSync(npx)) for (const d of readdirSync(npx)) {
    const p = join(npx, d, "node_modules", "playwright-core");
    if (existsSync(p)) return require(p);
  }
  throw new Error("playwright-core not found: run tools/setup.sh");
}
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const cache = join(homedir(), "Library", "Caches", "ms-playwright");
  if (existsSync(cache)) {
    const dirs = readdirSync(cache).filter((d) => d.startsWith("chromium_headless_shell-")).sort().reverse();
    for (const d of dirs) {
      const bin = join(cache, d, "chrome-headless-shell-mac-arm64", "chrome-headless-shell");
      if (existsSync(bin)) return bin;
    }
  }
  return undefined; // let playwright use its own default
}
export const pw = findPlaywright();
export const launchOpts = { executablePath: findChrome() };
