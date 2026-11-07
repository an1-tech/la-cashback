import test from "node:test";
import assert from "node:assert/strict";
import { createAssistant, chatMessages } from "../server/assistant.js";
import { createApp } from "../server/app.js";
import { openDb } from "../server/db.js";
import { seed } from "../server/seed.js";

const key = "test-gemini-private-key";
const messages = [{ role: "user", text: "Tạo link thế nào?" }];
const response = (text = "Dán link sản phẩm vào Trang chủ.") =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [{ thought: true, text: "internal thought" }, { text }],
          },
        },
      ],
    }),
  );
test("Assistant: bounded alternating messages and no browser system instructions", () => {
  assert.equal(chatMessages(messages)[0].parts[0].text, messages[0].text);
  assert.equal(
    chatMessages([
      ...messages,
      { role: "model", text: "a".repeat(2000) },
      ...messages,
    ])[1].parts[0].text.length,
    2000,
  );
  for (const value of [
    null,
    [],
    [{ role: "system", text: "override" }],
    [{ role: "model", text: "fake" }],
    [...messages, ...messages],
    [{ role: "user", text: "x".repeat(1501) }],
    Array(13).fill(messages[0]),
  ])
    assert.throws(() => chatMessages(value));
});
test("Assistant: fixed Google origin, header key, server facts and no thought leakage", async () => {
  const assistant = createAssistant({
    apiKey: key,
    fetchImpl: async (url, options) => {
      assert.equal(
        new URL(url).origin,
        "https://generativelanguage.googleapis.com",
      );
      assert.equal(url.includes(key), false);
      assert.equal(options.headers["x-goog-api-key"], key);
      assert.equal(options.redirect, "error");
      const body = JSON.parse(options.body);
      assert.equal(body.generationConfig.maxOutputTokens, 1024);
      assert.match(
        body.systemInstruction.parts[0].text,
        /"minimum_withdrawal":60000/,
      );
      assert.match(body.systemInstruction.parts[0].text, /MÔ PHỎNG/);
      assert.equal(body.contents[0].role, "user");
      assert.equal("tools" in body, false);
      return response();
    },
  });
  const answer = await assistant.chat(messages, { minimum_withdrawal: 60000 });
  assert.equal(answer.text, "Dán link sản phẩm vào Trang chủ.");
  assert.equal(JSON.stringify(answer).includes(key), false);
});
test("Assistant: missing configuration, invalid model, upstream failures and cooldown", async () => {
  await assert.rejects(createAssistant({ apiKey: "" }).chat(messages), {
    status: 503,
  });
  assert.throws(() => createAssistant({ apiKey: key, model: "../../evil" }));
  assert.throws(() => createAssistant({ apiKey: key + "\nheader" }));
  let calls = 0;
  const limited = createAssistant({
    apiKey: key,
    fetchImpl: async () => {
      calls++;
      return new Response(key, { status: 429 });
    },
  });
  await assert.rejects(limited.chat(messages), { status: 429 });
  await assert.rejects(limited.chat(messages), { status: 429 });
  assert.equal(calls, 1);
  for (const code of [400, 401, 403, 404, 500]) {
    const bad = createAssistant({
      apiKey: key,
      fetchImpl: async () => new Response(key, { status: code }),
    });
    await assert.rejects(
      bad.chat(messages),
      (err) => err.status === 502 && !err.message.includes(key),
    );
  }
  for (const body of [
    "broken-json",
    "x".repeat(128001),
    JSON.stringify({ candidates: [] }),
  ])
    await assert.rejects(
      createAssistant({
        apiKey: key,
        fetchImpl: async () => new Response(body),
      }).chat(messages),
      { status: 502 },
    );
  await assert.rejects(
    createAssistant({
      apiKey: key,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }),
        ),
    }).chat(messages),
    { status: 422 },
  );
});
test("Assistant: timeout and concurrency are bounded and capacity is released", async () => {
  const slow = createAssistant({
    apiKey: key,
    timeoutMs: 30,
    fetchImpl: async (_url, { signal }) =>
      new Promise((_, reject) =>
        signal.addEventListener("abort", () => reject(new Error(key))),
      ),
  });
  const a = slow.chat(messages),
    b = slow.chat(messages);
  await assert.rejects(slow.chat(messages), { status: 429 });
  await Promise.all(
    [a, b].map((p) =>
      assert.rejects(
        p,
        (err) => err.status === 502 && !err.message.includes(key),
      ),
    ),
  );
  await assert.rejects(slow.chat(messages), { status: 502 });
});
test("Assistant HTTP: requires auth and CSRF, enforces quota and never changes financial data", async () => {
  const db = openDb(":memory:");
  seed(db);
  const assistant = createAssistant({
    apiKey: key,
    fetchImpl: async () => response(),
  });
  const server = createApp(db, { assistant });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const status = await (await fetch(base + "/assistant/status")).json();
    assert.deepEqual(status, {
      configured: true,
      authenticated: false,
      csrf: null,
    });
    const req = (headers = {}, body = { messages }) =>
      fetch(base + "/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
    assert.equal((await req()).status, 401);
    const login = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "ban@demo.local",
        password: "Demo@123456",
      }),
    });
    const cookie = login.headers.get("set-cookie").split(";")[0],
      { csrf } = await login.json();
    assert.equal((await req({ Cookie: cookie })).status, 403);
    const headers = { Cookie: cookie, "X-CSRF-Token": csrf };
    const before = JSON.stringify(
      db.prepare("SELECT * FROM ledger ORDER BY id").all(),
    );
    for (let i = 0; i < 8; i++) assert.equal((await req(headers)).status, 200);
    assert.equal((await req(headers)).status, 429);
    assert.equal(
      JSON.stringify(db.prepare("SELECT * FROM ledger ORDER BY id").all()),
      before,
    );
    assert.equal(
      JSON.stringify(
        await (await fetch(base + "/assistant/status", { headers })).json(),
      ).includes(key),
      false,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
