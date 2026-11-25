# Netlify Functions — limits and configuration

Sources (read 2026-11-24/25): https://docs.netlify.com/build/functions/configuration/ · https://docs.netlify.com/build/functions/get-started/ · https://docs.netlify.com/build/functions/background-functions/ · https://docs.netlify.com/build/functions/scheduled-functions/ · https://docs.netlify.com/build/functions/lambda-compatibility/

## Default values
| Setting | Default | Configurable? |
|---|---|---|
| Region | `cmh` (US East, Ohio) | Yes |
| Memory | 1024 MB | Yes (`memory: "2gb"`) |
| Synchronous execution limit | 60 seconds | No |
| Scheduled execution limit | 30 seconds | No |
| Background execution limit | 15 minutes | No |
| Buffered request/response payload | 6 MB | No |
| Streamed response payload | 20 MB | No |
| Background request/response payload | 256 KB | No |

## Modern signature
```ts
export default async (req: Request, context: Context) => new Response("Hello, world!");
export const config: Config = { path: "/hello" };
```
Default directory: `netlify/functions/`.

## Background functions
- Enable with `background: true` in config, or name the file `*-background`.
- Client gets an empty **202** immediately; the function runs up to 15 minutes.
- On error: "a retry happens after one minute. If it fails again, another retry happens two minutes later."
- Available on credit-based plans including Free.
- No response streaming; send results elsewhere (we use Blobs).

## Scheduled functions
- `export const config = { schedule: "@hourly" }` or cron in `netlify.toml` `[functions."name"] schedule = "…"`; UTC.
- 30-second limit; run only on published deploys (not Deploy Previews or branch deploys); can't be invoked by URL; no streaming. "Run now" in the UI for testing.

## Legacy Lambda-compatible streaming
Uses a `stream` wrapper; documented "10 second execution limit" and "20 MB response size limit". Use the modern API for new code.
