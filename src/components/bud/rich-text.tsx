import type { ReactNode } from "react";

const NAV_RE = /^NAV:(\/[A-Za-z0-9/_-]*)\s*$/m;

const LABELS: Record<string, string> = {
  "/": "Square",
  "/money": "Wallet",
  "/market": "Market",
  "/riff": "Riff",
  "/connect": "Connect",
  "/communities": "Communities",
  "/board": "UniBoard",
  "/studies": "Studies",
  "/watch": "Watch",
  "/profile": "Profile",
  "/settings": "Settings",
  "/fixer": "The Fixer",
  "/search": "Search",
};

export function splitBudNav(text: string): { body: string; nav?: { to: string; label: string } } {
  const m = text.match(NAV_RE);
  if (!m) return { body: text.trim() };
  const to = m[1];
  return {
    body: text.replace(NAV_RE, "").trim(),
    nav: { to, label: LABELS[to] ?? to.replace(/^\//, "") },
  };
}

/** Render Bud text as conversation, not raw markdown. */
export function BudRichText({ text }: { text: string }) {
  const { body, nav } = splitBudNav(text);
  const blocks = body.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, i) => (
        <Block key={i} text={block.trim()} />
      ))}
      {nav ? (
        <a
          href={nav.to}
          className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper"
        >
          Open {nav.label}
        </a>
      ) : null}
    </div>
  );
}

function Block({ text }: { text: string }) {
  const vis = text.match(/^\[\[bud-visual\]\]([\s\S]+)$/);
  if (vis) {
    return (
      <div
        className="overflow-hidden rounded-2xl bg-secondary p-3"
        dangerouslySetInnerHTML={{ __html: vis[1] }}
      />
    );
  }
  const heading = text.match(/^(#{1,3})\s+(.+)$/);
  if (heading) {
    return <p className="font-semibold">{inline(heading[2])}</p>;
  }
  const lines = text.split("\n");
  const list = lines.every((l) => /^\s*([-*]|\d+\.)\s+/.test(l));
  if (list) {
    return (
      <ul className="space-y-1 pl-4">
        {lines.map((l, i) => (
          <li key={i} className="list-disc">
            {inline(l.replace(/^\s*([-*]|\d+\.)\s+/, ""))}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p>
      {lines.map((l, i) => (
        <span key={i}>
          {i ? <br /> : null}
          {inline(l)}
        </span>
      ))}
    </p>
  );
}

function inline(raw: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|`[^`]+`|<u>[^<]+<\/u>)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(raw))) {
    if (m.index > last) out.push(raw.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) out.push(<strong key={k}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("__") || token.startsWith("<u>")) {
      const inner = token.startsWith("__") ? token.slice(2, -2) : token.slice(3, -4);
      out.push(
        <span key={k} className="underline decoration-foreground/40 underline-offset-2">
          {inner}
        </span>,
      );
    } else if (token.startsWith("*")) out.push(<em key={k}>{token.slice(1, -1)}</em>);
    else out.push(<code key={k} className="rounded bg-secondary px-1 text-[0.85em]">{token.slice(1, -1)}</code>);
    k += 1;
    last = m.index + token.length;
  }
  if (last < raw.length) out.push(raw.slice(last));
  return out;
}

export function plainBudText(text: string) {
  return splitBudNav(text)
    .body.replace(/\*\*|__|#+\s+|`|<u>|<\/u>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
