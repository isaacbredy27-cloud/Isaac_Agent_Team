import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { JobSchema } from "../../packages/schemas/src/index.ts";
import { loadSeed } from "../../packages/sources/src/seed.ts";
import { normalizeGreenhouseBoard, fetchGreenhouse } from "../../packages/sources/src/greenhouse.ts";
import { dedupe, getJobs, resetSourceCache } from "../../packages/sources/src/index.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/greenhouse-board.json", import.meta.url), "utf8"));
const NOW = new Date("2026-11-25T17:00:00Z");

describe("seed", () => {
  const jobs = loadSeed(NOW);
  it("has 36 valid jobs with unique ids and example.com urls", () => {
    expect(jobs).toHaveLength(36);
    for (const j of jobs) {
      expect(JobSchema.safeParse(j).success).toBe(true);
      expect(j.url).toBe(`https://example.com/jobs/${j.id}`);
      expect(j.source).toBe("seed");
      expect(j.skills.length).toBeGreaterThan(0);
    }
    expect(new Set(jobs.map((j) => j.id)).size).toBe(36);
  });
  it("shifts dates so the newest is now and the spread is within 21 days", () => {
    const times = jobs.map((j) => Date.parse(j.postedAt));
    expect(Math.max(...times)).toBe(NOW.getTime());
    expect((NOW.getTime() - Math.min(...times)) / 86_400_000).toBeLessThanOrEqual(21);
  });
  it("covers the target cities and remote roles", () => {
    const locs = new Set(jobs.map((j) => j.location));
    for (const c of ["Orlando", "Lake Mary", "Maitland", "Winter Park", "Kissimmee", "Sanford", "Altamonte Springs", "Celebration"])
      expect([...locs].some((l) => l.startsWith(c))).toBe(true);
    expect(jobs.some((j) => j.remote)).toBe(true);
  });
});

describe("greenhouse normalize (recorded fixture)", () => {
  const jobs = normalizeGreenhouseBoard(fixture, "exampleco");
  it("keeps only Orlando-MSA/remote finance roles", () => {
    expect(jobs.map((j) => j.title)).toEqual(["Senior Financial Analyst"]);
  });
  it("maps fields, unescapes content and validates", () => {
    const j = jobs[0]!;
    expect(JobSchema.safeParse(j).success).toBe(true);
    expect(j.id).toBe("greenhouse:exampleco:F-100");
    expect(j.location).toBe("Orlando, FL");
    expect(j.remote).toBe(true);
    expect(j.postedAt).toBe("2026-11-20T14:00:00.000Z");
    expect(j.description).toBe("Build forecasts in Excel. Requires GAAP and FP&A experience.");
    expect(j.skills).toEqual(expect.arrayContaining(["GAAP", "Excel", "FP&A"]));
  });
  it("drops malformed bodies", () => {
    expect(normalizeGreenhouseBoard({}, "x")).toEqual([]);
    expect(normalizeGreenhouseBoard(null, "x")).toEqual([]);
  });
  it("fetchGreenhouse requests the content=true endpoint once and throws on errors", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    expect(await fetchGreenhouse("exampleco", f as unknown as typeof fetch)).toHaveLength(1);
    expect(f).toHaveBeenCalledTimes(1);
    expect((f.mock.calls[0] as unknown[])[0]).toBe("https://boards-api.greenhouse.io/v1/boards/exampleco/jobs?content=true");
    const bad = vi.fn(async () => new Response("", { status: 429 }));
    await expect(fetchGreenhouse("x", bad as unknown as typeof fetch)).rejects.toThrow("greenhouse_429");
  });
});

describe("getJobs", () => {
  beforeEach(() => { resetSourceCache(); delete process.env.JOBS_GREENHOUSE; });
  afterEach(() => { delete process.env.JOBS_GREENHOUSE; });

  it("returns seed only, newest first, with no network", async () => {
    const f = vi.fn();
    const r = await getJobs({ now: NOW, fetchImpl: f as unknown as typeof fetch });
    expect(r.source).toBe("seed");
    expect(r.jobs).toHaveLength(36);
    expect(f).not.toHaveBeenCalled();
    const t = r.jobs.map((j) => Date.parse(j.postedAt));
    expect([...t].sort((a, b) => b - a)).toEqual(t);
  });
  it("filters by q and since", async () => {
    const q = await getJobs({ now: NOW, q: "controller" });
    expect(q.jobs.length).toBeGreaterThan(0);
    expect(q.jobs.every((j) => /controller/i.test(`${j.title} ${j.description} ${j.skills.join(" ")}`))).toBe(true);
    const s = await getJobs({ now: NOW, since: "2026-11-20T00:00:00Z" });
    expect(s.jobs.length).toBeLessThan(36);
    expect(s.jobs.every((j) => Date.parse(j.postedAt) >= Date.parse("2026-11-20T00:00:00Z"))).toBe(true);
  });
  it("ignores the flag when the registry has no allowed boards", async () => {
    process.env.JOBS_GREENHOUSE = "1";
    const f = vi.fn();
    const r = await getJobs({ now: NOW, fetchImpl: f as unknown as typeof fetch });
    expect(r.source).toBe("seed");
    expect(f).not.toHaveBeenCalled();
  });
  it("dedupes by company, title and location, preferring non-seed", () => {
    const [a] = loadSeed(NOW);
    const live = { ...a!, id: "greenhouse:x:1", source: "greenhouse" };
    const out = dedupe([a!, live, { ...a! }]);
    expect(out).toHaveLength(1);
    expect(out[0]!.source).toBe("greenhouse");
  });
});
