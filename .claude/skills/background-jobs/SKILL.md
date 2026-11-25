---
name: background-jobs
description: Long-running work on Netlify — scheduled fan-out, background functions, a Blobs-backed task queue with leases, checkpoints, retries, progress polling and dead letters. Use for ingestion, bulk extraction, agent tasks or anything that may exceed 60 seconds.
metadata:
  owner: netlify-engineer
  backups: [software-architect, job-data-integration-expert]
  version: 1.0.0
---

# Background Jobs

## Purpose
Run work longer than a request, idempotently, within Netlify limits.

## Use when
- A task may exceed 50 s, or processes many items.
- Scheduling recurring work (ingestion, retention cleanup).

## Inputs → Outputs
- Inputs: task type, input reference in Blobs.
- Outputs: `task/{id}.json` with status, progress, result ref; audit event.

## Pattern
```
schedule (≤30 s) → enqueue task/{id} (strong consistency) → POST worker-background {id} (+ internal token)
worker (≤15 min): load → skip if done → take lease (now+14 m) → run steps → checkpoint after each → done | retrying | failed
```

## Rules
- Pass **only the task ID** to background functions (256 KB limit; ADR 0004 forbids resume text in payloads).
- Use `getStore({ name: "tasks", consistency: "strong" })`.
- Idempotent steps: Netlify retries after 1 and 2 minutes on error.
- Lease prevents two workers on one task. Reaper re-queues expired leases.
- Chunk at ~12 minutes: checkpoint and re-enqueue.
- Max 3 attempts → `failed` → admin dead-letter list.
- Free plan: schedule ingestion every 2 hours (ADR 0003).

## Checklist
- [ ] Task schema in `packages/schemas`
- [ ] Lease + checkpoint + attempt counter
- [ ] Internal token check on worker
- [ ] Progress written within 5 s of start
- [ ] Retry test: kill mid-run, no duplicates

## Common mistakes
- Eventual-consistency reads of task state (up to 60 s stale).
- Expecting a background function to return data to the caller (it returns 202 only).
- Scheduled functions do not run on Deploy Previews.

## References
- https://docs.netlify.com/build/functions/background-functions/
- https://docs.netlify.com/build/functions/scheduled-functions/
- https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- docs/long-running-jobs.md
