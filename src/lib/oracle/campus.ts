import { formatNaira } from "@/lib/unibud/format";
import type { getSql } from "@/lib/db";

type Sql = Awaited<ReturnType<typeof getSql>>;

/** Places Bud may name. Injected with every reply. Never shown as a menu. */
export function campusSystemBrief() {
  return [
    "UNIBUD PLACES — quote only these routes and only figures from the live record. Do not invent people, balances, scores, titles, bookings, or payments.",
    "Flow /flow: member share account and savings. Add to shares records an amount on the ledger; it is not pulled from a bank. Move between shares and savings. Pay another real member by @handle and both balances change. Not a licensed bank. Nothing leaves UNIBUD.",
    "Sport /sport: fixtures a member posted. A score exists only after that member records it as live or full time. The table uses full-time matches only.",
    "Cinema /watch: titles a member published and has the right to show. My List and progress belong to the signed-in member. There is no studio catalogue and no video file.",
    "Orders /orders: handover after an ask-to-buy on Market. Asked, then accepted (listing reserved), then ready, then collected (listing sold). Cancel on an accepted or ready order makes the listing available again. No card payment.",
    "Market /market: real listings. Asking to buy does not pay.",
    "Connect /connect, SouLync /connect/soulync, Wayward /connect/wayward, Chat /messages, Board /board, Quad /communities, Square /.",
    "Concierge /guild/concierge is a separate desk. Do not recite its duty, responsibilities, or action list. If they ask about Concierge, tell them to open that desk.",
  ].join("\n");
}

export async function memberSnapshot(sql: Sql, userId: string) {
  const wallet = await sql<{ balance_kobo: number; savings_kobo: number; member_no: string }>`
    select balance_kobo, coalesce(savings_kobo, 0) as savings_kobo, coalesce(member_no, '') as member_no
    from wallets where user_id = ${userId} limit 1`;
  const w = wallet[0];
  const tx = await sql<{ type: string; amount_kobo: number; counterparty: string; note: string }>`
    select type, amount_kobo, counterparty, note from wallet_tx where user_id = ${userId} order by created_at desc limit 5`;
  const orders = await sql<{ title: string; status: string; role: string }>`
    select l.title, o.status, case when l.owner_user_id = ${userId} then 'selling' else 'buying' end as role
    from market_offers o
    join listings l on l.id = o.listing_id
    where o.buyer_id = ${userId} or l.owner_user_id = ${userId}
    order by o.created_at desc limit 8`;
  const open = orders.filter((row) => row.status === "pending" || row.status === "accepted" || row.status === "ready");
  const sport = await sql<{ competition: string; home_name: string; away_name: string; home_score: number | null; away_score: number | null; status: string }>`
    select competition, home_name, away_name, home_score, away_score, status from sport_matches order by created_at desc limit 8`;
  const cinema = await sql<{ title: string; genre: string }>`
    select title, genre from cinema_titles order by created_at desc limit 8`;
  const share = w ? formatNaira(Number(w.balance_kobo)) : formatNaira(0);
  const savings = w ? formatNaira(Number(w.savings_kobo)) : formatNaira(0);
  const member = w?.member_no || "not issued until they open Flow";
  const activity = tx.length
    ? tx.map((row) => `${row.type} ${formatNaira(Number(row.amount_kobo))} ${row.counterparty} — ${row.note}`).join("; ")
    : "none";
  const orderLine = orders.length
    ? orders.map((row) => `${row.role} “${row.title}” ${row.status}`).join("; ")
    : "none";
  const sportLine = sport.length
    ? sport.map((row) => {
        const score = row.home_score == null ? "no score" : `${row.home_score}-${row.away_score}`;
        return `${row.home_name} vs ${row.away_name} (${row.competition}) ${row.status} ${score}`;
      }).join("; ")
    : "none posted";
  const cinemaLine = cinema.length ? cinema.map((row) => `${row.title} [${row.genre}]`).join("; ") : "none published";
  return [
    "LIVE RECORD — quote these figures only. If a list says none, say it is empty. Do not round, invent, or recall a different number.",
    `Flow shares ${share}. Savings ${savings}. Member number ${member}. Recent ledger: ${activity}.`,
    `Orders on record: ${orderLine}. Open (asked, accepted, or ready): ${open.length}.`,
    `Sport fixtures: ${sportLine}.`,
    `Cinema titles: ${cinemaLine}.`,
  ].join("\n");
}

/** Used only when the model itself is unavailable. A person speaking, not a status sheet. */
export function campusFallback(prompt: string, facts: string) {
  const q = prompt.toLowerCase();
  if (/\b(concierge|duty desk|your duty)\b/.test(q)) {
    return "Concierge is its own desk, under Guild. It shows what it is responsible for and the places it can open. I don’t take that job, and I won’t read the duty list here.";
  }
  const flow = facts.split("\n").find((line) => line.startsWith("Flow ")) ?? "";
  const orders = facts.split("\n").find((line) => line.startsWith("Orders")) ?? "";
  const sport = facts.split("\n").find((line) => line.startsWith("Sport")) ?? "";
  const cinema = facts.split("\n").find((line) => line.startsWith("Cinema")) ?? "";
  const bits: string[] = [];
  if (/\b(flow|wallet|shares?|savings|balance|member number|how much|paid|received)\b/.test(q)) bits.push(speakFlow(flow));
  if (/\b(order|handover|collected|reserved)\b/.test(q)) bits.push(orders.replace(/\.$/, "") + ".");
  if (/\b(sport|fixture|football|score|table)\b/.test(q)) bits.push(sport.endsWith(".") ? sport : `${sport}.`);
  if (/\b(cinema|movie|film|title)\b/.test(q) && !/\b(subtitle)\b/.test(q)) bits.push(cinema.endsWith(".") ? cinema : `${cinema}.`);
  if (!bits.length) return "I’m here. Ask me the actual thing — a balance, a score, an order, or where to go. I won’t guess, and I won’t read you a status sheet.";
  return bits.filter(Boolean).join(" ");
}

function speakFlow(line: string) {
  const share = line.match(/Flow shares ([^.]+)/)?.[1] ?? "zero naira";
  const savings = line.match(/Savings ([^.]+)/)?.[1] ?? "zero naira";
  const member = line.match(/Member number ([^.]+)/)?.[1] ?? "";
  const recent = line.match(/Recent ledger: ([^.]+)/)?.[1] ?? "none";
  const memberLine = /not issued/i.test(member) ? "You don’t have a member number until you open Flow." : `Member number ${member}.`;
  const ledger = recent === "none" ? "" : ` Last movement: ${recent}.`;
  return `Shares are ${asNaira(share)}. Savings are ${asNaira(savings)}. ${memberLine}${ledger}`;
}

function asNaira(raw: string) {
  const digits = raw.replace(/[^\d,]/g, "");
  if (!digits || digits === "0") return "zero naira";
  return `${digits} naira`;
}
