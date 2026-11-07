import type { ReactNode } from "react";
import { UnibudMark } from "./logo";
import { cn } from "@/lib/utils";

/**
 * Product identity lockups.
 *
 * Square carries the welcome wordmark. Every other product leads with the UNIBUD
 * mark plus its own name, so the ecosystem reads as one family without repeating
 * the wordmark across the interface.
 */
const PRODUCTS = {
  square: { name: "Square", line: "Campus feed" },
  connect: { name: "Connect", line: "People & opportunity" },
  quad: { name: "Quad", line: "Communities" },
  chat: { name: "Chat", line: "Messages" },
  flow: { name: "Flow", line: "Student money" },
  quarter: { name: "The Quarter", line: "Marketplace" },
  soulync: { name: "SouLync", line: "Matching" },
  riff: { name: "Riff", line: "Conversation" },
  board: { name: "Board", line: "Creator studio" },
  watch: { name: "Cinema", line: "Watch" },
} as const;

export type ProductId = keyof typeof PRODUCTS;

export function ProductLockup({
  product,
  className,
  children,
}: {
  product: ProductId;
  className?: string;
  children?: ReactNode;
}) {
  const p = PRODUCTS[product];
  return (
    <header className={cn("flex items-center gap-3", className)}>
      <UnibudMark className="size-9 shrink-0" />
      <span aria-hidden className="h-9 w-px shrink-0 bg-border" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
          {p.line}
        </p>
        <h1 className="mt-0.5 font-display text-[1.75rem] leading-none tracking-tight">{p.name}</h1>
      </div>
      {children ? <div className="ml-auto flex items-center gap-2">{children}</div> : null}
    </header>
  );
}
