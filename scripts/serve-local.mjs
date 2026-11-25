// Local server for sandboxes where `netlify dev` cannot start (it needs Deno for edge functions).
// Bundles netlify/functions/*.ts, mounts each by config.path, serves apps/web/dist,
// and backs @netlify/blobs with a file-based BlobsServer. No extra dependencies.
// Not a production path. Rate limits and CDN caching are not emulated.
import { build } from "esbuild";
import { BlobsServer } from "@netlify/blobs/server";
import { createServer } from "node:http";
import { readdir, readFile, stat, mkdir, rm } from "node:fs/promises";
import { Readable } from "node:stream";
import { extname, join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const fnDir = join(root, "netlify/functions");
const distDir = join(root, "apps/web/dist");
const outDir = join(root, ".netlify/local-functions");
const dataDir = join(root, ".netlify/local-blobs");
const port = Number(process.env.PORT ?? 8888);
process.env.CONTEXT ??= "dev";

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain",
};

// 1. Blobs substitute.
await mkdir(dataDir, { recursive: true });
const blobs = new BlobsServer({ directory: dataDir, token: "local-token" });
const { port: blobsPort } = await blobs.start();
const blobsUrl = `http://127.0.0.1:${blobsPort}`;
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(
  JSON.stringify({ edgeURL: blobsUrl, uncachedEdgeURL: blobsUrl, token: "local-token", siteID: "local-site" }),
).toString("base64");

// 2. Bundle and load functions.
await rm(outDir, { recursive: true, force: true });
const entries = (await readdir(fnDir)).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts")).map((f) => join(fnDir, f));
await build({
  entryPoints: entries, outdir: outDir, bundle: true, platform: "node", format: "esm",
  target: "node22", packages: "external", outExtension: { ".js": ".mjs" }, logLevel: "warning",
});
const routes = [];
for (const file of entries) {
  const name = file.slice(fnDir.length + 1).replace(/\.ts$/, "");
  const mod = await import(pathToFileURL(join(outDir, `${name}.mjs`)).href);
  const paths = [].concat(mod.config?.path ?? []);
  for (const p of paths) {
    const keys = [];
    const re = new RegExp("^" + p.replace(/:([A-Za-z_]+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "/?$");
    routes.push({ re, keys, handler: mod.default, methods: mod.config?.method, p });
  }
}

// 3. HTTP server.
async function serveStatic(pathname) {
  let rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, "");
  const candidates = [rel, join(rel, "index.html")];
  for (const c of candidates) {
    const abs = resolve(distDir, c);
    if (abs !== distDir && !abs.startsWith(distDir + sep)) continue;
    const s = await stat(abs).catch(() => null);
    if (s?.isFile()) return { abs, status: 200 };
  }
  if (pathname.startsWith("/guide/")) return null;
  return { abs: join(distDir, "index.html"), status: 200 };
}

const server = createServer(async (nodeReq, nodeRes) => {
  const url = new URL(nodeReq.url ?? "/", `http://${nodeReq.headers.host ?? "localhost"}`);
  try {
    const route = routes.find((r) => r.re.test(url.pathname));
    if (route) {
      const m = url.pathname.match(route.re);
      const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const hasBody = !["GET", "HEAD"].includes(nodeReq.method);
      const req = new Request(url, {
        method: nodeReq.method, headers: nodeReq.headers,
        body: hasBody ? Readable.toWeb(nodeReq) : undefined, duplex: "half",
      });
      const context = {
        params, ip: nodeReq.socket.remoteAddress, requestId: crypto.randomUUID(),
        site: { id: "local-site", name: "local", url: `http://localhost:${port}` },
        waitUntil() {}, cookies: {}, geo: {}, account: { id: "local" }, deploy: { id: "local" },
        server: { region: "local" }, flags: {},
      };
      const res = await route.handler(req, context);
      nodeRes.writeHead(res.status, Object.fromEntries(res.headers));
      if (res.body) Readable.fromWeb(res.body).pipe(nodeRes);
      else nodeRes.end();
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      nodeRes.writeHead(404, { "Content-Type": "application/json" });
      nodeRes.end('{"error":"not_found"}');
      return;
    }
    const file = await serveStatic(url.pathname);
    if (!file) { nodeRes.writeHead(404); nodeRes.end("Not found"); return; }
    const body = await readFile(file.abs);
    nodeRes.writeHead(200, {
      "Content-Type": MIME[extname(file.abs)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    nodeRes.end(body);
  } catch (err) {
    console.error("local server error:", err instanceof Error ? err.message : "unknown");
    if (!nodeRes.headersSent) nodeRes.writeHead(500, { "Content-Type": "application/json" });
    nodeRes.end('{"error":"internal"}');
  }
});

server.listen(port, () => {
  console.log(`Local server: http://localhost:${port}  (${routes.length} routes, blobs in .netlify/local-blobs)`);
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, async () => { server.close(); await blobs.stop(); process.exit(0); });
