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
  replicaApp = "la-turso-replica-ci",
  source = "la-turso-source-ci";
const base = "http://127.0.0.1:3083";
process.env.DEMO_ADMIN_PASSWORD = randomBytes(24).toString("hex");
const startApp = (name = app, port = 3083) =>
  docker(
    "run",
    "--detach",
    "--name",
    name,
    "--network",
    "host",
    "--env",
    `PORT=${port}`,
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
    "--env",
    "CI_REPLICA_PROBE=true",
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
async function request(path, options = {}, origin = base) {
  const response = await fetch(origin + "/api" + path, {
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
  const sandboxRequest = request("/auth/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  // The HTTP event loop must stay responsive during synchronous network seeding.
  await setTimeout(10);
  const health = await fetch(base + "/healthz", {
    signal: AbortSignal.timeout(2000),
  });
  assert.equal(health.status, 200);
  const { response, body } = await sandboxRequest;
  assert.ok(
    body.user?.id,
    "sandbox user must be visible to the application replica",
  );
  const sessionProbe = await fetch("http://127.0.0.1:8080/v2/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          type: "execute",
          stmt: {
            sql: "SELECT (SELECT count(*) FROM sessions) AS sessions, (SELECT count(*) FROM sessions s JOIN users u ON u.id=s.user_id WHERE u.status='active') AS active_sessions",
            args: [],
            want_rows: true,
          },
        },
        { type: "close" },
      ],
    }),
  });
  console.log(
    "CI session persistence probe:",
    JSON.stringify(await sessionProbe.json()),
  );
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
  // A separate app has its own local replica. It must see fresh sessions and
  // serialize withdrawals on the primary, even if both replicas read 76,000.
  startApp(replicaApp, 3084);
  const second = "http://127.0.0.1:3084";
  await waitFor(second + "/healthz");
  const fresh = await request("/auth/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const freshHeaders = {
    Cookie: fresh.response.headers.get("set-cookie").split(";")[0],
    "Content-Type": "application/json",
    "X-CSRF-Token": fresh.body.csrf,
  };
  assert.equal(
    (await request("/bootstrap", { headers: freshHeaders }, second)).body.user
      .id,
    fresh.body.user.id,
  );
  const attempts = await Promise.all(
    [base, second].map((origin, i) =>
      fetch(origin + "/api/withdrawals", {
        method: "POST",
        headers: freshHeaders,
        body: JSON.stringify({
          amount: 70000,
          requestKey: "replica-race-" + i,
        }),
        signal: AbortSignal.timeout(30000),
      }),
    ),
  );
  assert.deepEqual(attempts.map((r) => r.status).sort(), [200, 400]);
  const raceWallet = (
    await request("/wallet", { headers: freshHeaders }, second)
  ).body;
  assert.equal(raceWallet.balances.available, 6000);
  assert.equal(raceWallet.balances.held, 70000);
  assert.equal(
    raceWallet.withdrawals.filter((w) => w.amount === 70000).length,
    1,
  );
  const admin = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@demo.local",
      password: process.env.DEMO_ADMIN_PASSWORD,
    }),
  });
  await request("/admin/users", {
    method: "PATCH",
    headers: {
      Cookie: admin.response.headers.get("set-cookie").split(";")[0],
      "Content-Type": "application/json",
      "X-CSRF-Token": admin.body.csrf,
    },
    body: JSON.stringify({ id: fresh.body.user.id, status: "blocked" }),
  });
  const blocked = await fetch(second + "/api/wallet", {
    headers: freshHeaders,
  });
  assert.equal(
    blocked.status,
    401,
    "revoked sessions must not remain usable on another replica",
  );
  console.log(
    "Turso smoke passed: remote migrations, nested seed transactions, sessions, orders, wallet and idempotency survive app replacement",
  );
} catch (error) {
  for (const name of [app, replicaApp, source]) {
    try {
      execFileSync("docker", ["logs", name], { stdio: "inherit" });
    } catch {}
  }
  throw error;
} finally {
  for (const name of [app, replicaApp, source]) {
    try {
      docker("rm", "--force", name);
    } catch {}
  }
}
