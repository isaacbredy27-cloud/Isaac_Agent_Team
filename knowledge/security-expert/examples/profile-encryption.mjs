// Worked example: app-level AES-256-GCM encryption of a candidate profile before writing to Blobs (ADR 0004).
// Run: node profile-encryption.mjs
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import assert from "node:assert/strict";

const keys = { 1: randomBytes(32) };           // real code: Buffer.from(process.env.DATA_KEY, "base64"), with key versions
export function encrypt(obj, keyVersion = 1) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", keys[keyVersion], iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return { v: keyVersion, iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), ct: ct.toString("base64") };
}
export function decrypt(rec) {
  const d = createDecipheriv("aes-256-gcm", keys[rec.v], Buffer.from(rec.iv, "base64"));
  d.setAuthTag(Buffer.from(rec.tag, "base64"));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(rec.ct, "base64")), d.final()]).toString("utf8"));
}

const profile = { schemaVersion: "1.0", totalYearsExperience: 4.5, skills: { canonical: ["excel_advanced", "fpa"] } }; // synthetic
const rec = encrypt(profile);
assert.deepEqual(decrypt(rec), profile);
assert.ok(!JSON.stringify(rec).includes("excel_advanced"), "ciphertext hides content");
const tampered = { ...rec, ct: Buffer.from(Buffer.from(rec.ct, "base64").map((b, i) => (i === 0 ? b ^ 1 : b))).toString("base64") };
assert.throws(() => decrypt(tampered), /auth/i);
console.log("OK: AES-256-GCM round-trip works; tampering detected by the auth tag");
