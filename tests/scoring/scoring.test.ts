import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { bandFor, MatchResultSchema, type CandidateProfile, type Job } from "../../packages/schemas/src/index";
import {
  extractRequirements, indexTaxonomy, normalize, rankResults, resolveTerm, score, scoreDetailed, skillGaps,
  WEIGHTS_VERSION, type Taxonomy,
} from "../../packages/scoring/src/index";

const tax = JSON.parse(readFileSync(new URL("../../data/taxonomy/skills.v1.json", import.meta.url), "utf8")) as Taxonomy;
const seed = JSON.parse(readFileSync(new URL("../../data/jobs/seed.json", import.meta.url), "utf8")) as Job[];

const job = (o: Partial<Job> = {}): Job => ({
  id: "j1", title: "Senior Financial Analyst", company: "Example Co", location: "Orlando, FL", remote: false,
  postedAt: "2026-11-20T00:00:00.000Z", url: "https://example.com/j1", source: "seed",
  description: "Requirements: 4-6 years of experience; Excel, FP&A required. Power BI preferred. Bachelor's degree in finance preferred.",
  skills: ["Excel", "FP&A", "Power BI"], ...o,
});
const profile = (o: Partial<CandidateProfile> = {}): CandidateProfile => ({
  skills: ["Excel", "FP&A", "Power BI"], titles: ["Senior Financial Analyst"], certifications: [],
  yearsExperience: 5, education: ["BS Finance"], ...o,
});

describe("taxonomy helpers", () => {
  it("normalizes", () => {
    expect(normalize("Bachelor’s  Degree!")).toBe("bachelors degree");
    const ix = indexTaxonomy(tax);
    expect(indexTaxonomy(tax)).toBe(ix);
    expect(resolveTerm(ix, "Microsoft Excel").kind).toBe("skill");
    expect(resolveTerm(ix, "CPA").kind).toBe("cert");
    expect(resolveTerm(ix, "Zorbl").kind).toBe("unknown");
  });
});

describe("requirements", () => {
  const ix = indexTaxonomy(tax);
  it("reads years, education, seniority, importance", () => {
    const r = extractRequirements(job(), ix);
    expect(r.years).toEqual({ min: 4, max: 6 });
    expect(r.education?.required).toBe(false);
    expect(r.seniority).toBe(2);
    expect(r.skills.find((s) => s.label === "Power BI")?.importance).toBe("preferred");
    expect(r.skills.find((s) => s.label === "Excel")?.importance).toBe("required");
  });
  it("handles open band, missing text, dupes and unknown terms", () => {
    const r = extractRequirements(job({ description: "Join us. 3+ years needed.", skills: ["Excel", "excel", "Zorbl"], title: "Wizard" }), ix);
    expect(r.years).toEqual({ min: 3, max: Number.POSITIVE_INFINITY });
    expect(r.skills).toHaveLength(2);
    expect(r.skills.every((s) => s.importance === "required")).toBe(true);
    expect(r.seniority).toBeNull();
    expect(r.education).toBeNull();
    expect(r.clearance).toBeNull();
  });
  it("detects clearance and equivalence", () => {
    const r = extractRequirements(job({ description: "Active Secret clearance required. Bachelor's degree or equivalent experience." }), ix);
    expect(r.clearance).toMatch(/Secret/);
    expect(r.education?.equivalence).toBe(true);
  });
});

