import test from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../server/db.js";
import { seed } from "../server/seed.js";
import { createBatchedSandbox } from "../server/sandbox-copy.js";
import { balances, addPolicy } from "../server/finance.js";

test("Batched sandbox preserves financial rules, ownership and append-only history", () => {
  const db = openDb(":memory:");
  seed(db);
  try {
    const before = db.prepare("SELECT id FROM users").all();
    const uid = createBatchedSandbox(db),
      other = createBatchedSandbox(db);
    assert.notEqual(uid, other);
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM orders WHERE user_id=?").get(uid).n,
      4,
    );
    assert.deepEqual(balances(db, uid), {
      pending: 42000,
      locked: 0,
      available: 76000,
      held: 0,
      paid: 50000,
    });
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM users").get().n,
      before.length + 2,
    );
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) n FROM (SELECT journal_id FROM ledger GROUP BY journal_id HAVING SUM(amount)!=0)",
        )
        .get().n,
      0,
    );
    assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
    const admin = db.prepare("SELECT id FROM users WHERE role='admin'").get();
    addPolicy(
      db,
      {
        shareBps: 6000,
        holdDays: 1,
        minimumWithdrawal: 100000,
        effectiveAt: new Date().toISOString(),
      },
      admin.id,
    );
    const locked = createBatchedSandbox(db);
    assert.equal(balances(db, locked).locked, 108000);
    assert.equal(
      db
        .prepare("SELECT COUNT(*) n FROM withdrawals WHERE user_id=?")
        .get(locked).n,
      0,
    );
  } finally {
    db.close();
  }
});

test("Batched sandbox rolls back the complete account if a later insert fails", () => {
  const db = openDb(":memory:");
  seed(db);
  try {
    const tables = [
      "users",
      "orders",
      "clicks",
      "provider_events",
      "journals",
      "ledger",
      "withdrawals",
      "notifications",
      "audit_logs",
    ];
    const counts = () =>
      tables.map((t) => db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n);
    const before = counts();
    db.exec(
      "CREATE TRIGGER reject_demo_ledger BEFORE INSERT ON ledger BEGIN SELECT RAISE(ABORT,'test failure'); END",
    );
    assert.throws(() => createBatchedSandbox(db), /test failure/);
    assert.deepEqual(counts(), before);
  } finally {
    db.close();
  }
});
