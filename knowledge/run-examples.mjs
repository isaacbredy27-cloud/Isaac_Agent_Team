// Runs every knowledge/<agent>/examples/*.mjs and writes RESULTS.md.
// Usage: cd knowledge && npm install && node run-examples.mjs
import { readdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL(".", import.meta.url).pathname;
const rows = [];
let failed = 0;
for (const agent of readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "node_modules").map((d) => d.name).sort()) {
  const dir = join(root, agent, "examples");
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".mjs")).sort()) {
    const r = spawnSync(process.execPath, ["--no-warnings", join(dir, f)], { cwd: dir, encoding: "utf8", timeout: 120000, env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
    const ok = r.status === 0;
    if (!ok) failed++;
    const last = (r.stdout || "").trim().split("\n").filter(Boolean).pop() ?? "";
    rows.push(`| ${agent} | ${f} | ${ok ? "PASS" : "FAIL"} | ${(ok ? last : (r.stderr || r.stdout).trim().split("\n").pop()).replaceAll("|", "\\|").slice(0, 140)} |`);
    console.log(`${ok ? "PASS" : "FAIL"}  ${agent}/examples/${f}`);
    if (!ok) console.log(r.stdout, r.stderr);
  }
}
writeFileSync(join(root, "RESULTS.md"), `# Example run results\n\nRun: ${new Date().toISOString()} · Node ${process.version}\n\n| Agent | Example | Result | Last line of output |\n|---|---|---|---|\n${rows.join("\n")}\n\n${failed} failed of ${rows.length}.\n`);
console.log(`\n${rows.length - failed}/${rows.length} passed`);
process.exit(failed ? 1 : 0);
