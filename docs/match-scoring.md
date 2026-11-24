# Candidate–Job Match Scoring and Explanation Engine

Research date: 2026-11-24. Covers research items (4) scoring and (5) explanations.

## 1. Design principles

1. **Code computes the score. The model does not.** Claude extracts structured requirements from the job and structured facts from the resume. A pure TypeScript function scores them. Same inputs, same score, every time.
2. **Hard gates sit outside the weights.** A missing clearance or license is not "10% worse". It usually ends the application. Gates cap the score.
3. **Missing data does not punish the candidate.** If a job states no education rule, that weight is redistributed.
4. **Everything is versioned.** Weights, taxonomy and extraction prompt each carry a version. Every stored score records them.
5. **Explanations come from score evidence.** Claude writes prose, but only from the computed evidence object. It cannot change the score.

## 2. Job requirement extraction

Claude reads each new job once (cached by `contentHash`) and returns:

```ts
type JobRequirements = {
  schemaVersion: "1.0";
  requiredSkills: string[];            // raw phrases from "Required/Qualifications"
  preferredSkills: string[];           // "Preferred/Nice to have/a plus"
  minYears?: number;
  maxYears?: number;                   // upper end of stated band
  education?: { minDegree: "none" | "high_school" | "associate" | "bachelor" | "master"; fields?: string[]; equivalentExperienceAllowed: boolean; equivalentYears?: number };
  requiredCertifications: string[];
  preferredCertifications: string[];
  industry?: string;                   // NAICS sector label
  domainKeywords: string[];            // e.g. "EVM", "rent rolls", "revenue management"
  hardGates: Array<{ type: "clearance" | "citizenship" | "license" | "degree" | "other"; value: string; quote: string }>;
  workArrangement: "onsite" | "hybrid" | "remote" | "unknown";
  travelPercent?: number;
  seniorityLevel?: 1 | 2 | 3 | 4 | 5;
};
```

Code then maps raw phrases to canonical taxonomy IDs (see `resume-analysis.md`). Each hard gate must carry the exact `quote` from the posting. The UI shows it.

Example from a real Orlando posting (AMERICAN SYSTEMS, Senior Financial Analyst, 2026-11-11):

- requiredSkills: Deltek Costpoint reporting, reconciliation, analysis
- preferredSkills: EVM
- minYears 5, maxYears 7, education bachelor
- hardGates: clearance = Secret ("Active Secret Clearance")
- workArrangement: hybrid (3 days in office)

## 3. Sub-score definitions

Each sub-score is a number from 0 to 1.

### 3.1 Required skills (S_req)

```
S_req = Σ best_match(req_i) / N_req
best_match = 1.0 exact canonical match
           = edge weight (0.3–0.8) via taxonomy "related" edge
           = 0.0 otherwise
```

Evidence bonus: a skill backed by a quantified bullet ("built 3-statement model for $40M BU") counts fully. A skill listed only in a skills section counts 0.85.

### 3.2 Years of experience (S_exp)

Let `y` = candidate's relevant finance years. Let `[min, max]` = posted band.

```
if y >= min and y <= max + 3:   S_exp = 1.0
if y < min:                     S_exp = max(0, 1 - (min - y) / min) ^ 1.5   (steeper below band)
if y > max + 3:                 S_exp = 0.85                                  (mild over-qualification)
if no band stated:              weight redistributed
```

Example: min 5, candidate 3 years → (1 − 2/5)^1.5 = 0.46.

### 3.3 Education (S_edu)

| Candidate vs requirement | Score |
|---|---|
| Meets or exceeds degree, field matches (finance, accounting, economics, business) | 1.0 |
| Meets degree, unrelated field | 0.8 |
| One level below, posting allows equivalent experience and candidate has the years | 0.8 |
| One level below, no equivalence | 0.3 |
| Two or more levels below | 0.0 |

If the degree is a hard requirement with no equivalence, it is also a gate (section 4).

### 3.4 Certifications (S_cert)

```
required certs: each earned = 1, in_progress = 0.5, missing = 0 (and may trigger a gate)
preferred certs: each earned = 1, in_progress = 0.5, missing = 0
S_cert = 0.7 * avg(required) + 0.3 * avg(preferred)   when both exist
       = avg(whichever exists)
no certs mentioned → weight redistributed
Bonus: a strong cert the job did not ask for (CPA, CFA charter) adds +0.1, capped at 1.0
```

### 3.5 Industry experience (S_ind)

