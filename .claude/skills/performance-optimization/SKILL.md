---
name: performance-optimization
description: Performance budgets and techniques for Finance Match Orlando — Core Web Vitals (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1), 200 KB route JS, list virtualization, CDN caching, glass-effect cost, function latency and Claude latency. Use when a page or endpoint is slow or before merging UI-heavy changes.
metadata:
  owner: mobile-pwa-expert
  backups: [qa-engineer, netlify-engineer]
  version: 1.0.0
---

# Performance Optimization

## Inputs → Outputs
- Inputs: Lighthouse CI, field data, bundle report.
- Outputs: Changes that keep budgets green.

## Purpose
Feel instant on a mid-range Android phone over 4G.

## Use when
- Adding a dependency, animation, glass effect or large list.
- Lighthouse CI or field data regresses.

## Budgets
| Metric | Budget |
|---|---|
| LCP | ≤ 2.5 s (mobile, simulated throttling) |
| INP | ≤ 200 ms |
| CLS | ≤ 0.1 |
| JS per route (gzip) | ≤ 200 KB |
| `/api/jobs` p95 | ≤ 300 ms (CDN cached) |
| Explanation first token | ≤ 3 s |

## Techniques
- Code-split by route; lazy-load the Agent Console.
- Virtualize job lists > 50 items.
- Compute scores in a pure module; memoize filtered lists.
- `backdrop-filter` is costly: limit glass to tab bar, nav bar and sheets (skill: apple-liquid-glass-design); provide opaque fallback.
- Cache `/api/jobs` at the CDN (also saves Free-plan credits, ADR 0003).
- Stream Claude responses; prompt-cache stable system prompts (skill: claude-api).

## Checklist
- [ ] Lighthouse CI budgets pass
- [ ] Bundle analyzer checked for new deps
- [ ] Tested with 4× CPU throttle

## Common mistakes
- Optimizing desktop only.
- Blocking first render on fonts or the service worker.

## Best practices
- Measure on a throttled phone profile
- Budget per route
- Cache at the CDN
- Limit glass effects

## References
- https://web.dev/articles/vitals
- https://web.dev/articles/lcp · https://web.dev/articles/inp · https://web.dev/articles/cls
