# Scoring model D — summary of the project spec

Source: project spec docs/match-scoring.md (https://github.com/isaacbredy27-cloud/Isaac_Agent_Team/blob/main/docs/match-scoring.md, 2026-11-24), built on the schema.org fields and live Orlando postings cited in the other notes in this folder.

Weights: required skills 30 · experience 20 · education 10 · certifications 10 · industry 10 · preferred skills 10 · title/seniority 5 · location 5.
Gates cap the score: clearance missing (citizen) 69 · not citizen 40 · required license 59 · required degree w/o equivalence 59 · sponsorship conflict 40.
Bands after rounding: Green ≥ 80 · Yellow 60–79 · Red ≤ 59. Criteria a job doesn't state are dropped and weights renormalized.
