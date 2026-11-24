# Long-Running Operations

Research date: 2026-11-24. Goal: run work that exceeds a normal request inside Netlify's limits.

## 1. Limits to design around

| Function type | Limit | Payload | Returns to client |
|---|---|---|---|
| Synchronous | 60 s | 6 MB buffered; 20 MB streamed | Yes |
| Background | 15 min | 256 KB | `202` immediately; no body |
| Scheduled | 30 s | n/a | No; cannot be called by URL |

Background retries: after a failure, Netlify retries after 1 minute, then again 2 minutes later. So **every background job must be idempotent**.

## 2. Which pattern for which job

| Job | Typical time | Pattern |
|---|---|---|
| Resume parse + profile extraction | 5–25 s | Synchronous, with progress UI |
| Score all open jobs for one profile | < 1 s compute | Synchronous (code only) |
| First-time explanation for a job card | 3–10 s | Synchronous streaming |
| Agent chat turn | 5–60 s | Synchronous streaming |
| Ingest all sources | minutes | Scheduled → fan-out → background |
| Extract requirements for new jobs | seconds each, many jobs | Background, batched (≤ 25 per invocation) |
| Agent multi-file analysis / proposal | 1–10 min | Background task with progress |
| Retention cleanup | < 1 min | Scheduled → background |

## 3. Streaming responses

Use streaming when the user waits for model text.

```ts
// netlify/functions/agent-chat.mts
export default async (req: Request) => {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const stream = client.messages.stream({ /* model, system, tools, messages */ });
      stream.on("text", (t) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t })}\n\n`)));
      const final = await stream.finalMessage();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, stop: final.stop_reason })}\n\n`));
      controller.close();
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
};
```

- The synchronous 60-second limit still applies. Cap `max_tokens` and effort so a turn ends in time.
- If a turn might exceed it, switch to a background task and stream progress by polling (section 5).
- Verify streaming duration on Netlify's modern Functions API in the first spike. The legacy Lambda-compatible streaming API documents a 10-second limit.

## 4. Queue-based workflow (no external queue)

Netlify has no built-in queue. Build a small one on Blobs plus background functions.

```
enqueue(task)                         worker (background fn)
 ├─ id = ulid()                        ├─ load task/{id}.json (strong consistency)
 ├─ write task/{id}.json               ├─ if status in (done, failed) → exit (idempotent)
 │   status=queued, attempt=0          ├─ acquire lease: write leaseUntil=now+14m if expired
 └─ POST /.netlify/functions/          ├─ run steps; after each step write progress + checkpoint
       worker-background {id}          ├─ on success: status=done, result ref
                                       └─ on error: attempt++, status=retrying|failed, error
```

Task record:

```ts
type Task = {
  id: string;
  type: "ingest" | "extract_requirements" | "agent_task" | "cleanup";
  status: "queued" | "running" | "retrying" | "done" | "failed" | "cancelled";
  attempt: number;
  maxAttempts: number;          // 3
  leaseUntil?: string;          // ISO; prevents two workers running at once
  progress: { step: string; done: number; total: number; message?: string };
  checkpoint?: unknown;         // e.g. last processed jobId
  input: { ref: string };       // pointer to Blobs, keeps payload < 256 KB
  resultRef?: string;
  error?: { code: string; message: string; retryable: boolean };
  createdAt: string; updatedAt: string; createdBy: string;
};
```

Rules:

- Pass only the task ID to the background function. Inputs live in Blobs. This keeps payloads under 256 KB.
- Use **strong consistency** for the `tasks` store, so workers see the latest state.
- **Lease** prevents double execution when Netlify retries while a previous run is still alive.
- **Checkpoint** after each unit of work. A retry resumes from the checkpoint.
- **Chunking:** a worker stops at ~12 minutes, writes a checkpoint, and enqueues itself for the rest.

## 5. Progress tracking

- `GET /api/tasks/:id` returns `status` and `progress`.
- The browser polls every 2 s while visible, every 10 s when hidden; stop on `done`/`failed`.
- The UI shows a progress bar with text ("Extracted 18 of 40 jobs").
- Use `aria-live="polite"` for updates.

## 6. Retries and failure recovery

| Error | Retryable | Action |
|---|---|---|
| Claude 429 / 529 / 5xx | Yes | Respect `retry-after`; exponential backoff with jitter (1 s, 2 s, 4 s … max 60 s); SDK already retries twice |
| Claude `stop_reason: refusal` | No (for that input) | Mark item failed with reason; continue batch |
| Claude `max_tokens` | Once | Retry with higher `max_tokens`, then fail |
| Schema validation failure | Once | Retry once; then store as `needs_review` |
| GitHub 409 / stale SHA | No | Mark proposal `stale`; ask agent to rebase |
| GitHub 403 secondary rate limit | Yes | Wait for `retry-after` |
| Job source 429/503 | Yes | Back off; skip source for this run after 3 failures |
| Netlify timeout (killed) | Yes | Lease expires; next run resumes from checkpoint |

- **Dead letters:** after `maxAttempts`, status `failed`. Admin page lists failed tasks with a "Retry" button.
- **Reaper:** the hourly scheduled function finds tasks `running` with an expired lease and re-enqueues them.

## 7. Scheduled fan-out

```ts
// netlify/functions/schedule-ingest.mts
import type { Config } from "@netlify/functions";

export default async () => {
  const employers = await registry.listActive();
  for (const batch of chunk(employers, 10)) {
    const id = await tasks.enqueue({ type: "ingest", input: await putInput(batch) });
    await fetch(`${process.env.URL}/.netlify/functions/worker-background`, {
      method: "POST",
      headers: { "x-internal-token": process.env.INTERNAL_TOKEN! },
      body: JSON.stringify({ id }),
    });
  }
};

export const config: Config = { schedule: "@hourly" };
```

- The scheduled function must finish in 30 s. It only enqueues and fires.
- Background functions are reachable by URL. Protect them with an internal token (secret env var) and reject requests without it.
- Schedules run only on the published production deploy.

## 8. When to move beyond Netlify

Consider an external queue/workflow service if any of these holds:

- Tasks routinely exceed 15 minutes and cannot be chunked.
- You need guaranteed exactly-once delivery or delayed jobs at scale.
- More than ~1,000 tasks per hour.

Options to evaluate then: a managed queue (e.g., Upstash QStash), or a workflow engine. Not needed for phase 1.

## 9. Acceptance criteria

- Killing a background run mid-way and letting Netlify retry produces no duplicate jobs, proposals or commits.
- Every task shows progress within 5 s of starting.
- A task that fails 3 times appears in the admin failed list with an error code.
- The scheduled function finishes in < 10 s with 100 employers registered.
- Requests to background functions without the internal token get 401.

## Sources

- Netlify, Configuration for functions (limits table). https://docs.netlify.com/build/functions/configuration/
- Netlify, Background Functions (15 min, 202, retry after 1 and 2 minutes). https://docs.netlify.com/build/functions/background-functions/
- Netlify, Scheduled Functions (30 s, UTC cron, published deploys only, not URL-invocable). https://docs.netlify.com/build/functions/scheduled-functions/
- Netlify, Lambda compatibility (legacy streaming limits). https://docs.netlify.com/build/functions/lambda-compatibility/
- Netlify Blobs (consistency options). https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- Claude API rate limits and errors (429, `retry-after`). https://platform.claude.com/docs/en/api/rate-limits
- GitHub REST rate limits. https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
