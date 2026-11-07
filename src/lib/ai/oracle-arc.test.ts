import assert from "node:assert/strict";
import { test } from "node:test";
import { trimHistory } from "./context.ts";
import {
  ARC_FAILURE_COPY,
  chatUrlFrom,
  completeWithOracleArc,
  extractArcText,
  readArcConfig,
  type ArcConfig,
} from "./oracle-arc.ts";

const CONFIG: ArcConfig = {
  chatUrl: "https://arc.test/v1/chat/completions",
  model: "arc-model",
  apiKey: "test-key",
  timeoutMs: 1_000,
  maxAttempts: 2,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("chatUrlFrom accepts a base, a /v1 root and a full endpoint", () => {
  assert.equal(chatUrlFrom("https://arc.test"), "https://arc.test/v1/chat/completions");
  assert.equal(chatUrlFrom("https://arc.test/v1/"), "https://arc.test/v1/chat/completions");
  assert.equal(
    chatUrlFrom("https://arc.test/openai/chat/completions"),
    "https://arc.test/openai/chat/completions",
  );
});

test("readArcConfig needs a URL, a model and a key", () => {
  assert.equal(readArcConfig({}), null);
  assert.equal(readArcConfig({ ORACLE_ARC_API_URL: "https://arc.test", ORACLE_ARC_MODEL: "m" }), null);
  const config = readArcConfig({
    ORACLE_ARC_API_URL: "https://arc.test",
    ORACLE_ARC_MODEL: "m",
    ORACLE_ARC_API_KEY: "k",
  });
  assert.deepEqual(config, {
    chatUrl: "https://arc.test/v1/chat/completions",
    model: "m",
    apiKey: "k",
    timeoutMs: 20_000,
    maxAttempts: 2,
  });
});

test("extractArcText reads the common response shapes", () => {
  assert.equal(extractArcText({ choices: [{ message: { content: "hello" } }] }), "hello");
  assert.equal(extractArcText({ output_text: "direct" }), "direct");
  assert.equal(extractArcText({ content: [{ type: "text", text: "a" }, { type: "text", text: "b" }] }), "ab");
  assert.equal(extractArcText({ choices: [] }), "");
  assert.equal(extractArcText(null), "");
});

test("missing configuration fails honestly without a request", async () => {
  let called = false;
  const result = await completeWithOracleArc([{ role: "user", content: "hi" }], {
    config: null,
    fetchImpl: (async () => {
      called = true;
      return jsonResponse({});
    }) as unknown as typeof fetch,
  });
  assert.equal(called, false);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "not-configured");
    assert.equal(result.error, ARC_FAILURE_COPY["not-configured"]);
  }
});

test("a successful completion returns the model text and usage", async () => {
  const result = await completeWithOracleArc([{ role: "user", content: "hi" }], {
    config: CONFIG,
    fetchImpl: (async () =>
      jsonResponse({
        model: "arc-model-2026",
        choices: [{ message: { content: "  answer  " } }],
        usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
      })) as unknown as typeof fetch,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.text, "answer");
    assert.equal(result.model, "arc-model-2026");
    assert.equal(result.usage.totalTokens, 10);
    assert.equal(result.attempts, 1);
  }
});

test("auth failures are not retried", async () => {
  let calls = 0;
  const result = await completeWithOracleArc([{ role: "user", content: "hi" }], {
    config: CONFIG,
    fetchImpl: (async () => {
      calls += 1;
      return jsonResponse({ error: "nope" }, 401);
    }) as unknown as typeof fetch,
  });
  assert.equal(calls, 1);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "unauthorized");
});

test("rate limits are retried once, then reported", async () => {
  let calls = 0;
  const result = await completeWithOracleArc([{ role: "user", content: "hi" }], {
    config: CONFIG,
    fetchImpl: (async () => {
      calls += 1;
      return jsonResponse({ error: "slow down" }, 429);
    }) as unknown as typeof fetch,
  });
  assert.equal(calls, 2);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "rate-limited");
    assert.equal(result.attempts, 2);
  }
});

test("an empty answer is a failure, never a reply", async () => {
  const result = await completeWithOracleArc([{ role: "user", content: "hi" }], {
    config: CONFIG,
    fetchImpl: (async () => jsonResponse({ choices: [{ message: { content: "   " } }] })) as unknown as typeof fetch,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "bad-response");
});

test("a dropped connection surfaces as a network failure", async () => {
  let calls = 0;
  const result = await completeWithOracleArc([{ role: "user", content: "hi" }], {
    config: CONFIG,
    fetchImpl: (async () => {
      calls += 1;
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch,
  });
  assert.equal(calls, 2);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "network");
});

test("trimHistory keeps the newest turns and never starts on an assistant", () => {
  const history = [
    { role: "user" as const, content: "old question" },
    { role: "assistant" as const, content: "old answer" },
    { role: "user" as const, content: "new question" },
    { role: "assistant" as const, content: "new answer" },
    { role: "user" as const, content: "latest" },
  ];
  const trimmed = trimHistory(history, { maxChars: 30 });
  assert.deepEqual(
    trimmed.map((t) => t.content),
    ["new question", "new answer", "latest"],
  );
  // A window that lands mid-pair never starts with an orphaned assistant turn.
  assert.equal(trimHistory(history, { maxChars: 16 })[0]?.role, "user");
  const capped = trimHistory([...history, { role: "user" as const, content: "after" }], { maxTurns: 2 });
  assert.equal(capped.length, 2);
  assert.equal(capped[0]?.role, "user");
});
