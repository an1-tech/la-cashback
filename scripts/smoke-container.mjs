import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";

const base = process.argv[2] || "http://127.0.0.1:3082";
let ready = false;
for (let i = 0; i < 30; i++) {
  try {
    const response = await fetch(base + "/healthz", {
      signal: AbortSignal.timeout(2000),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, mode: "demo" });
    ready = true;
    break;
  } catch {
    await setTimeout(1000);
  }
}
assert.ok(ready, "Container không sẵn sàng sau 30 lần kiểm tra");
const bootstrap = await fetch(base + "/api/bootstrap");
assert.equal(bootstrap.status, 200);
const data = await bootstrap.json();
assert.equal(data.publicDemo, true);
assert.equal(data.user, null);
assert.ok(data.policy?.id, "Migration và seed phải tạo được chính sách");
assert.equal("deals" in data, false);
const landing = await fetch(base + "/");
assert.equal(landing.status, 200);
const html = await landing.text();
const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(
  (m) => m[1],
);
assert.ok(
  assets.some((p) => p.endsWith(".js")) &&
    assets.some((p) => p.endsWith(".css")),
);
for (const asset of assets)
  assert.equal((await fetch(base + asset)).status, 200);
// Tạo sandbox thật kiểm tra được cả quyền ghi SQLite của USER node trong image cuối.
const sandbox = await fetch(base + "/api/auth/demo", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
assert.equal(sandbox.status, 200);
assert.equal((await sandbox.json()).user.role, "user");
assert.match(sandbox.headers.get("set-cookie"), /; Secure/);
console.log(
  "Docker smoke passed: health, bootstrap, assets, SQLite write and secure cookie",
);
