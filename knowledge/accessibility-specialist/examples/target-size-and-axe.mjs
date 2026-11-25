// Worked example: measure tap-target sizes and prove axe catches a real contrast failure, in REAL Chromium.
// Run: node target-size-and-axe.mjs
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const good = `<!doctype html><html lang="en"><head><title>Good</title></head><body><main><h1>Filters</h1>
  <button style="min-width:44px;min-height:44px">Remote</button>
  <button style="min-width:44px;min-height:44px">Save job</button></main></body></html>`;
const bad = `<!doctype html><html lang="en"><head><title>Bad</title></head><body><main><h1>Filters</h1>
  <button style="width:20px;height:20px;padding:0;font-size:10px">x</button>
  <p style="color:#FFD60A;background:#fff">Moderate Match</p></main></body></html>`;

const browser = await chromium.launch();
const page = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();

await page.setContent(good);
const sizes = await page.getByRole("button").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
assert.ok(sizes.every(([w, h]) => w >= 44 && h >= 44), JSON.stringify(sizes));
assert.deepEqual((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()).violations, []);

await page.setContent(bad);
const badSizes = await page.getByRole("button").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
assert.ok(badSizes[0] < 24, "undersized target detected by measurement");
const v = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()).violations.map((x) => x.id);
assert.ok(v.includes("color-contrast"), `axe should flag contrast, got ${v}`);
await browser.close();
console.log(`OK: good page targets ${JSON.stringify(sizes)} px with 0 violations; bad page flagged: ${v.join(", ")}`);