| Candidate history | Score |
|---|---|
| Same industry (NAICS sector) in last 5 years | 1.0 |
| Adjacent industry (map in `data/taxonomy/industries.v1.json`, e.g. aerospace ↔ defense contracting) | 0.6 |
| Domain keywords matched (e.g. EVM, rent rolls) without same industry | 0.5 |
| None | 0.2 |

### 3.6 Preferred skills (S_pref)

Same formula as required skills, over preferred skills. If none listed, redistribute.

### 3.7 Location and arrangement (S_loc)

| Job | Candidate | Score |
|---|---|---|
| Remote | any | 1.0 |
| Hybrid/on-site in Orlando MSA | lives in MSA, accepts arrangement | 1.0 |
| Hybrid/on-site in MSA | lives in MSA, prefers remote only | 0.4 |
| Hybrid/on-site in MSA | lives outside FL, willing to relocate | 0.6 |
| Hybrid/on-site in MSA | outside FL, not relocating | 0.0 |

### 3.8 Weight redistribution

```
active = criteria the job actually states
score = Σ_{c in active} w_c * S_c / Σ_{c in active} w_c
```

## 4. Hard gates

Gate checks run before weights.

| Gate | Candidate state | Effect |
|---|---|---|
| Clearance required | has it (or higher) | pass |
| Clearance required | none, but US citizen | cap final score at **69** (Yellow); explain "clearance obtainable only through sponsor" |
| Clearance required | not a US citizen | cap at **40** (Red) |
| License required (Series 7, CPA "required") | missing | cap at **59** (Red) |
| Degree required, no equivalence | missing | cap at **59** |
| Work authorization | needs sponsorship, posting says no sponsorship | cap at **40** |

Caps come from the posting quote, so the user sees exactly why.

## 5. Weighting models

All rows sum to 100.

| Criterion | A. Initial (given) | B. Skills-first | C. Experience-first | D. Recommended (gated + seniority) |
|---|---|---|---|---|
| Required skills | 30 | 35 | 25 | 30 |
| Years of experience | 20 | 15 | 30 | 20 |
| Education | 15 | 10 | 10 | 10 |
| Certifications | 10 | 10 | 10 | 10 |
| Industry experience | 10 | 10 | 10 | 10 |
| Preferred skills | 10 | 15 | 5 | 10 |
| Title / seniority alignment | — | — | — | 5 |
| Location / arrangement | 5 | 5 | 10 | 5 |
| Hard-gate caps | no | no | no | **yes** |

Model notes:

