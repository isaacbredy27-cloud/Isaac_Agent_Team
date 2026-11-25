// Tiny GitHub Git Data API stand-in for e2e (port 8899). Synthetic repo test/repo.
// Implements the calls in netlify/functions/_lib/console/github.ts. Inspect with GET /__calls.
import { createServer } from "node:http";
import { createHash } from "node:crypto";

const port = Number(process.env.MOCK_GITHUB_PORT ?? 8899);
const sha = (s) => createHash("sha1").update(s).digest("hex");
const README = "# Finance Match Orlando docs\n\nStart here.\n";

const state = { head: sha("initial-commit"), commits: new Map(), calls: [] };
state.commits.set(state.head, { tree: sha("initial-tree"), parents: [] });
const blobs = new Map();

const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    let body;
    try {
      body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : undefined;
    } catch {
      return send(res, 400, { message: "bad json" });
    }
    if (url.pathname === "/__calls") return send(res, 200, { head: state.head, calls: state.calls });
    if (url.pathname === "/__reset" && req.method === "POST") {
      state.calls.length = 0;
      return send(res, 200, { ok: true });
    }
    const m = url.pathname.match(/^\/repos\/test\/repo(\/.*)$/);
    if (!m) return send(res, 404, { message: "not found" });
    const path = m[1];
    state.calls.push({ method: req.method, path, body });
    if (req.method === "GET" && path === "/git/ref/heads/main") return send(res, 200, { object: { sha: state.head } });
    let g;
    if (req.method === "GET" && (g = path.match(/^\/git\/commits\/([0-9a-f]{40})$/))) {
      const c = state.commits.get(g[1]);
      return c ? send(res, 200, { sha: g[1], tree: { sha: c.tree } }) : send(res, 404, { message: "no commit" });
    }
    if (req.method === "GET" && path.startsWith("/contents/")) {
      if (decodeURIComponent(path.slice("/contents/".length)) === "docs/README.md") {
        return send(res, 200, { type: "file", encoding: "base64", content: Buffer.from(README).toString("base64") });
      }
      return send(res, 404, { message: "Not Found" });
    }
    if (req.method === "POST" && path === "/git/blobs") {
      const id = sha(`blob:${body?.content}`);
      blobs.set(id, body?.content);
      return send(res, 201, { sha: id });
    }
    if (req.method === "POST" && path === "/git/trees") return send(res, 201, { sha: sha(`tree:${JSON.stringify(body?.tree)}`) });
    if (req.method === "POST" && path === "/git/commits") {
      const id = sha(`commit:${JSON.stringify(body)}`);
      state.commits.set(id, { tree: body.tree, parents: body.parents, message: body.message });
      return send(res, 201, { sha: id });
    }
    if (req.method === "PATCH" && path === "/git/refs/heads/main") {
      const c = state.commits.get(body?.sha);
      if (!c || c.parents[0] !== state.head) return send(res, 422, { message: "Update is not a fast forward" });
      state.head = body.sha;
      return send(res, 200, { object: { sha: state.head } });
    }
    return send(res, 404, { message: "not found" });
  });
}).listen(port, "127.0.0.1", () => console.log(`mock-github on ${port}`));
