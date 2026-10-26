import { randomUUID } from "node:crypto";
import { transaction, now } from "./db.js";
import { ensure, integer, textInput, isoDate, hash } from "./security.js";
export const id = () => randomUUID();
export function cashback(commission, shareBps) {
  integer(commission, "Hoa hồng");
  integer(shareBps, "Tỷ lệ", 0, 10000);
  return Number((BigInt(commission) * BigInt(shareBps)) / 10000n); // floor xuống 1 VND
}
export function balances(db, userId) {
  const result = { pending: 0, locked: 0, available: 0, held: 0, paid: 0 };
  for (const r of db
    .prepare(
      "SELECT account, SUM(amount) AS total FROM ledger WHERE user_id=? AND account!='clearing' GROUP BY account",
    )
    .all(userId))
    result[r.account] = r.total;
  return result;
}
export function journal(db, userId, reference, description, entries) {
  ensure(
    entries.reduce((n, e) => n + e[1], 0) === 0,
    "Bút toán không cân bằng.",
    500,
  );
  const journalId = id();
  const at = now();
  db.prepare("INSERT INTO journals VALUES (?,?,?,?,?)").run(
    journalId,
    reference,
    userId,
    description,
    at,
  );
  for (const [account, amount] of entries)
    if (amount)
      db.prepare(
        "INSERT INTO ledger(journal_id,user_id,account,amount,created_at) VALUES (?,?,?,?,?)",
      ).run(
        journalId,
        userId,
        account,
        integer(amount, "Bút toán", -1_000_000_000_000),
        at,
      );
}
export function notify(db, userId, title, body) {
  db.prepare("INSERT INTO notifications VALUES (?,?,?,?,NULL,?)").run(
    id(),
    userId,
    title,
    body,
    now(),
  );
}
export function audit(db, actor, action, reference, details = {}) {
  db.prepare("INSERT INTO audit_logs VALUES (?,?,?,?,?,?)").run(
    id(),
    actor,
    action,
    reference,
    JSON.stringify(details),
    now(),
  );
}
export function currentPolicy(db) {
  return db
    .prepare(
      "SELECT * FROM policies WHERE scope='shopee' AND effective_at<=? ORDER BY effective_at DESC, version DESC LIMIT 1",
    )
    .get(now());
}
// Gọi bên trong transaction nghiệp vụ để không đọc số dư đã lỗi thời.
export function releaseFunds(db, userId) {
  for (const order of db
    .prepare(
      "SELECT * FROM orders WHERE user_id=? AND status='approved' AND released=0 AND available_at<=?",
    )
    .all(userId, now())) {
    journal(
      db,
      userId,
      `release:${order.id}:${id()}`,
      "Tiền hoàn đủ điều kiện khả dụng",
      [
        ["locked", -order.cashback],
        ["available", order.cashback],
      ],
    );
    db.prepare("UPDATE orders SET released=1 WHERE id=?").run(order.id);
  }
}
function normalizedReport(raw) {
  ensure(
    raw && typeof raw === "object" && !Array.isArray(raw),
    "Dòng báo cáo phải là object.",
  );
  const p = {
    eventId: textInput(raw.eventId, "Mã sự kiện", 100),
    externalId: textInput(raw.externalId, "Mã đơn", 100),
    itemId: textInput(raw.itemId, "Mã sản phẩm", 100),
    clickId: textInput(raw.clickId, "Mã lượt bấm", 100),
    title: textInput(raw.title, "Tên sản phẩm", 200),
    orderValue: integer(raw.orderValue, "Giá trị đơn"),
    commission: integer(raw.commission, "Hoa hồng"),
    status: raw.status,
    reason:
      typeof raw.reason === "string" ? raw.reason.trim().slice(0, 500) : "",
  };
  ensure(
    ["pending", "approved", "rejected"].includes(p.status),
    "Trạng thái báo cáo không hợp lệ.",
  );
  if (p.status === "rejected")
    ensure(p.reason.length > 0, "Đơn từ chối cần có lý do.");
  return p;
}
function applyReport(db, p) {
  const click = db.prepare("SELECT * FROM clicks WHERE id=?").get(p.clickId);
  if (!click) return null;
  const policy = db
    .prepare("SELECT * FROM policies WHERE id=?")
    .get(click.policy_id);
  let old = db
    .prepare("SELECT * FROM orders WHERE external_id=? AND item_id=?")
    .get(p.externalId, p.itemId);
  if (old) {
    ensure(
      old.click_id === click.id,
      "Mã theo dõi xung đột với đơn đã ghi nhận.",
    );
    ensure(
      !(old.status !== "pending" && p.status === "pending"),
      "Không được đưa đơn đã đối soát về chờ duyệt.",
    );
  }
  const orderId = old?.id || id();
  const at = now();
  const amount =
    p.status === "rejected" ? 0 : cashback(p.commission, policy.share_bps);
  const availableAt =
    old?.status === "approved"
      ? old.available_at
      : p.status === "approved"
        ? new Date(Date.now() + policy.hold_days * 86400000).toISOString()
        : null;
  const released =
    old?.status === "approved" && p.status === "approved" ? old.released : 0;
  const newBucket =
    p.status === "pending" ? "pending" : released ? "available" : "locked";
  const oldBucket =
    old?.status === "pending"
      ? "pending"
      : old?.released
        ? "available"
        : "locked";
  const amounts = new Map();
  const add = (key, val) => amounts.set(key, (amounts.get(key) || 0) + val);
  if (old && old.status !== "rejected") {
    add(oldBucket, -old.cashback);
    add("clearing", old.cashback);
  }
  if (p.status !== "rejected") {
    add(newBucket, amount);
    add("clearing", -amount);
  }
  if (old)
    db.prepare(
      "UPDATE orders SET title=?,order_value=?,commission=?,cashback=?,status=?,reason=?,available_at=?,released=?,updated_at=?,estimated_cashback=? WHERE id=?",
    ).run(
      p.title,
      p.orderValue,
      p.commission,
      amount,
      p.status,
      p.reason || null,
      availableAt,
      released,
      at,
      p.status === "pending" ? amount : old.estimated_cashback,
      orderId,
    );
  else
    db.prepare(
      "INSERT INTO orders (id,external_id,item_id,click_id,user_id,policy_id,title,order_value,commission,cashback,status,reason,available_at,released,created_at,updated_at,estimated_cashback) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run(
      orderId,
      p.externalId,
      p.itemId,
      click.id,
      click.user_id,
      policy.id,
      p.title,
      p.orderValue,
      p.commission,
      amount,
      p.status,
      p.reason || null,
      availableAt,
      released,
      at,
      at,
      p.status === "pending" ? amount : null,
    );
  journal(
    db,
    click.user_id,
    `provider:${p.eventId}`,
    `Đối soát ${p.externalId} / ${p.itemId}: ${p.status}`,
    Array.from(amounts),
  );
  notify(
    db,
    click.user_id,
    p.status === "pending"
      ? "Đơn mới được ghi nhận"
      : p.status === "approved"
        ? "Tiền hoàn đã được duyệt"
        : "Hoa hồng bị từ chối",
    `${p.title} · ${p.reason || "Dữ liệu mô phỏng, không phải tiền thật."}`,
  );
  releaseFunds(db, click.user_id);
  return orderId;
}
export function ingestReport(db, raw, actor) {
  const p = normalizedReport(raw);
  const payload = JSON.stringify(p);
  const digest = hash(payload);
  return transaction(db, () => {
    const event = db
      .prepare("SELECT * FROM provider_events WHERE event_id=?")
      .get(p.eventId);
    if (event) {
      ensure(
        event.payload_hash === digest,
        "Mã sự kiện đã tồn tại với nội dung khác.",
      );
      return { duplicate: true, state: event.state, orderId: event.order_id };
    }
    const orderId = applyReport(db, p);
    db.prepare("INSERT INTO provider_events VALUES (?,?,?,?,?,?)").run(
      p.eventId,
      digest,
      payload,
      orderId,
      orderId ? "processed" : "unmatched",
      now(),
    );
    audit(db, actor, "report.import", p.eventId, {
      status: p.status,
      state: orderId ? "processed" : "unmatched",
    });
    return {
      duplicate: false,
      state: orderId ? "processed" : "unmatched",
      orderId,
    };
  });
}
export function resolveUnmatched(db, eventId, clickId, reason, actor) {
  return transaction(db, () => {
    const ev = db
      .prepare(
        "SELECT * FROM provider_events WHERE event_id=? AND state='unmatched'",
      )
      .get(eventId);
    ensure(ev, "Không tìm thấy báo cáo chưa gán.", 404);
    ensure(
      db.prepare("SELECT 1 FROM clicks WHERE id=?").get(clickId),
      "Mã theo dõi chưa tồn tại.",
    );
    const p = { ...JSON.parse(ev.payload), clickId };
    const orderId = applyReport(db, p);
    db.prepare(
      "UPDATE provider_events SET state='processed',order_id=? WHERE event_id=?",
    ).run(orderId, eventId);
    audit(db, actor, "report.resolve", eventId, {
      clickId,
      reason: textInput(reason, "Bằng chứng đối chiếu", 500, 10),
    });
    return { orderId };
  });
}
export function requestWithdrawal(db, userId, amount, requestKey) {
  integer(amount, "Số tiền rút", 1);
  textInput(requestKey, "Mã yêu cầu", 100, 8);
  return transaction(db, () => {
    const existing = db
      .prepare("SELECT * FROM withdrawals WHERE user_id=? AND request_key=?")
      .get(userId, requestKey);
    if (existing) {
      ensure(
        existing.amount === amount,
        "Mã yêu cầu trùng nhưng số tiền khác.",
      );
      return existing;
    }
    releaseFunds(db, userId);
    const policy = currentPolicy(db);
    ensure(policy, "Chưa có chính sách áp dụng.");
    const user = db.prepare("SELECT * FROM users WHERE id=?").get(userId);
    ensure(user?.status === "active", "Tài khoản không hoạt động.", 403);
    ensure(
      user.bank_account,
      "Hãy thêm tài khoản ngân hàng demo trong Cá nhân.",
    );
    ensure(
      amount >= policy.minimum_withdrawal,
      `Số tiền rút tối thiểu ${policy.minimum_withdrawal.toLocaleString("vi-VN")} đ.`,
    );
    ensure(
      balances(db, userId).available >= amount,
      "Số dư khả dụng không đủ.",
    );
    const withdrawalId = id();
    const at = now();
    db.prepare(
      "INSERT INTO withdrawals VALUES (?,?,?,?,?,?,NULL,NULL,?,?)",
    ).run(
      withdrawalId,
      userId,
      amount,
      "requested",
      requestKey,
      JSON.stringify({
        label: user.bank_label,
        account: user.bank_account,
        holder: user.bank_holder,
      }),
      at,
      at,
    );
    journal(
      db,
      userId,
      `withdrawal:hold:${withdrawalId}`,
      "Giữ tiền cho yêu cầu rút",
      [
        ["available", -amount],
        ["held", amount],
      ],
    );
    notify(
      db,
      userId,
      "Đã nhận yêu cầu rút tiền",
      "Tiền đã được giữ. Duyệt yêu cầu chưa có nghĩa là đã thanh toán.",
    );
    return db.prepare("SELECT * FROM withdrawals WHERE id=?").get(withdrawalId);
  });
}
export function processWithdrawal(
  db,
  withdrawalId,
  action,
  reason,
  reference,
  actor,
) {
  return transaction(db, () => {
    const w = db
      .prepare("SELECT * FROM withdrawals WHERE id=?")
      .get(withdrawalId);
    ensure(w, "Không tìm thấy yêu cầu.", 404);
    if (
      action === w.status &&
      ["approved", "paid", "rejected", "failed"].includes(action)
    ) {
      if (action === "paid")
        ensure(
          w.payment_reference === reference,
          "Mã thanh toán khác với lần xử lý trước.",
        );
      return w;
    }
    ensure(
      ["approved", "rejected", "failed", "paid"].includes(action),
      "Thao tác không hợp lệ.",
    );
    ensure(
      (w.status === "requested" && ["approved", "rejected"].includes(action)) ||
        (w.status === "approved" && ["paid", "failed"].includes(action)),
      "Trạng thái yêu cầu không cho phép thao tác này.",
    );
    if (["approved", "paid"].includes(action)) {
      ensure(
        db.prepare("SELECT status FROM users WHERE id=?").get(w.user_id)
          ?.status === "active",
        "Tài khoản đã bị khóa. Không thể tiếp tục thanh toán.",
      );
      ensure(
        balances(db, w.user_id).available >= 0,
        "Có khoản thu hồi làm số dư âm. Cần đối soát hoặc giải phóng yêu cầu trước khi thanh toán.",
      );
    }
    if (["rejected", "failed"].includes(action))
      textInput(reason, "Lý do", 500, 5);
    if (action === "paid") {
      textInput(reference, "Mã thanh toán mô phỏng", 100, 8);
      ensure(
        reference.startsWith("DEMO-"),
        "Mã thanh toán demo phải bắt đầu bằng DEMO-.",
      );
    }
    if (["rejected", "failed"].includes(action))
      journal(
        db,
        w.user_id,
        `withdrawal:release:${w.id}`,
        "Giải phóng tiền giữ: " + reason,
        [
          ["held", -w.amount],
          ["available", w.amount],
        ],
      );
    if (action === "paid")
      journal(
        db,
        w.user_id,
        `withdrawal:paid:${w.id}`,
        "Thanh toán mô phỏng: " + reference,
        [
          ["held", -w.amount],
          ["paid", w.amount],
        ],
      );
    db.prepare(
      "UPDATE withdrawals SET status=?,reason=?,payment_reference=?,updated_at=? WHERE id=?",
    ).run(
      action,
      reason || null,
      action === "paid" ? reference : null,
      now(),
      w.id,
    );
    audit(db, actor, `withdrawal.${action}`, w.id, {
      amount: w.amount,
      reason: reason || "",
      reference: reference || "",
    });
    notify(
      db,
      w.user_id,
      "Yêu cầu rút tiền đã cập nhật",
      `${action === "approved" ? "Đã duyệt, chờ thanh toán mô phỏng" : action === "paid" ? "Đã thanh toán mô phỏng" : reason}. Không có giao dịch ngân hàng thật.`,
    );
    return db.prepare("SELECT * FROM withdrawals WHERE id=?").get(w.id);
  });
}
export function addPolicy(db, input, actor) {
  return transaction(db, () => {
    const p = {
      id: id(),
      version: db
        .prepare("SELECT COALESCE(MAX(version),0)+1 AS v FROM policies")
        .get().v,
      share_bps: integer(input.shareBps, "Tỷ lệ chia (basis points)", 0, 10000),
      hold_days: integer(input.holdDays, "Ngày chờ khả dụng", 0, 365),
      minimum_withdrawal: integer(
        input.minimumWithdrawal,
        "Mức rút tối thiểu",
        1000,
      ),
      effective_at: isoDate(input.effectiveAt, "Thời gian hiệu lực"),
    };
    db.prepare("INSERT INTO policies VALUES (?,?,?,?,?,?,?,?)").run(
      p.id,
      p.version,
      p.share_bps,
      p.hold_days,
      p.minimum_withdrawal,
      p.effective_at,
      "shopee",
      now(),
    );
    audit(db, actor, "policy.create", p.id, p);
    return p;
  });
}
export function adjustBalance(db, userId, amount, reason, reference, actor) {
  integer(amount, "Điều chỉnh", -1_000_000_000, 1_000_000_000);
  ensure(amount !== 0, "Số điều chỉnh phải khác 0.");
  textInput(reason, "Lý do", 500, 10);
  textInput(reference, "Mã tham chiếu", 100, 8);
  return transaction(db, () => {
    ensure(
      db.prepare("SELECT 1 FROM users WHERE id=?").get(userId),
      "Người dùng không tồn tại.",
    );
    journal(db, userId, `adjust:${reference}`, reason, [
      ["available", amount],
      ["clearing", -amount],
    ]);
    audit(db, actor, "balance.adjust", reference, { userId, amount, reason });
    return balances(db, userId);
  });
}
