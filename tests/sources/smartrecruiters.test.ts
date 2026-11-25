import { describe, expect, it } from "vitest";
import { fetchSmartRecruiters, normalizeSmartRecruiters } from "../../packages/sources/src/smartrecruiters";

const posting = (over: Record<string, unknown> = {}) => ({
  id: "744000161597129",
  name: "Senior Financial Analyst",
  releasedDate: "2026-11-14T00:34:36.779Z",
  company: { name: "NBCUniversal" },
  location: { city: "Orlando", region: "FL", country: "us", remote: false, fullLocation: "Orlando, FL, United States" },
  ...over,
});

describe("smartrecruiters", () => {
  it("keeps Orlando finance postings with a real https link", () => {
    const j = normalizeSmartRecruiters(posting(), "NBCUniversal3", "NBCUniversal");
    expect(j?.url).toBe("https://jobs.smartrecruiters.com/NBCUniversal3/744000161597129");
    expect(j?.source).toBe("smartrecruiters");
  });
  it("drops non-finance and non-Orlando postings", () => {
    expect(normalizeSmartRecruiters(posting({ name: "Camera Operator" }), "X", "X")).toBeNull();
    expect(normalizeSmartRecruiters(posting({ location: { city: "Denver", fullLocation: "Denver, CO" } }), "X", "X")).toBeNull();
  });
  it("rejects bad company ids and pages until a short page", async () => {
    await expect(fetchSmartRecruiters("../x", "X")).rejects.toThrow("smartrecruiters_bad_company");
    let calls = 0;
    const fake = (async () => {
      calls++;
      return new Response(JSON.stringify({ content: [posting()] }), { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;
    const jobs = await fetchSmartRecruiters("NBCUniversal3", "NBCUniversal", fake);
    expect(jobs).toHaveLength(1);
    expect(calls).toBe(1);
  });
});
