import test from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../server/db.js";
import { seed } from "../server/seed.js";
import { createApp } from "../server/app.js";

test("Online demo: private admin, secure cookie, no public reset token, health probe", async () => {
  const db = openDb(":memory:");
  const adminPassword = "Only-For-Test-Admin-123456";
  seed(db, { adminPassword });
  const server = createApp(db, { publicDemo: true, secureCookie: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const post = (path, body) =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    const health = await fetch(base + "/healthz");
    assert.deepEqual(await health.json(), { ok: true, mode: "demo" });
    assert.equal(
      (await (await fetch(base + "/api/bootstrap")).json()).publicDemo,
      true,
    );
    assert.equal(
      (
        await post("/api/auth/login", {
          email: "admin@demo.local",
          password: "Demo@123456",
        })
      ).status,
      401,
    );
    const login = await post("/api/auth/login", {
      email: "admin@demo.local",
      password: adminPassword,
    });
    assert.equal(login.status, 200);
    assert.match(login.headers.get("set-cookie"), /; Secure/);
    assert.match(login.headers.get("set-cookie"), /HttpOnly/);
    assert.equal((await login.json()).user.role, "admin");
    const forgot = await post("/api/auth/forgot", {
      email: "admin@demo.local",
    });
    assert.equal(forgot.status, 503);
    assert.equal((await forgot.json()).resetToken, undefined);
    assert.equal(
      db.prepare("SELECT count(*) AS n FROM reset_tokens").get().n,
      0,
    );
    assert.equal(
      (
        await post("/api/auth/reset", {
          token: "fake",
          password: "NewPassword123456",
        })
      ).status,
      503,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
