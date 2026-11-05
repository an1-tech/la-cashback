import test from "node:test";
import assert from "node:assert/strict";
import { databaseLocation } from "../server/db.js";

test("Turso cần đủ cấu hình, URL an toàn và không âm thầm dùng DB local", () => {
  assert.equal(databaseLocation({}), "./data/cashback.sqlite");
  assert.equal(databaseLocation({ DATABASE_PATH: ":memory:" }), ":memory:");
  for (const env of [
    { TURSO_DATABASE_URL: "libsql://demo.turso.io" },
    { TURSO_AUTH_TOKEN: "test" },
  ]) {
    assert.throws(() => databaseLocation(env), /Cần cả/);
  }
  for (const url of [
    "file:local.db",
    "http://example.com",
    "https://user:pass@example.com",
    "https://example.com?token=secret",
  ]) {
    assert.throws(() =>
      databaseLocation({ TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: "test" }),
    );
  }
  assert.equal(
    databaseLocation({
      TURSO_DATABASE_URL: "libsql://demo.turso.io",
      TURSO_AUTH_TOKEN: "test",
      DATABASE_PATH: ":memory:",
    }),
    "libsql://demo.turso.io",
  );
});
