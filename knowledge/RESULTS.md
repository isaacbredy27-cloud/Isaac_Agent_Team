# Example run results

Run: 2026-11-25T00:53:23.976Z · Node v22.23.5

| Agent | Example | Result | Last line of output |
|---|---|---|---|
| accessibility-specialist | contrast-check.mjs | PASS | OK: green/amber/red badge tokens pass 4.5:1; pure yellow fails, so amber uses dark text on a light chip |
| accessibility-specialist | target-size-and-axe.mjs | FAIL | Node.js v22.23.5 |
| agent-console-engineer | claude-sdk-auth-error.mjs | FAIL | Node.js v22.23.5 |
| agent-console-engineer | github-commit-flow.mjs | PASS | OK: atomic commit flow verified (6 calls in order, force:false, parents=[head]); stale proposal blocked |
| agent-console-engineer | tool-loop-propose-change.mjs | FAIL | Node.js v22.23.5 |
| ai-systems-engineer | cache-cost.mjs | PASS | OK: caching the 3k-token system prompt cuts monthly extraction cost from $44.20 to $34.56 |
| ai-systems-engineer | eval-compare.mjs | PASS | OK: candidate improves split accuracy 0.778 → 0.889 and reaches 100% gate recall → may ship (with lead's approval) |
| ai-systems-engineer | extraction-request.mjs | FAIL | Node.js v22.23.5 |
| candidate-job-matching-expert | four-fifths-check.mjs | PASS | OK: v1 ratio 0.952 passes; v2 ratio 0.667 < 0.8 → block weight change for review |
| candidate-job-matching-expert | rank-and-filter.mjs | PASS | OK: ties broken by gate, recency, salary presence, id; filters combine AND across groups, OR within |
| candidate-job-matching-expert | score-match.mjs | PASS | OK: score 81 (green); with Secret-clearance gate → 69 (yellow); deterministic and monotonic |
| finance-job-market-specialist | salary-estimate.mjs | PASS | OK: posted pay shown as posted; missing pay shown as a labelled BLS estimate band |
| finance-job-market-specialist | taxonomy-entry.mjs | PASS | OK: aliases unique, related weights 0.3–0.8, real posting phrases map to canonical ids |
| job-data-integration-expert | normalize-greenhouse.mjs | PASS | OK: normalized 2 real Greenhouse jobs; inOrlandoMsa=false,false |
| job-data-integration-expert | normalize-lever.mjs | PASS | OK: normalized 2 real Lever postings; first postedAt=2026-08-31T18:12:19.703Z |
| job-data-integration-expert | parse-jsonld-jobposting.mjs | PASS | OK: JSON-LD JobPosting parsed (3 yrs, bachelor, $85k–$105k, open) |
| meta-agent | lint-agent.mjs | PASS | OK: example agent clean; bad agent has 5 errors; all 18 real agents in .claude/agents pass |
| mobile-pwa-expert | installability-check.mjs | PASS | OK: Chromium reports 0 installability errors; SW controls page; offline reload served from cache |
| mobile-pwa-expert | sw-route-strategy.mjs | PASS | OK: 9 routes map to the documented strategies; private routes are network-only |
| netlify-engineer | blobs-task-queue.mjs | PASS | OK: crash → retry resumed from checkpoint; duplicate delivery skipped; no item processed twice |
| netlify-engineer | function-handler.mjs | PASS | OK: handler returns 405/401/400/200 correctly with private no-store caching |
| netlify-engineer | validate-netlify-toml.mjs | PASS | OK: netlify.toml parses; 2 header rules; schedule every 2h; no env secrets |
| orchestrator | plan-waves.mjs | PASS | OK: 6 tasks scheduled in 4 waves; cycles rejected |
| privacy-compliance-specialist | delete-my-data.mjs | PASS | OK: removed 6 keys across 5 stores; other user untouched; one audit event without content |
| privacy-compliance-specialist | retention-sweep.mjs | PASS | OK: 6 of 11 records due for deletion; opted-in recent file, active profile, open job and recent audit kept |
| qa-engineer | e2e-matches.mjs | FAIL | Node.js v22.23.5 |
| resume-analysis-expert | experience-math.mjs | PASS | OK: overlapping jobs merged; relevance-weighted finance years computed deterministically |
| resume-analysis-expert | extract-text.mjs | FAIL | Node.js v22.23.5 |
| security-expert | profile-encryption.mjs | PASS | OK: AES-256-GCM round-trip works; tampering detected by the auth tag |
| security-expert | secret-scan.mjs | PASS | OK: scanner flags Anthropic keys, GitHub PATs, private keys and build hooks; ignores clean code |
| security-expert | upload-validator.mjs | PASS | OK: 2 valid uploads accepted; 7 attacks rejected (double ext, null byte, spoofed type, bad zip, NTFS stream, oversize, legacy .doc) |
| software-architect | boundary-check.mjs | PASS | OK: pure scoring and client/server split enforced; functions may use the SDK and secrets |
| supabase-auth-engineer | profiles-rls-check.mjs | PASS | OK: profiles-rls.sql passes static RLS checks; 6 broken variants are caught |
| supabase-auth-engineer | require-role.mjs | PASS | OK: requireRole enforces profile role, aal2 and 600 s step-up; ignores user_metadata roles |
| supabase-auth-engineer | token-claims.mjs | PASS | OK: token-claims rejects expired, wrong issuer, non-authenticated role and missing sub |
| ui-designer-apple-liquid-glass | glass-legibility.mjs | PASS | OK: regular glass keeps dark text ≥ 4.5:1 over every worst-case background; clear glass does not → use regular for tab/nav bars |
| ui-designer-apple-liquid-glass | reduced-transparency-fallback.mjs | PASS | OK: glass on nav only; prefers-contrast: more removes blur; tab height ≥ 44 px |
| ux-designer-apple-hig | copy-readability.mjs | PASS | OK: 8 strings at grade ≤ 8 with sentences ≤ 20 words |

6 failed of 38.
