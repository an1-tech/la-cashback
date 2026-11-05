// Isolated libSQL server on the GitHub runner; never uses a real Turso token.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { setTimeout } from "node:timers/promises";

const docker = (...args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
const app = "la-turso-app-ci",
  source = "la-turso-source-ci";
const base = "http://127.0.0.1:3083";
process.env.DEMO_ADMIN_PASSWORD = randomBytes(24).toString("hex");
const startApp = () =>
  docker(
    "run",
    "--detach",
    "--name",
    app,
    "--network",
    "host",
    "--env",
    "PORT=3083",
    "--env",
    "PUBLIC_DEMO=true",
    "--env",
    "COOKIE_SECURE=true",
    "--env",
    "DEMO_ADMIN_PASSWORD",
    "--env",
    "TURSO_DATABASE_URL=http://127.0.0.1:8080",
    "--env",
    "TURSO_AUTH_TOKEN=ci-local",
    "la-cashback:ci",
  );
async function waitFor(url) {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.ok) return;
    } catch {}
    await setTimeout(1000);
  }
  throw new Error("Server did not become ready: " + url);
}
async function request(path, options = {}) {
  const response = await fetch(base + "/api" + path, {
    signal: AbortSignal.timeout(30000),
    ...options,
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return { response, body };
}
try {
  docker(
    "run",
    "--detach",
    "--name",
    source,
    "--publish",
    "127.0.0.1:8080:8080",
    "ghcr.io/tursodatabase/libsql-server:latest",
  );
  await waitFor("http://127.0.0.1:8080/health");
  startApp();
  await waitFor(base + "/healthz");
  const initial = (await request("/bootstrap")).body;
  assert.equal(initial.storage, "turso");
  assert.equal(initial.ephemeralData, false);
  const { response, body } = await request("/auth/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const cookie = response.headers.get("set-cookie").split(";")[0];
  const headers = {
    Cookie: cookie,
    "Content-Type": "application/json",
    "X-CSRF-Token": body.csrf,
  };
  const wallet = (await request("/wallet", { headers })).body;
  const orders = (await request("/orders", { headers })).body;
  assert.equal(orders.length, 4);
  const withdrawal = await request("/withdrawals", {
    method: "POST",
    headers,
    body: JSON.stringify({ amount: 50000, requestKey: "turso-restart-proof" }),
  });
  // Remove the app container and all its local files, preserving only the separate libSQL server.
  docker("rm", "--force", app);
  startApp();
  await waitFor(base + "/healthz");
  const restored = (await request("/bootstrap", { headers })).body;
  assert.equal(restored.user.id, body.user.id);
  assert.equal(restored.dataSince, initial.dataSince);
  assert.deepEqual((await request("/orders", { headers })).body, orders);
  const after = (await request("/wallet", { headers })).body;
  assert.equal(after.balances.available, wallet.balances.available - 50000);
  assert.equal(after.balances.held, wallet.balances.held + 50000);
  const duplicate = await request("/withdrawals", {
    method: "POST",
    headers,
    body: JSON.stringify({ amount: 50000, requestKey: "turso-restart-proof" }),
  });
  assert.equal(duplicate.body.id, withdrawal.body.id);
  assert.deepEqual(
    (await request("/wallet", { headers })).body.balances,
    after.balances,
  );
  console.log(
    "Turso smoke passed: remote migrations, nested seed transactions, sessions, orders, wallet and idempotency survive app replacement",
  );
} catch (error) {
  for (const name of [app, source]) {
    try {
      execFileSync("docker", ["logs", name], { stdio: "inherit" });
    } catch {}
  }
  throw error;
} finally {
  for (const name of [app, source]) {
    try {
      docker("rm", "--force", name);
    } catch {}
  }
}
