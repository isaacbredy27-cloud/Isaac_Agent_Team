// Worked example: CI secret scan for built client assets and proposed agent changes (skill: secrets-management).
// Run: node secret-scan.mjs
import assert from "node:assert/strict";

const PATTERNS = [
  ["anthropic-key", /sk-ant-[A-Za-z0-9_-]{8,}/],
  ["github-fine-grained-pat", /github_pat_[A-Za-z0-9_]{20,}/],
  ["github-classic-pat", /gh[pousr]_[A-Za-z0-9]{30,}/],
  ["private-key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["netlify-build-hook", /api\.netlify\.com\/build_hooks\/[a-f0-9]{24}/],
];
export const scan = (text) => PATTERNS.filter(([, re]) => re.test(text)).map(([id]) => id);

assert.deepEqual(scan("const model = 'claude-opus-5-5';"), []);
assert.deepEqual(scan("headers: { 'x-api-key': 'sk-ant-api03-AbCdEf123456' }"), ["anthropic-key"]);
assert.deepEqual(scan("token=github_pat_11ABCDEFG0123456789_abcdefghijklmnop"), ["github-fine-grained-pat"]);
assert.deepEqual(scan("-----BEGIN RSA PRIVATE KEY-----\nMII…"), ["private-key"]);
assert.deepEqual(scan("https://api.netlify.com/build_hooks/5f8d0c1e2a3b4c5d6e7f8a9b"), ["netlify-build-hook"]);
console.log("OK: scanner flags Anthropic keys, GitHub PATs, private keys and build hooks; ignores clean code");
