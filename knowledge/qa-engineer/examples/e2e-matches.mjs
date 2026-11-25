// Worked example: an end-to-end test in REAL Chromium using Playwright's library API (no test runner needed),
// following Playwright best practices: role locators, user-visible assertions, mobile device emulation,
// reduced motion, and an axe WCAG scan. Run: node e2e-matches.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import http from "node:http";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const html = readFileSync(new URL("./site/index.html", import.meta.url));
const server = http.createServer((_, res) => { res.writeHead(200, { "content-type": "text/html" }); res.end(html); });
await new Promise((r) => server.listen(0, "127.0.0.1", r));

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce", timezoneId: "America/New_York" });
const page = await context.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/`);

// user-visible behaviour
assert.equal(await page.getByRole("heading", { level: 1 }).textContent(), "Your matches");
assert.equal(await page.getByRole("status").textContent(), "3 jobs shown");
await page.getByRole("button", { name: "Remote" }).click();
await page.getByRole("button", { name: "Hybrid" }).click();
await page.getByRole("status").filter({ hasText: "2 jobs shown" }).waitFor();         // auto-waiting locator
assert.equal(await page.getByRole("button", { name: "Remote" }).getAttribute("aria-pressed"), "true");
assert.ok(await page.getByText("86, Strong Match").isVisible(), "band shown as text, not color only");
assert.equal(await page.getByText("Weak Match").count(), 0, "on-site job filtered out");

// accessibility scan (WCAG 2.x A/AA)
const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
assert.deepEqual(results.violations.map((v) => v.id), []);

await browser.close(); server.close();
console.log(`OK: Pixel 7 e2e passed (filters, live status, text bands) and axe found 0 violations in ${results.passes.length} passing rules`);
