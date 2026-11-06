import { createServerFn } from "@tanstack/react-start";
import { appAccessMiddleware } from "@/lib/account/guard";
import { getSql } from "@/lib/db";
import { notify } from "@/lib/unibud/server";
type Sql = Awaited<ReturnType<typeof getSql>>;

async function ensureWallet(sql: Sql, userId: string) {
  await sql`insert into wallets (user_id, balance_kobo, savings_kobo) values (${userId}, 0, 0) on conflict (user_id) do nothing`;
  const rows = await sql<{ balance_kobo: number; savings_kobo: number; member_no: string }>`
    select balance_kobo, coalesce(savings_kobo, 0) as savings_kobo, coalesce(member_no, '') as member_no from wallets where user_id = ${userId} limit 1`;
  const row = rows[0] ?? { balance_kobo: 0, savings_kobo: 0, member_no: "" };
  if (!row.member_no) {
    const memberNo = `FC${userId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}`;
    await sql`update wallets set member_no = ${memberNo} where user_id = ${userId} and member_no = ''`;
    row.member_no = memberNo;
  }
  return row;
}

async function who(sql: Sql, userId: string) {
  const rows = await sql<{ name: string; handle: string }>`
    select coalesce(nullif(p.display_name, ''), nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''), a.username, 'Member') as name,
      coalesce(nullif(p.handle, ''), a.username, 'member') as handle
    from unibud_accounts a
    left join connect_profiles p on p.user_id = a.user_id
    where a.user_id = ${userId}
    limit 1`;
  return rows[0] ?? { name: "Member", handle: "member" };
}

function kobo(value: number) {
  return Number.isInteger(value) && value >= 10000 && value <= 50_000_000_00 ? value : null;
}

export const flowHome = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const wallet = await ensureWallet(sql, context.userId);
    const me = await who(sql, context.userId);
    const tx = await sql<{ id: string; type: string; amount_kobo: number; counterparty: string; note: string; created_at: string }>`
      select id, type, amount_kobo, counterparty, note, created_at from wallet_tx where user_id = ${context.userId} order by created_at desc limit 30`;
    return {
      name: me.name,
      handle: me.handle,
      memberNo: wallet.member_no,
      shareKobo: Number(wallet.balance_kobo),
      savingsKobo: Number(wallet.savings_kobo),
      activity: tx.map((row) => ({
        id: row.id,
        type: row.type,
        amountKobo: Number(row.amount_kobo),
        counterparty: row.counterparty,
        note: row.note,
        at: String(row.created_at),
      })),
    };
  });

export const fundShare = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { kobo: number }) => input)
  .handler(async ({ context, data }) => {
    const amount = kobo(data.kobo);
    if (!amount) return { ok: false as const, error: "Enter between ₦100 and ₦500,000." };
    const sql = await getSql();
    await ensureWallet(sql, context.userId);
    await sql`update wallets set balance_kobo = balance_kobo + ${amount}, updated_at = now() where user_id = ${context.userId}`;
    await sql`insert into wallet_tx (id, user_id, type, amount_kobo, status, counterparty, note)
      values (${crypto.randomUUID()}, ${context.userId}, ${"deposit"}, ${amount}, ${"posted"}, ${"Shares"}, ${"Added to your share account."})`;
    return { ok: true as const };
  });

export const moveSavings = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { kobo: number; direction: "to-savings" | "to-share" }) => input)
  .handler(async ({ context, data }) => {
    const amount = kobo(data.kobo);
    if (!amount) return { ok: false as const, error: "Enter between ₦100 and ₦500,000." };
    const sql = await getSql();
    const wallet = await ensureWallet(sql, context.userId);
    if (data.direction === "to-savings") {
      if (Number(wallet.balance_kobo) < amount) return { ok: false as const, error: "Not enough in shares." };
      await sql`update wallets set balance_kobo = balance_kobo - ${amount}, savings_kobo = savings_kobo + ${amount}, updated_at = now() where user_id = ${context.userId}`;
      await sql`insert into wallet_tx (id, user_id, type, amount_kobo, status, counterparty, note)
        values (${crypto.randomUUID()}, ${context.userId}, ${"to_savings"}, ${amount}, ${"posted"}, ${"Savings"}, ${"Moved from shares to savings."})`;
    } else {
      if (Number(wallet.savings_kobo) < amount) return { ok: false as const, error: "Not enough in savings." };
      await sql`update wallets set balance_kobo = balance_kobo + ${amount}, savings_kobo = savings_kobo - ${amount}, updated_at = now() where user_id = ${context.userId}`;
      await sql`insert into wallet_tx (id, user_id, type, amount_kobo, status, counterparty, note)
        values (${crypto.randomUUID()}, ${context.userId}, ${"to_share"}, ${amount}, ${"posted"}, ${"Shares"}, ${"Moved from savings to shares."})`;
    }
    return { ok: true as const };
  });

export const payMember = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { handle: string; kobo: number; note: string }) => input)
  .handler(async ({ context, data }) => {
    const amount = kobo(data.kobo);
    if (!amount) return { ok: false as const, error: "Enter between ₦100 and ₦500,000." };
    const handle = data.handle.replace(/^@+/, "").trim().toLowerCase();
    if (handle.length < 3) return { ok: false as const, error: "Enter their @handle." };
    const sql = await getSql();
    const peers = await sql<{ user_id: string }>`
      select a.user_id from unibud_accounts a
      left join connect_profiles p on p.user_id = a.user_id
      where lower(coalesce(p.handle, '')) = ${handle} or lower(coalesce(a.username, '')) = ${handle}
      limit 1`;
    const peer = peers[0]?.user_id;
    if (!peer) return { ok: false as const, error: "No member with that handle." };
    if (peer === context.userId) return { ok: false as const, error: "You cannot pay yourself." };
    const wallet = await ensureWallet(sql, context.userId);
    if (Number(wallet.balance_kobo) < amount) return { ok: false as const, error: "Not enough in shares." };
    await ensureWallet(sql, peer);
    const me = await who(sql, context.userId);
    const note = data.note.trim().slice(0, 140) || "Member payment";
    await sql`update wallets set balance_kobo = balance_kobo - ${amount}, updated_at = now() where user_id = ${context.userId}`;
    await sql`update wallets set balance_kobo = balance_kobo + ${amount}, updated_at = now() where user_id = ${peer}`;
    await sql`insert into wallet_tx (id, user_id, type, amount_kobo, status, counterparty, note)
      values (${crypto.randomUUID()}, ${context.userId}, ${"pay"}, ${amount}, ${"posted"}, ${"@" + handle}, ${note})`;
    await sql`insert into wallet_tx (id, user_id, type, amount_kobo, status, counterparty, note)
      values (${crypto.randomUUID()}, ${peer}, ${"receive"}, ${amount}, ${"posted"}, ${"@" + me.handle}, ${note})`;
    try {
      await notify(peer, "money", `Payment from ${me.name} (@${me.handle})`, note, "/flow");
    } catch {
      /* The ledger still moved. */
    }
    return { ok: true as const };
  });
