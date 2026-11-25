# Adverse impact — the four-fifths rule

Source: 29 CFR 1607.4(D), https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XIV/part-1607/section-1607.4 (read 2026-11-25)

"A selection rate for any race, sex, or ethnic group which is less than four-fifths (4/5) (or eighty percent) of the rate for the group with the highest rate will generally be regarded by the Federal enforcement agencies as evidence of adverse impact, while a greater than four-fifths rate will generally not be regarded … as evidence of adverse impact. Smaller differences in selection rate may nevertheless constitute adverse impact, where they are significant in both statistical and practical terms … Greater differences … may not constitute adverse impact where the differences are based on small numbers and are not statistically significant."

How we use it: we collect no protected attributes. Before any weight change learned from outcomes, run synthetic cohorts that vary only a suspected proxy (e.g. employment gap, school name) and compare "Green" rates. Ratio < 0.8 blocks the change pending review (skill `fairness-in-hiring`).
