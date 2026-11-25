// In-memory stand-in for @netlify/blobs getStore (strong consistency, conditional writes).
type Entry = { data: unknown; etag: string };
const stores = new Map<string, Map<string, Entry>>();
let n = 0;

export function resetBlobs(): void {
  stores.clear();
}

export function getStore(opts: { name: string } | string) {
  const name = typeof opts === "string" ? opts : opts.name;
  if (!stores.has(name)) stores.set(name, new Map());
  const m = stores.get(name)!;
  return {
    async get(key: string) {
      const e = m.get(key);
      return e ? structuredClone(e.data) : null;
    },
    async getWithMetadata(key: string) {
      const e = m.get(key);
      return e ? { data: structuredClone(e.data), etag: e.etag, metadata: {} } : null;
    },
    async setJSON(key: string, data: unknown, o: { onlyIfNew?: boolean; onlyIfMatch?: string } = {}) {
      const cur = m.get(key);
      if (o.onlyIfNew && cur) return { modified: false };
      if (o.onlyIfMatch && cur?.etag !== o.onlyIfMatch) return { modified: false };
      const etag = `e${++n}`;
      m.set(key, { data: structuredClone(data), etag });
      return { modified: true, etag };
    },
    async list({ prefix = "" }: { prefix?: string } = {}) {
      return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key, etag: m.get(key)!.etag })), directories: [] };
    },
  };
}
