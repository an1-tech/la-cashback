import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { once } from "node:events";
import { openDb, now, transaction } from "../server/db.js";
import {
  id,
  cashback,
  balances,
  ingestReport,
  requestWithdrawal,
  processWithdrawal,
  addPolicy,
  adjustBalance,
  resolveUnmatched,
  releaseFunds,
} from "../server/finance.js";
import { passwordHash, shopeeUrl } from "../server/security.js";
function fixture(path = ":memory:") {
  const db = openDb(path),
    userId = id(),
    adminId = id(),
    policy = id(),
    clickId = id();
  const pw = passwordHash("Test@123456");
  for (const [uid, role] of [
    [userId, "user"],
    [adminId, "admin"],
  ])
    db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(
      uid,
      uid + "@demo.local",
      role,
      pw,
      role,
      "active",
      "Ngân hàng mô phỏng",
      "DEMO-00000001",
      "NGUOI DEMO",
      now(),
      now(),
    );
  db.prepare("INSERT INTO policies VALUES (?,?,?,?,?,?,?,?)").run(
    policy,
    1,
    7000,
    0,
    50000,
    "2026-01-01T00:00:00.000Z",
    "shopee",
    now(),
  );
  db.prepare("INSERT INTO clicks VALUES (?,?,?,?,?,?,?)").run(
    clickId,
    userId,
    policy,
    "demo",
    "https://shopee.vn/item-i.1.2",
    null,
    now(),
  );
  const report = (
    eventId = "event-1",
    status = "pending",
    commission = 100000,
    extra = {},
  ) => ({
    eventId,
    externalId: "ORDER-001",
    itemId: "1",
    clickId,
    title: "Sản phẩm kiểm thử",
    orderValue: 500000,
    commission,
    status,
    reason: status === "rejected" ? "Nguồn từ chối hoa hồng" : "",
    ...extra,
  });
  return { db, userId, adminId, policy, clickId, report };
}
function balanced(db) {
  assert.equal(
    db.prepare("SELECT COALESCE(SUM(amount),0) AS n FROM ledger").get().n,
    0,
  );
  assert.equal(
    db
      .prepare(
        "SELECT COUNT(*) n FROM (SELECT journal_id,SUM(amount) s FROM ledger GROUP BY journal_id HAVING s!=0)",
      )
      .get().n,
    0,
  );
}
test("Tính tiền bằng BigInt, floor 1 VND; không nhận số thập phân", () => {
  assert.equal(cashback(12345, 7000), 8641);
  assert.equal(cashback(1, 9999), 0);
  assert.equal(cashback(1000000000000, 10000), 1000000000000);
  assert.throws(() => cashback(1.2, 7000));
  assert.throws(() => cashback(100, 10001));
});
test("Lượt bấm không tạo tiền; dữ liệu chờ duyệt không thể rút", () => {
  const f = fixture();
  assert.deepEqual(balances(f.db, f.userId), {
    pending: 0,
    locked: 0,
    available: 0,
    held: 0,
    paid: 0,
  });
  ingestReport(f.db, f.report(), f.adminId);
  assert.equal(balances(f.db, f.userId).pending, 70000);
  assert.throws(
    () => requestWithdrawal(f.db, f.userId, 50000, "request-1"),
    /không đủ/,
  );
  balanced(f.db);
  f.db.close();
});
test("Nhập lặp một sự kiện và lặp đơn với mã sự kiện khác không cộng trùng", () => {
  const f = fixture();
  ingestReport(f.db, f.report(), f.adminId);
  assert.equal(ingestReport(f.db, f.report(), f.adminId).duplicate, true);
  ingestReport(f.db, f.report("event-2"), f.adminId);
  assert.equal(balances(f.db, f.userId).pending, 70000);
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM orders").get().n, 1);
  assert.throws(
    () => ingestReport(f.db, f.report("event-1", "pending", 200000), f.adminId),
    /nội dung khác/,
  );
  balanced(f.db);
  f.db.close();
});
test("Từ chối đơn chờ duyệt xóa nghĩa vụ tiền, giữ lịch sử và lý do", () => {
  const f = fixture();
  ingestReport(f.db, f.report(), f.adminId);
  ingestReport(f.db, f.report("rejected", "rejected"), f.adminId);
  assert.equal(balances(f.db, f.userId).pending, 0);
  assert.equal(balances(f.db, f.userId).available, 0);
  assert.match(
    f.db.prepare("SELECT reason FROM orders").get().reason,
    /từ chối/,
  );
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM journals").get().n, 2);
  balanced(f.db);
  f.db.close();
});
test("Chính sách mới không sửa giao dịch cũ; khóa trước khả dụng được tôn trọng", () => {
  const f = fixture();
  const p = addPolicy(
    f.db,
    {
      shareBps: 5000,
      holdDays: 7,
      minimumWithdrawal: 50000,
      effectiveAt: new Date(Date.now() - 1000).toISOString(),
    },
    f.adminId,
  );
  ingestReport(f.db, f.report("approved", "approved"), f.adminId);
  assert.equal(balances(f.db, f.userId).available, 70000);
  const click2 = id();
  f.db
    .prepare("INSERT INTO clicks VALUES (?,?,?,?,?,?,?)")
    .run(
      click2,
      f.userId,
      p.id,
      "demo",
      "https://shopee.vn/i.1.2",
      null,
      now(),
    );
  ingestReport(
    f.db,
    f.report("new-policy", "approved", 100000, {
      externalId: "ORDER-002",
      clickId: click2,
    }),
    f.adminId,
  );
  assert.equal(balances(f.db, f.userId).locked, 50000);
  assert.throws(
    () => f.db.prepare("UPDATE policies SET share_bps=1").run(),
    /immutable/,
  );
  transaction(f.db, () => releaseFunds(f.db, f.userId));
  assert.equal(balances(f.db, f.userId).available, 70000);
  balanced(f.db);
  f.db.close();
});
test("Duyệt rút không phải thanh toán, yêu cầu lặp không giữ trùng, thanh toán lặp không chi trùng", () => {
  const f = fixture();
  ingestReport(f.db, f.report("approved", "approved"), f.adminId);
  const w = requestWithdrawal(f.db, f.userId, 50000, "withdraw-1");
  assert.equal(requestWithdrawal(f.db, f.userId, 50000, "withdraw-1").id, w.id);
  assert.equal(balances(f.db, f.userId).available, 20000);
  assert.equal(balances(f.db, f.userId).held, 50000);
  processWithdrawal(f.db, w.id, "approved", "", "", f.adminId);
  assert.equal(balances(f.db, f.userId).paid, 0);
  processWithdrawal(f.db, w.id, "paid", "", "DEMO-PAYMENT-001", f.adminId);
  processWithdrawal(f.db, w.id, "paid", "", "DEMO-PAYMENT-001", f.adminId);
  assert.equal(balances(f.db, f.userId).paid, 50000);
  assert.equal(balances(f.db, f.userId).held, 0);
  assert.throws(() =>
    processWithdrawal(f.db, w.id, "paid", "", "DEMO-OTHER-001", f.adminId),
  );
  balanced(f.db);
  f.db.close();
});
test("Từ chối và thanh toán thất bại giải phóng đúng tiền giữ", () => {
  const f = fixture();
  ingestReport(f.db, f.report("approved", "approved"), f.adminId);
  const w = requestWithdrawal(f.db, f.userId, 50000, "withdraw-1");
  processWithdrawal(
    f.db,
    w.id,
    "rejected",
    "Sai thông tin demo",
    "",
    f.adminId,
  );
  processWithdrawal(
    f.db,
    w.id,
    "rejected",
    "Sai thông tin demo",
    "",
    f.adminId,
  );
  assert.equal(balances(f.db, f.userId).available, 70000);
  const w2 = requestWithdrawal(f.db, f.userId, 50000, "withdraw-2");
  processWithdrawal(f.db, w2.id, "approved", "", "", f.adminId);
  processWithdrawal(
    f.db,
    w2.id,
    "failed",
    "Thanh toán mô phỏng thất bại",
    "",
    f.adminId,
  );
  assert.equal(balances(f.db, f.userId).available, 70000);
  assert.equal(balances(f.db, f.userId).held, 0);
  balanced(f.db);
  f.db.close();
});
test("Mã thanh toán trùng rollback cả trạng thái lẫn sổ tiền", () => {
  const f = fixture();
  ingestReport(f.db, f.report("approved", "approved", 200000), f.adminId);
  const a = requestWithdrawal(f.db, f.userId, 50000, "withdraw-a"),
    b = requestWithdrawal(f.db, f.userId, 50000, "withdraw-b");
  for (const w of [a, b])
    processWithdrawal(f.db, w.id, "approved", "", "", f.adminId);
  processWithdrawal(f.db, a.id, "paid", "", "DEMO-SAME-REF", f.adminId);
  assert.throws(() =>
    processWithdrawal(f.db, b.id, "paid", "", "DEMO-SAME-REF", f.adminId),
  );
  assert.equal(
    f.db.prepare("SELECT status FROM withdrawals WHERE id=?").get(b.id).status,
    "approved",
  );
  assert.equal(balances(f.db, f.userId).held, 50000);
  assert.equal(balances(f.db, f.userId).paid, 50000);
  balanced(f.db);
  f.db.close();
});
test("Thu hồi sau đã thanh toán tạo nợ ở available, không xóa lịch sử", () => {
  const f = fixture();
  ingestReport(f.db, f.report("approved", "approved"), f.adminId);
  const w = requestWithdrawal(f.db, f.userId, 70000, "withdraw-1");
  processWithdrawal(f.db, w.id, "approved", "", "", f.adminId);
  processWithdrawal(f.db, w.id, "paid", "", "DEMO-PAYMENT-001", f.adminId);
  ingestReport(f.db, f.report("late-reject", "rejected"), f.adminId);
  assert.equal(balances(f.db, f.userId).available, -70000);
  assert.equal(balances(f.db, f.userId).paid, 70000);
  assert.throws(() => requestWithdrawal(f.db, f.userId, 50000, "withdraw-2"));
  assert.throws(() => f.db.exec("DELETE FROM ledger"), /append-only/);
  balanced(f.db);
  f.db.close();
});
test("Không gán đơn khi thiếu tracking; gán có kiểm chứng chỉ ghi sổ một lần", () => {
  const f = fixture();
  const input = f.report("unmatched", "approved", 100000, {
    clickId: "unknown",
  });
  assert.equal(ingestReport(f.db, input, f.adminId).state, "unmatched");
  assert.equal(balances(f.db, f.userId).available, 0);
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM orders").get().n, 0);
  resolveUnmatched(
    f.db,
    "unmatched",
    f.clickId,
    "Đã đối chiếu mã demo trong báo cáo",
    f.adminId,
  );
  assert.equal(balances(f.db, f.userId).available, 70000);
  assert.equal(ingestReport(f.db, input, f.adminId).duplicate, true);
  assert.equal(balances(f.db, f.userId).available, 70000);
  assert.throws(() =>
    resolveUnmatched(f.db, "unmatched", f.clickId, "Đối chiếu lại", f.adminId),
  );
  balanced(f.db);
  f.db.close();
});
test("Điều chỉnh và đối soát chênh lệch có mã tham chiếu, không cập nhật trực tiếp số dư", () => {
  const f = fixture();
  ingestReport(f.db, f.report("approved", "approved"), f.adminId);
  ingestReport(f.db, f.report("correction", "approved", 120000), f.adminId);
  assert.equal(balances(f.db, f.userId).available, 84000);
  adjustBalance(
    f.db,
    f.userId,
    -1000,
    "Điều chỉnh sau đối chiếu báo cáo",
    "ADJUST-001",
    f.adminId,
  );
  assert.equal(balances(f.db, f.userId).available, 83000);
  assert.throws(() =>
    adjustBalance(
      f.db,
      f.userId,
      -1000,
      "Điều chỉnh sau đối chiếu báo cáo",
      "ADJUST-001",
      f.adminId,
    ),
  );
  assert.equal(balances(f.db, f.userId).available, 83000);
  balanced(f.db);
  f.db.close();
});
test("Duyệt lại sau thu hồi tạo chu kỳ khả dụng mới và giữ tiền dự kiến để đối chiếu", () => {
  const f = fixture();
  ingestReport(f.db, f.report("pending-initial", "pending"), f.adminId);
  ingestReport(f.db, f.report("approve-first", "approved"), f.adminId);
  ingestReport(f.db, f.report("reject-later", "rejected"), f.adminId);
  ingestReport(f.db, f.report("reapprove", "approved", 120000), f.adminId);
  assert.equal(balances(f.db, f.userId).available, 84000);
  const order = f.db.prepare("SELECT * FROM orders").get();
  assert.equal(order.estimated_cashback, 70000);
  assert.equal(order.cashback, 84000);
  transaction(f.db, () => releaseFunds(f.db, f.userId));
  assert.equal(balances(f.db, f.userId).available, 84000);
  balanced(f.db);
  f.db.close();
});
test("Thu hồi lúc đang giữ tiền chặn thanh toán, thất bại giải phóng đúng số tiền", () => {
  const f = fixture();
  ingestReport(f.db, f.report("approved", "approved"), f.adminId);
  const w = requestWithdrawal(f.db, f.userId, 70000, "withdraw-1");
  processWithdrawal(f.db, w.id, "approved", "", "", f.adminId);
  ingestReport(f.db, f.report("rejected", "rejected"), f.adminId);
  assert.throws(
    () => processWithdrawal(f.db, w.id, "paid", "", "DEMO-NO-FUNDS", f.adminId),
    /số dư âm/,
  );
  assert.equal(balances(f.db, f.userId).paid, 0);
  processWithdrawal(
    f.db,
    w.id,
    "failed",
    "Đã thu hồi hoa hồng trước khi thanh toán",
    "",
    f.adminId,
  );
  assert.equal(balances(f.db, f.userId).available, 0);
  assert.equal(balances(f.db, f.userId).held, 0);
  balanced(f.db);
  f.db.close();
});
test("Hai kết nối SQLite rút đồng thời chỉ một yêu cầu giữ được tiền", async () => {
  const folder = mkdtempSync(join(tmpdir(), "la-cashback-"));
  const path = join(folder, "race.sqlite");
  const f = fixture(path);
  ingestReport(f.db, f.report("approved", "approved"), f.adminId);
  const workers = [1, 2].map(
    (n) =>
      new Worker(new URL("./helpers/withdraw-worker.js", import.meta.url), {
        workerData: { path, userId: f.userId, key: "concurrent-" + n },
      }),
  );
  try {
    await Promise.all(workers.map((w) => once(w, "message")));
    const results = workers.map((w) => once(w, "message"));
    workers.forEach((w) => w.postMessage("go"));
    const out = (await Promise.all(results)).map((x) => x[0]);
    assert.equal(out.filter((x) => x.ok).length, 1);
    assert.equal(balances(f.db, f.userId).held, 70000);
    assert.equal(balances(f.db, f.userId).available, 0);
    balanced(f.db);
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
    f.db.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
test("URL whitelist chặn SSRF, thông tin đăng nhập và open redirect", () => {
  for (const url of [
    "http://shopee.vn/i.1.2",
    "https://shopee.vn.evil.com/i.1.2",
    "https://127.0.0.1/x",
    "https://shopee.vn@evil.com/x",
    "https://user:pass@shopee.vn/x",
    "https://shopee.vn:1234/x",
    "https://shopee.vn/",
    "javascript:alert(1)",
    "https://[::1]/",
  ])
    assert.throws(() => shopeeUrl(url), url);
  assert.equal(
    shopeeUrl("https://s.shopee.vn/abcdef"),
    "https://s.shopee.vn/abcdef",
  );
});
