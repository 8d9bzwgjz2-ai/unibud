import assert from "node:assert/strict";
import { test } from "node:test";
import type { Sql } from "../db.ts";
import { EMPTY_AI_COPY, aiQuotaError, generateAi } from "./gateway.ts";
import { getAIProvider, type AIProvider, type ProviderResult } from "./provider.ts";
import { AI_QUOTA_COPY } from "./usage.ts";

type Recorded = { text: string; values: unknown[] };

/** Minimal stand-in for the PostgreSQL client: records writes, returns rows. */
function fakeSql(rows: unknown[] = []): { sql: Sql; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const fn = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ text: strings.join("?"), values });
    return rows;
  }) as unknown as Sql;
  return { sql: fn, calls };
}

function stubProvider(result: ProviderResult | ((signal?: AbortSignal) => Promise<ProviderResult>)): AIProvider {
  return {
    id: "stub",
    kind: "remote",
    capabilities: ["text"],
    complete: (_messages, opts) =>
      typeof result === "function" ? result(opts?.signal) : Promise.resolve(result),
  };
}

const usage = { promptTokens: 5, completionTokens: 2, totalTokens: 7 };

test("a completion returns the model text and is ledgered as a success", async () => {
  const { sql, calls } = fakeSql();
  const result = await generateAi({
    sql,
    userId: "user-1",
    product: "bud",
    messages: [{ role: "user", content: "hi" }],
    provider: stubProvider({
      ok: true,
      text: "  answer  ",
      providerId: "oracle-arc",
      model: "arc-model",
      usage,
      latencyMs: 42,
    }),
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.text, "answer");
    assert.equal(result.providerId, "oracle-arc");
    assert.equal(result.model, "arc-model");
  }

  assert.equal(calls.length, 1);
  assert.match(calls[0]!.text, /insert into ai_usage/);
  const values = calls[0]!.values;
  assert.equal(values[1], "user-1");
  assert.equal(values[2], "bud");
  assert.equal(values[3], "oracle-arc");
  assert.equal(values[5], "ok");
  assert.equal(values[10], 42);
});

test("a provider failure is returned honestly and ledgered as an error", async () => {
  const { sql, calls } = fakeSql();
  const result = await generateAi({
    sql,
    userId: "user-1",
    product: "riff",
    messages: [{ role: "user", content: "hi" }],
    provider: stubProvider({
      ok: false,
      error: "Riff couldn’t reply just now. Try again.",
      providerId: "oracle-arc",
      code: "provider-error",
      latencyMs: 9,
    }),
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, "Riff couldn’t reply just now. Try again.");
    assert.equal(result.code, "provider-error");
  }
  // Nothing to show the user, but the failed call is still measurable.
  assert.equal(calls[0]!.values[5], "error");
  assert.equal(calls[0]!.values[6], "provider-error");
});

test("an empty completion is a failure, never a reply", async () => {
  const { sql } = fakeSql();
  const result = await generateAi({
    sql,
    userId: "user-1",
    product: "bud",
    messages: [{ role: "user", content: "hi" }],
    provider: stubProvider({ ok: true, text: "   ", providerId: "oracle-arc", model: "m" }),
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, EMPTY_AI_COPY);
    assert.equal(result.code, "bad-response");
  }
});

test("the gateway aborts a provider that runs past its timeout", async () => {
  const { sql } = fakeSql();
  const started = Date.now();
  const result = await generateAi({
    sql,
    userId: "user-1",
    product: "bud",
    messages: [{ role: "user", content: "hi" }],
    timeoutMs: 25,
    provider: stubProvider(
      (signal) =>
        new Promise<ProviderResult>((resolve) => {
          signal?.addEventListener(
            "abort",
            () =>
              resolve({
                ok: false,
                error: "The assistant stopped that reply.",
                providerId: "stub",
                code: "stopped",
              }),
            { once: true },
          );
        }),
    ),
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "stopped");
  assert.ok(Date.now() - started < 1_000);
});

test("the daily quota blocks a user at the limit with honest copy", async () => {
  const previous = process.env.ORACLE_ARC_DAILY_LIMIT;
  process.env.ORACLE_ARC_DAILY_LIMIT = "3";
  try {
    const { sql } = fakeSql([{ count: 3 }]);
    assert.equal(await aiQuotaError(sql, "user-1", "bud"), AI_QUOTA_COPY);

    const below = fakeSql([{ count: 1 }]);
    assert.equal(await aiQuotaError(below.sql, "user-1", "bud"), null);
  } finally {
    if (previous === undefined) delete process.env.ORACLE_ARC_DAILY_LIMIT;
    else process.env.ORACLE_ARC_DAILY_LIMIT = previous;
  }
});

test("without Oracle Arc credentials the layer fails honestly instead of inventing a reply", async () => {
  const keys = ["ORACLE_ARC_API_URL", "ORACLE_ARC_MODEL", "ORACLE_ARC_API_KEY", "XAI_API_KEY", "ORACLE_ARC_FALLBACK_PROVIDER"];
  const saved = keys.map((key) => [key, process.env[key]] as const);
  for (const key of keys) delete process.env[key];
  try {
    const provider = getAIProvider();
    assert.equal(provider.id, "unavailable");

    const { sql } = fakeSql();
    const result = await generateAi({
      sql,
      userId: "user-1",
      product: "bud",
      messages: [{ role: "user", content: "hi" }],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "not-configured");
      assert.equal(result.providerId, "unavailable");
    }
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
