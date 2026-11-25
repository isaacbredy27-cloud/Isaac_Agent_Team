# ADR 0001 — GitHub access uses one fine-grained PAT restricted to this repository

Status: Accepted · Date: 2026-11-25 · Decider: project lead

## Context

The Agent Console must commit approved changes to GitHub from a Netlify Function. GitHub offers classic PATs, fine-grained PATs and GitHub Apps. GitHub's docs say fine-grained tokens can be limited to "Only select repositories" and given per-permission access, and that "you should choose the minimal permissions necessary". Expiry can be 1–366 days or none; GitHub "highly recommend[s] adding an expiration".

## Decision

- Use **one fine-grained personal access token**.
- Repository access: **Only select repositories → `isaacbredy27-cloud/Isaac_Agent_Team`**.
- Permissions: **Contents: Read and write**. Metadata: Read (added automatically). Nothing else.
- Do **not** grant Workflows, Actions, Administration, Secrets, Pull requests or Issues.
- Expiration: **90 days**. Rotate before expiry and at once after any suspected leak.
- Store it only as the Netlify environment variable `GITHUB_TOKEN`, marked "Contains secret values", with a value set **only for the Production deploy context**.
- Only `netlify/functions/proposals-commit` reads it. Code refuses to commit if the variable is empty.

## Consequences

- Git Data API (blobs, trees, commits, refs) and Contents API calls work; they need "Contents" write.
- Workflow files (`.github/workflows/**`) cannot change through the token: GitHub requires "Workflows" write for them. This is a deliberate safety net.
- The token belongs to a person; if that person leaves, rotate to a new owner. Revisit a GitHub App if more than one repository or org-level policy is needed.
- Rate limits: 5,000 requests/hour; secondary limits of 80 content-creating requests/minute and 500/hour.

Referenced by: `docs/security.md`, `docs/agent-console.md`, skills `github-api`, `secrets-management`, `agent-console`.
