// Worked example: parse netlify.toml with Python's tomllib (stdlib) and check project rules.
// Run: node validate-netlify-toml.mjs
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const json = execFileSync("python3", ["-I", "-c", "import tomllib,json,sys; print(json.dumps(tomllib.load(open(sys.argv[1],'rb'))))", new URL("./netlify.toml", import.meta.url).pathname], { encoding: "utf8" });
const cfg = JSON.parse(json);
assert.equal(cfg.functions.directory, "netlify/functions");
assert.equal(cfg.functions["schedule-ingest"].schedule, "0 */2 * * *");
assert.ok(!cfg.build.environment, "no [build.environment]: secrets never live in netlify.toml");
const h = cfg.headers.find((x) => x.for === "/*").values;
for (const k of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy"]) assert.ok(h[k], k);
assert.match(h["Content-Security-Policy"], /frame-ancestors 'none'/);
console.log(`OK: netlify.toml parses; ${cfg.headers.length} header rules; schedule every 2h; no env secrets`);