describe("score", () => {
  it("is deterministic, valid, and Strong for a close fit", () => {
    const a = score(profile(), job(), tax);
    const b = score(profile(), job(), tax);
    expect(a).toEqual(b);
    expect(MatchResultSchema.safeParse(a).success).toBe(true);
    expect(a.band).toBe("Strong");
    expect(a.recommendation.action).toBe("apply");
    expect(a.explanation).toContain("You match on");
    expect(scoreDetailed(profile(), job(), tax).weightsVersion).toBe(WEIGHTS_VERSION);
  });

  it("redistributes weight for criteria the job does not state", () => {
    const d = scoreDetailed(profile(), job({ description: "Great team.", skills: ["Excel"], title: "Wizard" }), tax);
    expect(d.subScores.experience.active).toBe(false);
    expect(d.subScores.education.active).toBe(false);
    expect(d.subScores.certs.active).toBe(false);
    expect(d.subScores.reqSkills.value).toBe(1);
    expect(d.result.score).toBe(100);
  });

  it("returns 0 when nothing is stated", () => {
    expect(score(profile(), job({ description: "", skills: [], title: "Wizard" }), tax).score).toBe(0);
  });

  it("applies related-skill edge weight", () => {
    const d = scoreDetailed(profile({ skills: ["FP&A"] }), job({ description: "Budgeting required.", skills: ["Budgeting"], title: "x" }), tax);
    expect(d.subScores.reqSkills.value).toBeCloseTo(0.7);
    expect(d.result.evidence.join("|")).toContain("Related required skill");
    expect(d.result.gaps).toEqual([{ skill: "Budgeting", importance: "required" }]);
  });

  it("scores experience below, in, and far above band", () => {
    const sub = (y: number) => scoreDetailed(profile({ yearsExperience: y }), job(), tax).subScores.experience.value;
    expect(sub(2)).toBeCloseTo(0.5 ** 1.5);
    expect(sub(5)).toBe(1);
    expect(sub(9)).toBe(1);
    expect(sub(10)).toBe(1); // no over-experience penalty (age proxy)
    expect(sub(30)).toBe(1);
  });

  it("scores education levels", () => {
    const ed = (education: string[], description: string, y = 2) =>
      scoreDetailed(profile({ education, yearsExperience: y }), job({ description }), tax).subScores.education.value;
    expect(ed(["BS Finance"], "Bachelor's degree required.")).toBe(1);
    expect(ed(["BA History"], "Bachelor's degree required.")).toBe(0.8);
    expect(ed(["Associate degree"], "Bachelor's degree or equivalent experience required.", 6)).toBe(0.8);
    expect(ed(["Associate degree"], "Bachelor's degree preferred.")).toBe(0.3);
    expect(ed([], "Master's degree preferred.")).toBe(0);
  });

  it("scores certifications with in-progress and bonus", () => {
    const d = (certifications: string[], skills: string[], desc: string) =>
      scoreDetailed(profile({ certifications }), job({ skills, description: desc }), tax).subScores.certs.value;
    expect(d(["CPA"], ["CPA"], "CPA preferred.")).toBe(1);
    expect(d(["CFA candidate"], ["CFA"], "CFA required.")).toBe(0.5);
    expect(d([], ["CPA", "CMA"], "CPA required. CMA preferred.")).toBe(0);
    expect(d(["CPA", "CMA"], ["CPA", "CMA"], "CPA required. CMA preferred.")).toBe(1);
    expect(d(["CPA"], ["CMA"], "CMA preferred.")).toBeCloseTo(0.1);
  });

  it("scores title gaps", () => {
    const t = (title: string) => scoreDetailed(profile({ titles: ["Staff Accountant"] }), job({ title }), tax).subScores.title.value;
    expect(t("Staff Accountant")).toBe(1);
    expect(t("Senior Accountant")).toBe(1);
    expect(t("Accounting Manager")).toBe(0.6);
    expect(t("Controller")).toBe(0.3);
    const low = scoreDetailed(profile({ titles: ["Controller"] }), job({ title: "Senior Accountant" }), tax);
    expect(low.subScores.title.value).toBe(1); // overqualified is never penalised
    const minus1 = scoreDetailed(profile({ titles: ["Senior Accountant"] }), job({ title: "Staff Accountant" }), tax);
    expect(minus1.subScores.title.value).toBe(1);
  });

  it("clearance gate caps at 69 and quotes the posting; clearance holder passes", () => {
    const j = job({ description: "Active Secret clearance required. Excel, FP&A required." });
    const r = score(profile({ skills: ["Excel", "FP&A", "Power BI"] }), j, tax);
    expect(r.score).toBeLessThanOrEqual(69);
    expect(r.evidence.join("|")).toContain("Active Secret clearance required.");
    expect(r.recommendation.action).toBe("stretch");
    expect(r.explanation).toContain("Posting requires");
    const ok = scoreDetailed(profile({ certifications: ["Secret Clearance"] }), j, tax);
    expect(ok.gates[0]?.passed).toBe(true);
  });

  it("clearance gate needs firm wording and quotes the posting", () => {
    const ix = indexTaxonomy(tax);
    const g = (description: string) => extractRequirements(job({ description }), ix).clearance;
    expect(g("Must hold a current Secret clearance.")).toBe("Must hold a current Secret clearance.");
    expect(g("Secret clearance preferred.")).toBeNull();
    expect(g("Able to obtain a Secret clearance. Active clearance a plus.")).toBeNull();
    expect(g("Candidates eligible for Secret clearance required.")).toBeNull();
    expect(g("Employer will sponsor an active Secret clearance.")).toBeNull();
    expect(g("No clearance needed.")).toBeNull();
  });

  it("failed soft gate with a low score is skip, not stretch", () => {
    const j = job({ title: "x", skills: ["SQL", "GAAP", "Treasury"], description: "Active Secret clearance required. SQL, GAAP, Treasury required." });
    const r = score(profile({ skills: ["Excel"] }), j, tax);
    expect(r.score).toBeLessThan(45);
    expect(r.recommendation.action).toBe("skip");
  });

  it("in-progress license failing the gate recommends stretch; missing one recommends skip", () => {
    const j = job({ skills: ["Excel", "FP&A", "CPA"], description: "CPA required. Excel, FP&A required." });
    const prog = score(profile({ certifications: ["CPA eligible"] }), j, tax);
    expect(prog.score).toBeLessThanOrEqual(59);
    expect(prog.score).toBeGreaterThanOrEqual(45);
    expect(prog.recommendation.action).toBe("stretch");
    expect(score(profile(), j, tax).recommendation.action).toBe("skip");
    const low = score(profile({ skills: [], certifications: ["CPA eligible"] }), j, tax);
    expect(low.score).toBeLessThan(45);
    expect(low.recommendation.action).toBe("skip");
  });

  it("license and degree gates cap at 59 and recommend skip", () => {
    const lic = score(profile(), job({ skills: ["Excel", "CPA"], description: "CPA required. Excel required." }), tax);
    expect(lic.score).toBeLessThanOrEqual(59);
    expect(lic.recommendation.action).toBe("skip");
    const deg = scoreDetailed(profile({ education: ["Associate degree"] }), job({ description: "Master's degree required. Excel required." }), tax);
    expect(deg.gates.find((g) => g.type === "degree")?.passed).toBe(false);
    expect(deg.result.score).toBeLessThanOrEqual(59);
    const held = scoreDetailed(profile({ certifications: ["CPA"] }), job({ skills: ["CPA"], description: "CPA required." }), tax);
    expect(held.gates[0]?.passed).toBe(true);
  });

  it("recommendation rules", () => {
    const rec = (p: CandidateProfile, j: Job) => score(p, j, tax).recommendation.action;
    const skills = ["Excel", "FP&A", "SQL", "GAAP", "Treasury"];
    const mk = (n: number) => job({ title: "x", skills: skills.slice(0, 5), description: `${n} years required. ${skills.join(", ")} required.` });
    expect(rec(profile({ skills: skills.slice(0, 3), yearsExperience: 5 }), mk(5))).toBe("tailor");
    expect(rec(profile({ skills: ["Excel"], yearsExperience: 1 }), mk(5))).toBe("skip");
    // 64 points but 3 required skills missing: tailor needs <= 2 missing
    expect(score(profile({ skills: skills.slice(0, 2), yearsExperience: 5 }), mk(5), tax).score).toBeGreaterThanOrEqual(60);
    expect(rec(profile({ skills: skills.slice(0, 2), yearsExperience: 5 }), mk(5))).toBe("stretch");
    const stretch = score(profile({ skills: ["Excel", "FP&A"], yearsExperience: 2 }), job({ title: "x", skills, description: `3 years required. ${skills.join(", ")} required.` }), tax);
    expect(stretch.score).toBeGreaterThanOrEqual(45);
    expect(stretch.score).toBeLessThan(60);
    expect(stretch.recommendation.action).toBe("stretch");
  });

  it("band edges follow bandFor", () => {
    expect([59, 60, 79, 80].map(bandFor)).toEqual(["Weak", "Moderate", "Moderate", "Strong"]);
  });

  it("property: always 0-100; adding a matched skill never lowers the score", () => {
    const pool = ["Excel", "FP&A", "SQL", "GAAP", "Treasury", "Power BI", "Budgeting", "Forecasting"];
    for (const j of seed) {
      let prev = -1;
      for (let n = 0; n <= pool.length; n++) {
        const s = score(profile({ skills: pool.slice(0, n) }), j, tax);
        expect(s.score).toBeGreaterThanOrEqual(0);
        expect(s.score).toBeLessThanOrEqual(100);
        expect(MatchResultSchema.safeParse(s).success).toBe(true);
        if (prev >= 0) expect(s.score).toBeGreaterThanOrEqual(prev);
        prev = s.score;
      }
    }
  });

  it("scores 500 jobs in under 1 s", () => {
    const jobs = Array.from({ length: 500 }, (_, i) => ({ ...seed[i % seed.length]!, id: `p${i}` }));
    const t = performance.now();
    for (const j of jobs) score(profile(), j, tax);
    expect(performance.now() - t).toBeLessThan(1000);
  });
});

