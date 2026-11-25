// Worked example: verify the CSS fallbacks in REAL Chromium. With prefers-contrast: more, the glass must become opaque.
// Run: node reduced-transparency-fallback.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const html = `<!doctype html><style>${css}</style><nav class="glass tab" id="bar">Matches</nav><article class="card" id="card">Job</article>`;
const browser = await chromium.launch();
const styleOf = async (opts) => { const p = await (await browser.newContext(opts)).newPage(); await p.setContent(html);
  return p.evaluate(() => ({ bar: getComputedStyle(document.getElementById("bar")).backdropFilter, card: getComputedStyle(document.getElementById("card")).backdropFilter, h: document.getElementById("bar").getBoundingClientRect().height })); };
const normal = await styleOf({});
const more = await styleOf({ contrast: "more" });
await browser.close();
assert.match(normal.bar, /blur\(20px\)/);
assert.equal(normal.card, "none", "content layer never gets glass");
assert.equal(more.bar, "none", "increased contrast → opaque fallback");
assert.ok(normal.h >= 44, "tab target ≥ 44 px");
console.log({ normal, more });
console.log("OK: glass on nav only; prefers-contrast: more removes blur; tab height ≥ 44 px");
