---
name: finance-job-market-analysis
description: Orlando-Kissimmee-Sanford finance labor market facts — BLS OEWS May 2025 employment and wages (analysts 3,110 jobs, mean $98,990; median $90,020), employers hiring now, sectors, qualifications seen in postings, how to refresh data. Use for salary bands, employer lists, market claims or domain review.
metadata:
  owner: finance-job-market-specialist
  backups: [candidate-job-matching-expert, job-data-integration-expert]
  version: 1.0.0
---

# Finance Job Market Analysis (Orlando)

## Inputs → Outputs
- Inputs: BLS data, live postings, employer registry.
- Outputs: Dated, sourced market facts and salary bands.

## Purpose
Ground every market claim in dated, sourced data.

## Use when
- Showing salary estimates when a posting has none.
- Seeding or reviewing the employer registry.
- Answering "what do Orlando employers want?"

## Key data (BLS OEWS, May 2025, Orlando MSA 36740)
| SOC | Occupation | Jobs | Mean wage |
|---|---|---|---|
| 11-3031 | Financial Managers | 6,190 | $163,860 |
| 13-2011 | Accountants & Auditors | 10,410 | $88,080 |
| 13-2041 | Credit Analysts | 550 | $84,170 |
| 13-2051 | Financial & Investment Analysts | 3,110 | $98,990 |
| 13-2052 | Personal Financial Advisors | 2,100 | $148,990 |
| 13-2054 | Financial Risk Specialists | 420 | $107,380 |
| 13-2072 | Loan Officers | 2,260 | $79,580 |

13-2051 percentiles: 10th $61,600 · 25th $71,890 · median $90,020 · 75th $115,570 · 90th $140,150.
National (BLS OOH): analysts' median $102,740 (May 2025); growth 7% 2025–2035.

## Employers seen hiring (live sample 2026-11-24)
Lockheed Martin, L3Harris, AMERICAN SYSTEMS, Jacobs, Berkadia, Reyes Beverage Group, Prosegur, Beep, FedEx, NBCUniversal/Universal Orlando, SeaWorld/United Parks. Also track Disney, Darden, Marriott Vacations Worldwide, Hilton Grand Vacations, AdventHealth, Orlando Health, JPMorgan Chase, Deloitte (Lake Mary), Northrop Grumman.

## Refresh
- OEWS publishes each spring: query BLS API series `OEUM0036740000000{SOC}{datatype}` (01 employment, 04 annual mean, 11–15 percentiles). Refresh within 30 days.
- Label every figure with source and reference month.

## Common mistakes
- Using national pay for Orlando (Orlando runs lower).
- Presenting a one-day posting sample as a census.

## Best practices
- Always cite source and reference month
- Use Orlando MSA data, not national, for pay
- Re-sample postings before quoting specifics

## Checklist
- [ ] Figures dated and linked
- [ ] Salary estimates labelled as estimates
- [ ] Refreshed within 30 days of OEWS release

## References
- https://data.bls.gov/timeseries/OEUM003674000000013205104
- https://www.bls.gov/ooh/business-and-financial/financial-analysts.htm
- docs/orlando-finance-market.md
