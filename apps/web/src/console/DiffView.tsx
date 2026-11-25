// Unified diff with +/- markers AND text labels, so meaning never relies on colour (skill accessibility-wcag).
export type DiffLine = { kind: "add" | "del" | "ctx" | "meta"; text: string };

export function parseDiff(diff: string): DiffLine[] {
  return diff
    .split("\n")
    .filter((l) => !l.startsWith("====") && !l.startsWith("\\ No newline"))
    .map((l): DiffLine => {
      if (l.startsWith("+++") || l.startsWith("---") || l.startsWith("@@") || l.startsWith("Index:")) return { kind: "meta", text: l };
      if (l.startsWith("+")) return { kind: "add", text: l.slice(1) };
      if (l.startsWith("-")) return { kind: "del", text: l.slice(1) };
      return { kind: "ctx", text: l.startsWith(" ") ? l.slice(1) : l };
    });
}

const LABEL = { add: "Added", del: "Removed", ctx: "Unchanged", meta: "" } as const;
const SIGN = { add: "+", del: "−", ctx: " ", meta: "" } as const;
const STYLE = {
  add: { background: "var(--band-strong-bg)", color: "var(--band-strong-fg)" },
  del: { background: "var(--band-weak-bg)", color: "var(--band-weak-fg)" },
  ctx: {},
  meta: { color: "var(--text-secondary)", fontWeight: 600 },
} as const;

export function DiffView({ diff }: { diff: string }) {
  const lines = parseDiff(diff);
  const added = lines.filter((l) => l.kind === "add").length;
  const removed = lines.filter((l) => l.kind === "del").length;
  return (
    <section aria-label="Changes" className="stack">
      <p className="text-sm">
        {added} lines added, {removed} lines removed
      </p>
      <ol className="mono text-sm" style={{ listStyle: "none", padding: 0, margin: 0, overflowX: "auto" }}>
        {lines.map((l, i) => (
          <li key={i} style={{ ...STYLE[l.kind], whiteSpace: "pre", padding: "0 0.5rem" }}>
            {l.kind !== "meta" ? <span aria-hidden="true">{SIGN[l.kind]} </span> : null}
            {l.kind !== "meta" && l.kind !== "ctx" ? <span className="visually-hidden">{LABEL[l.kind]}: </span> : null}
            {l.text || " "}
          </li>
        ))}
      </ol>
    </section>
  );
}