describe("rankResults", () => {
  it("orders by score, gate, recency, id", () => {
    const mk = (jobId: string, s: number, gate = false) => ({
      jobId, score: s, band: bandFor(s), evidence: gate ? ["Gate (clearance) caps score at 69."] : [], gaps: [],
      explanation: "", recommendation: { action: "apply" as const, text: "" },
    });
    const jobs = [
      { id: "a", postedAt: "2026-11-01T00:00:00.000Z" }, { id: "b", postedAt: "2026-11-02T00:00:00.000Z" },
      { id: "c", postedAt: "2026-11-02T00:00:00.000Z" }, { id: "d", postedAt: "2026-11-03T00:00:00.000Z" },
    ];
    const out = rankResults([mk("a", 70), mk("b", 70), mk("c", 70), mk("d", 70, true), mk("z", 90)], jobs).map((r) => r.jobId);
    expect(out).toEqual(["z", "b", "c", "a", "d"]);
    const mixed = rankResults([mk("a", 60, true), mk("b", 59)], jobs).map((r) => r.jobId);
    expect(mixed).toEqual(["a", "b"]);
  });
});

describe("skillGaps", () => {
  const jobs = [
    job({ id: "g1", title: "x", skills: ["Excel", "Treasury", "SQL"], description: "Excel, Treasury, SQL required." }),
    job({ id: "g2", title: "x", skills: ["Excel", "Treasury", "SQL"], description: "Excel, Treasury, SQL required." }),
    job({ id: "g3", title: "x", skills: ["SQL", "Treasury", "Budgeting", "Zorbl"], description: "SQL, Treasury, Budgeting, Zorbl required." }),
    job({ id: "g4", title: "x", skills: ["Excel", "Treasury", "Budgeting", "CPA"], description: "Excel, Treasury, Budgeting required. CPA preferred." }),
  ];
  const p = profile({ skills: ["Excel", "Treasury", "Budgeting"], yearsExperience: 1 });
  const results = jobs.map((j) => score(p, j, tax));

  it("ranks gaps by band upgrades, excludes Weak jobs, skips unknown terms", () => {
    const gaps = skillGaps(p, results, jobs, tax);
    expect(results.map((r) => r.band)).toEqual(["Moderate", "Moderate", "Weak", "Moderate"]);
    expect(gaps[0]).toMatchObject({ gap: "SQL", kind: "skill", jobsMissing: 2 });
    expect(gaps[0]!.bandUpgrades).toBeGreaterThanOrEqual(1);
    const cpa = gaps.find((g) => g.kind === "cert");
    expect(cpa?.bandUpgrades).toBe(1);
    expect(cpa?.link).toContain("aicpa");
    expect(gaps.some((g) => g.gap === "Zorbl")).toBe(false);
    expect(gaps.length).toBeLessThanOrEqual(10);
  });

  it("honours topN, show and unknown job ids", () => {
    expect(skillGaps(p, results, jobs, tax, { show: 1 })).toHaveLength(1);
    expect(skillGaps(p, results, [], tax)).toEqual([]);
    expect(skillGaps(p, results, jobs, tax, { topN: 1 }).every((g) => g.jobsMissing === 1)).toBe(true);
  });

  it("cert without a link has null link; cert what-if uses certifications", () => {
    const j = job({ id: "c1", title: "x", skills: ["Excel", "CTP"], description: "Excel required. CTP preferred." });
    const r = [score(p, j, tax)];
    const g = skillGaps(p, r, [j], tax);
    expect(g.find((x) => x.kind === "cert")?.link).toBeNull();
  });
});
