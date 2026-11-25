import { describe, expect, it } from "vitest";
import match from "../../netlify/functions/match";
import gaps from "../../netlify/functions/gaps";
import { MatchResponseSchema } from "../../packages/schemas/src/index";

const profile = { skills: ["Excel", "GAAP"], titles: ["Staff Accountant"], certifications: [], yearsExperience: 3, education: ["BS Accounting"] };
const post = (body: unknown) => new Request("http://x/api/match", { method: "POST", body: JSON.stringify(body) });
const ctx = {} as never;

describe("POST /api/match and /api/gaps", () => {
  it("scores, sorts and is private", async () => {
    const res = await match(post({ profile }), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const body = MatchResponseSchema.parse(await res.json());
    expect(body.results.length).toBeGreaterThanOrEqual(30);
    const scores = body.results.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
  it("filters by jobIds", async () => {
    const res = await match(post({ profile, jobIds: ["seed-001", "nope"] }), ctx);
    expect((await res.json()).results.map((r: { jobId: string }) => r.jobId)).toEqual(["seed-001"]);
  });
  it("rejects bad input and methods", async () => {
    expect((await match(post({ profile: {} }), ctx)).status).toBe(400);
    expect((await match(new Request("http://x/api/match"), ctx)).status).toBe(405);
    expect((await gaps(post({}), ctx)).status).toBe(400);
    expect((await gaps(new Request("http://x/api/gaps"), ctx)).status).toBe(405);
  });
  it("returns gaps", async () => {
    const res = await gaps(post({ profile }), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(Array.isArray((await res.json()).gaps)).toBe(true);
  });
});
