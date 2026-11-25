// Worked example: prove a PWA is installable in REAL Chromium and works offline.
// Serves ./app on localhost (a secure context), generates PNG icons, then via Playwright + CDP:
//  - Page.getInstallabilityErrors must be empty (Lighthouse 12 removed its PWA audit; this is the replacement)
//  - the service worker registers and controls the page
//  - with the network off, a reload still renders the cached shell.
// Run: node installability-check.mjs
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import zlib from "node:zlib";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");

function png(size, rgb) { // minimal valid solid-colour PNG
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3).map((_, i) => rgb[i % 3])]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(Buffer.concat(Array(size).fill(row)))), chunk("IEND", Buffer.alloc(0))]);
}
const icons = { "/icons/icon-192.png": png(192, [11, 31, 51]), "/icons/icon-512.png": png(512, [11, 31, 51]), "/icons/maskable-512.png": png(512, [27, 127, 59]) };
const types = { ".html": "text/html", ".js": "text/javascript", ".webmanifest": "application/manifest+json", ".png": "image/png" };
const appDir = new URL("./app/", import.meta.url).pathname;

const server = http.createServer((req, res) => {
  const p = new URL(req.url, "http://x").pathname; const file = p === "/" ? "/index.html" : p;
  if (icons[file]) { res.writeHead(200, { "content-type": "image/png" }); return res.end(icons[file]); }
  if (existsSync(appDir + file)) { res.writeHead(200, { "content-type": types[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream" }); return res.end(readFileSync(appDir + file)); }
  res.writeHead(404); res.end();
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(url);
await page.waitForFunction(() => document.getElementById("status").textContent.startsWith("Ready"));
const cdp = await context.newCDPSession(page);
const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
const manifest = await cdp.send("Page.getAppManifest");
assert.deepEqual(installabilityErrors, [], JSON.stringify(installabilityErrors));
assert.ok(manifest.url.endsWith("/manifest.webmanifest"));
await page.reload();                                   // now controlled by the service worker
assert.equal(await page.evaluate(() => !!navigator.serviceWorker.controller), true);
await context.setOffline(true);
await page.reload();
assert.equal(await page.locator("h1").textContent(), "Your matches");
assert.equal(await page.evaluate(() => matchMedia("(display-mode: browser)").matches), true); // iOS instructions would show in a tab
await browser.close(); server.close();
console.log("OK: Chromium reports 0 installability errors; SW controls page; offline reload served from cache");
