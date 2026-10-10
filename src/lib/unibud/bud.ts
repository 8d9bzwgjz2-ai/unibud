import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { mapBud } from "./map";

const SYSTEM = `You are Bud, the campus assistant inside UNIBUD — a student operating environment for Nigerian universities (UNILAG, UNN, UI, ABU, OAU, UNIBEN, LASU, FUTA, UNIPORT, Covenant, and others).

You help with: the campus marketplace (hostels, food, thrift, services), study planning, communities, and student life. Money inside UNIBUD is a demo ledger only — never imply that real naira, banks, cards, or NELFUND disbursements moved.

Rules:
- Be concise, specific, and warm. No slang overload, no emoji.
- Never write assignments, exam answers, or work a student should submit as their own. You may explain a concept they already attempted.
- Never give medical, legal, or financial advice as fact. Point to official sources.
- If asked to do something the app cannot do, say so plainly.
- Prefer short paragraphs and tight lists.`;

export const listBudMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`select * from bud_messages where user_id = ${context.userId} order by created_at asc limit 40`;
    return rows.map(mapBud);
  });

export const sendBudMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((content: string) => content.trim().slice(0, 2000))
  .handler(async ({ context, data: content }) => {
    if (!content) throw new Error("Write something first");
    const sql = await getSql();
    await sql`insert into bud_messages (id, user_id, role, content)
      values (${crypto.randomUUID()}, ${context.userId}, ${"user"}, ${content})`;

    const history = await sql<{ role: string; content: string }>`
      select role, content from bud_messages
      where user_id = ${context.userId}
      order by created_at desc
      limit 12`;
    const messages = history
      .reverse()
      .map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));

    const apiKey = process.env.XAI_API_KEY;
    let reply: string;
    if (!apiKey) {
      reply =
        "Bud is offline in this environment. Browse Market for listings, Money for the demo ledger, or Studies for your semester — then ask again later.";
    } else {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          max_tokens: 500,
          messages: [{ role: "system", content: SYSTEM }, ...messages],
        }),
      });
      if (!res.ok) {
        reply = "Bud hit a snag talking to the model. Try again in a moment.";
      } else {
        const body = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        reply = body.choices?.[0]?.message?.content?.trim() || "I went quiet. Ask me again.";
      }
    }

    await sql`insert into bud_messages (id, user_id, role, content)
      values (${crypto.randomUUID()}, ${context.userId}, ${"assistant"}, ${reply})`;
    const rows = await sql`select * from bud_messages where user_id = ${context.userId} order by created_at asc limit 40`;
    return rows.map(mapBud);
  });