- **A. Initial.** Reasonable baseline. Education at 15% over-weights a factor that nearly every candidate meets (every Orlando sample required a bachelor's). It has no gate handling.
- **B. Skills-first.** Fits entry and analyst roles, where tools (Excel, ERP, BI) separate candidates.
- **C. Experience-first.** Fits manager roles, where years and scope matter most.
- **D. Recommended.** Moves 5 points from education to title/seniority alignment. Adds hard gates.

### 5.1 Title / seniority alignment (S_title), used in model D

```
gap = job.seniorityLevel - candidate.currentLevel
S_title = 1.0 if gap in {0, 1}      (same level or one step up: normal career move)
        = 0.6 if gap == 2
        = 0.7 if gap == -1          (step down)
        = 0.3 otherwise
```

### 5.2 Role-family presets

Model D is the default. Apply a preset by role family:

| Family | Preset |
|---|---|
| analyst (levels 1–2) | D with skills +5, experience −5 |
| senior_analyst (level 3) | D as listed |
| manager (level 4+) | D with experience +5, preferred skills −5, certifications +5, required skills −5 |

### 5.3 Why model D

- Postings show hard requirements (clearance, licenses) that a linear sum cannot express.
- Nearly every posting requires a bachelor's, so education carries little signal. Lower weight is better.
- Recruiters screen on title progression first. Model D measures it.
- Presets reflect how requirements shift with seniority.

### 5.4 Calibration plan

- Start with model D as fixed rules.
- With user consent, log outcomes: applied, interview, offer.
- After ~300 labelled applications, fit a logistic regression on the sub-scores. Use the fitted coefficients to adjust weights. Keep gates as rules.
- Publish each weight change as a new `weightsVersion`.

## 6. Bands

| Band | Range | Label |
|---|---|---|
| Green | 80–100 | Strong Match |
| Yellow | 60–79 | Moderate Match |
| Red | 0–59 | Weak Match |

Round the final score to the nearest whole number before banding.

## 7. Score output

```ts
type MatchResult = {
  jobId: string;
  profileHash: string;
  score: number;                     // 0-100
  band: "green" | "yellow" | "red";
  weightsVersion: "D-1.0";
  taxonomyVersion: "skills.v1";
  subScores: Record<"reqSkills" | "experience" | "education" | "certs" | "industry" | "prefSkills" | "title" | "location", { value: number; weight: number; active: boolean }>;
  gates: Array<{ type: string; quote: string; passed: boolean; cap?: number }>;
  evidence: {
    matchedRequired: Array<{ skill: string; via: "exact" | "related"; resumeQuote?: string }>;
    missingRequired: string[];
    matchedPreferred: string[];
    missingPreferred: string[];
    missingCerts: string[];
    experience: { candidateYears: number; band?: [number, number] };
  };
};
```

## 8. Explanation engine

### 8.1 Flow

1. Compute `MatchResult` in code.
2. Send only `MatchResult` + job title + employer + short profile summary to Claude. Do not send the raw resume or raw posting again.
3. Claude returns a fixed JSON shape (structured outputs):

```ts
type MatchExplanation = {
  headline: string;                        // one sentence
  keyStrengths: string[];                  // 2-5 bullets
  missingSkills: Array<{ skill: string; dealBreaker: "likely" | "possible" | "unlikely"; why: string }>;
  missingCertifications: Array<{ cert: string; dealBreaker: "likely" | "possible" | "unlikely" }>;
  experienceGap: string | null;
  resumeImprovements: string[];            // concrete edits, each tied to evidence
  applicationRecommendation: "apply_now" | "apply_with_tailoring" | "stretch_apply" | "skip_for_now";
  interviewReadiness: { level: "ready" | "needs_prep" | "not_ready"; prepTopics: string[] };
  futureActions?: string[];                // for Red: courses, certs, projects
};
```

4. Validate in code: every skill named in the explanation must exist in `evidence`. Drop anything else.
5. Cache by `(jobId, profileHash, weightsVersion)`.

### 8.2 Band-specific prompt rules

- **Green:** name the requirements met closely. Say what makes the candidate competitive. Suggest tailoring for the top 2 keywords.
- **Yellow:** list met requirements. List gaps. Judge each gap as deal-breaker likely/possible/unlikely. Required + gate = likely. Required without gate = possible. Preferred = unlikely.
- **Red:** name the major gaps first. Give 2–4 concrete future actions (a certification, a tool course, a project, a bridge role).

### 8.3 Deterministic fallback

If the Claude call fails, render a template explanation from `evidence` alone. The dashboard must never block on the model.

### 8.4 Recommendation rules (code, not model)

| Condition | Recommendation |
|---|---|
| Green, no failed gates | apply_now |
| Yellow, no failed gates, ≤ 2 missing required | apply_with_tailoring |
| Yellow with one failed soft gate | stretch_apply |
| Red or a failed hard gate | skip_for_now |

The model writes the reasons. The code picks the recommendation.

### 8.5 Interview readiness rules (code)

- `ready`: Green and every required skill has a quantified bullet.
- `needs_prep`: Green/Yellow with required skills listed but not evidenced.
- `not_ready`: Red.
- `prepTopics`: missing or weakly evidenced required skills, plus role staples (e.g., "walk through a variance analysis" for FP&A).

## 9. Cost control

- One requirement extraction per job, ever (content-hash cache).
- One profile extraction per resume version.
- Scoring is free (code).
- Explanations are generated lazily, when the user opens a job card, then cached.
- Use prompt caching on the fixed system prompt. Cached reads do not count toward input-token rate limits.

## 10. Acceptance criteria

- Re-scoring the same profile and job returns the identical score and sub-scores.
- Every gate shown in the UI quotes the posting.
- Explanations mention no skill missing from `evidence` (automated check).
- On a 100-pair labelled set rated by a finance recruiter, band agreement ≥ 80%.
- Score computation for 500 jobs completes in < 1 s in the browser or function.

## Sources

- Live Orlando postings, 2026-11-24 (AMERICAN SYSTEMS, Reyes Beverage Group, Berkadia), for gate and requirement patterns.
- Claude structured outputs, prompt caching and rate limit docs. https://platform.claude.com/docs/en/api/rate-limits
- schema.org JobPosting `experienceRequirements`, `educationRequirements`, `experienceInPlaceOfEducation`. https://schema.org/JobPosting
