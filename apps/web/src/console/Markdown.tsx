// Minimal, safe markdown: code fences, paragraphs, "- " lists, `code` and **bold**.
// Builds React text nodes only. No dangerouslySetInnerHTML, no links, no raw HTML.
import type { ReactNode } from "react";

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(tok.startsWith("`") ? <code key={`${keyBase}-${i++}`}>{tok.slice(1, -1)}</code> : <strong key={`${keyBase}-${i++}`}>{tok.slice(2, -2)}</strong>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const parts = text.split(/```[^\n]*\n?/);
  return (
    <div className="stack">
      {parts.map((part, pi) => {
        if (pi % 2 === 1) return <pre key={pi} className="mono text-sm" style={{ overflowX: "auto" }}><code>{part}</code></pre>;
        return part
          .split(/\n{2,}/)
          .filter((b) => b.trim())
          .map((block, bi) => {
            const lines = block.split("\n");
            const key = `${pi}-${bi}`;
            if (lines.every((l) => /^\s*[-*] /.test(l))) {
              return <ul key={key}>{lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*[-*] /, ""), `${key}-${li}`)}</li>)}</ul>;
            }
            return <p key={key} style={{ whiteSpace: "pre-wrap" }}>{inline(block, key)}</p>;
          });
      })}
    </div>
  );
}
