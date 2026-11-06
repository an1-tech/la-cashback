import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDb, transaction } from "../server/db.js";
import { seed } from "../server/seed.js";
import { createApp } from "../server/app.js";
async function fixture() {
  const db = openDb(":memory:");
  seed(db);
  const server = createApp(db);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  return {
    db,
    server,
    base,
    close: async () => {
      await new Promise((r) => server.close(r));
      db.close();
    },
  };
}
async function request(
  f,
  path,
  { method = "GET", body, cookie, csrf, origin } = {},
) {
  const res = await fetch(f.base + "/api" + path, {
    method,
    headers: {
      ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: res.status,
    data: await res.json(),
    cookie: res.headers.get("set-cookie")?.split(";")[0],
  };
}
async function login(f, email = "ban@demo.local") {
  const r = await request(f, "/auth/login", {
    method: "POST",
    body: { email, password: "Demo@123456" },
  });
  assert.equal(r.status, 200);
  return { cookie: r.cookie, csrf: r.data.csrf };
}
test("Phân quyền backend: người dùng không xem dữ liệu người khác hoặc gọi admin", async () => {
  const f = await fixture();
  try {
    assert.equal((await request(f, "/wallet")).status, 401);
    const user = await login(f);
    const other = await login(f, "khac@demo.local");
    const orders = await request(f, "/orders?userId=someone-else", user);
    assert.equal(orders.status, 200);
    assert.equal(orders.data.length, 4);
    assert.equal((await request(f, "/orders", other)).data.length, 0);
    assert.equal((await request(f, "/admin/overview", user)).status, 403);
    const foreignOrder = orders.data[0].id;
    assert.equal(
      (
        await request(f, "/tickets", {
          ...other,
          method: "POST",
          body: {
            orderId: foreignOrder,
            subject: "Kiểm tra đơn hàng",
            message: "Đây là đơn của người dùng khác",
          },
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request(f, "/admin/reports", {
          ...user,
          method: "POST",
          body: { rows: [] },
        })
      ).status,
      403,
    );
  } finally {
    await f.close();
  }
});
test("CSRF, origin, xác thực đổi ngân hàng và chống nhận tài khoản ngân hàng thật", async () => {
  const f = await fixture();
  try {
    const u = await login(f);
    assert.equal(
      (
        await request(f, "/profile", {
          method: "PATCH",
          cookie: u.cookie,
          body: { name: "Hacker" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request(f, "/profile", {
          ...u,
          method: "PATCH",
          origin: "https://evil.example",
          body: { name: "Hacker" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request(f, "/bank", {
          ...u,
          method: "PUT",
          body: {
            password: "sai",
            label: "Ngân hàng mô phỏng",
            account: "DEMO-00000001",
            holder: "DEMO",
          },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await request(f, "/bank", {
          ...u,
          method: "PUT",
          body: {
            password: "Demo@123456",
            label: "Ngân hàng thật",
            account: "0123456789",
            holder: "TEN THAT",
          },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(f, "/bank", {
          ...u,
          method: "PUT",
          body: {
            password: "Demo@123456",
            label: "Ngân hàng mô phỏng",
            account: "DEMO-00000001",
            holder: "NGUOI DEMO",
          },
        })
      ).status,
      200,
    );
    assert.doesNotMatch(
      f.db
        .prepare("SELECT details FROM audit_logs WHERE action='bank.update'")
        .get().details,
      /00000001/,
    );
  } finally {
    await f.close();
  }
});
test("Luồng API trọn vẹn: link → click → đơn → đối soát → giữ tiền → duyệt → thanh toán", async () => {
  const f = await fixture();
  try {
    const u = await login(f),
      admin = await login(f, "admin@demo.local");
    const inspect = await request(f, "/links/inspect", {
      ...u,
      method: "POST",
      body: { url: "https://shopee.vn/test-i.1.2" },
    });
    assert.equal(inspect.data.estimate, null);
    const before = (await request(f, "/wallet", u)).data.balances;
    const c = await request(f, "/clicks", {
      ...u,
      method: "POST",
      body: { url: "https://shopee.vn/test-i.1.2" },
    });
    assert.equal(c.status, 200);
    assert.deepEqual((await request(f, "/wallet", u)).data.balances, before);
    const order = await request(f, "/demo/order", {
      ...u,
      method: "POST",
      body: { clickId: c.data.trackingId },
    });
    assert.equal(order.status, 200);
    assert.equal(
      (
        await request(f, "/demo/order", {
          ...u,
          method: "POST",
          body: { clickId: c.data.trackingId },
        })
      ).data.duplicate,
      true,
    );
    const row = (await request(f, "/orders", u)).data.find(
      (o) => o.id === order.data.orderId,
    );
    assert.equal(row.cashback, 17500);
    const approved = await request(f, "/admin/reconcile", {
      ...admin,
      method: "POST",
      body: {
        orderId: row.id,
        eventId: "api-approval-001",
        commission: 25000,
        status: "approved",
      },
    });
    assert.equal(approved.status, 200);
    const w = await request(f, "/withdrawals", {
      ...u,
      method: "POST",
      body: { amount: 50000, requestKey: "api-withdraw-001" },
    });
    assert.equal(w.status, 200);
    assert.equal(
      (
        await request(f, "/admin/withdrawals", {
          ...admin,
          method: "POST",
          body: { id: w.data.id, action: "approved" },
        })
      ).status,
      200,
    );
    const paidBefore = (await request(f, "/wallet", u)).data.balances.paid;
    assert.equal(
      (
        await request(f, "/admin/withdrawals", {
          ...admin,
          method: "POST",
          body: {
            id: w.data.id,
            action: "paid",
            reference: "DEMO-API-PAY-001",
          },
        })
      ).status,
      200,
    );
    assert.equal(
      (await request(f, "/wallet", u)).data.balances.paid,
      paidBefore + 50000,
    );
  } finally {
    await f.close();
  }
});
test("Nhập báo cáo kiểm tra từng dòng, chống trùng, giữ lại dòng chưa gán", async () => {
  const f = await fixture();
  try {
    const admin = await login(f, "admin@demo.local");
    const c = f.db.prepare("SELECT id FROM clicks LIMIT 1").get().id;
    const good = {
      eventId: "import-valid",
      externalId: "IMPORT-001",
      itemId: "1",
      clickId: c,
      title: "Dòng hợp lệ",
      orderValue: 100000,
      commission: 10000,
      status: "pending",
    };
    const result = await request(f, "/admin/reports", {
      ...admin,
      method: "POST",
      body: {
        rows: [
          good,
          { ...good, eventId: "bad", commission: 1.5 },
          {
            ...good,
            eventId: "unmatched",
            externalId: "UNKNOWN",
            clickId: "unknown",
          },
          good,
        ],
      },
    });
    assert.equal(result.status, 200);
    assert.equal(result.data.results[0].state, "processed");
    assert.match(result.data.results[1].error, /số nguyên/);
    assert.equal(result.data.results[2].state, "unmatched");
    assert.equal(result.data.results[3].duplicate, true);
  } finally {
    await f.close();
  }
});
test("Đăng ký, hồ sơ, hỗ trợ, chức năng đã gỡ, thông báo và reset", async () => {
  const f = await fixture();
  try {
    const r = await request(f, "/auth/register", {
      method: "POST",
      body: {
        name: "Người thử",
        email: "new@demo.local",
        password: "Test@123456",
      },
    });
    assert.equal(r.status, 200);
    const u = { cookie: r.cookie, csrf: r.data.csrf };
    assert.equal(
      (
        await request(f, "/profile", {
          ...u,
          method: "PATCH",
          body: { name: "Tên mới" },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request(f, "/tickets", {
          ...u,
          method: "POST",
          body: {
            subject: "Thiếu đơn hàng",
            message: "Kiểm tra mã đơn demo chưa được ghi nhận",
          },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request(f, "/deals/deal-1/save", {
          ...u,
          method: "POST",
          body: { saved: true },
        })
      ).status,
      404,
    );
    assert.equal("deals" in (await request(f, "/bootstrap", u)).data, false);
    assert.equal(
      (
        await request(f, "/notifications/read", {
          ...u,
          method: "POST",
          body: {},
        })
      ).status,
      200,
    );
    const reset = await request(f, "/auth/forgot", {
      method: "POST",
      body: { email: "new@demo.local" },
    });
    assert.ok(reset.data.resetToken);
    assert.equal(
      (
        await request(f, "/auth/reset", {
          method: "POST",
          body: { token: reset.data.resetToken, password: "NewPassword@123" },
        })
      ).status,
      200,
    );
    assert.equal((await request(f, "/wallet", u)).status, 401);
    assert.equal(
      (
        await request(f, "/auth/reset", {
          method: "POST",
          body: { token: reset.data.resetToken, password: "NewPassword@123" },
        })
      ).status,
      400,
    );
  } finally {
    await f.close();
  }
});
test("Phục vụ trang chủ, tài sản React và route cửa hàng mô phỏng", async () => {
  const folder = mkdtempSync(join(tmpdir(), "la-static-"));
  writeFileSync(
    join(folder, "index.html"),
    '<html lang="vi">Lá Cashback</html>',
  );
  writeFileSync(join(folder, "app.js"), 'console.log("react-app")');
  const db = openDb(":memory:");
  const server = createApp(db, { staticDir: folder });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    for (const path of ["/", "/demo-shop?click=demo"]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /text\/html/);
      assert.match(await response.text(), /Lá Cashback/);
    }
    const asset = await fetch(base + "/app.js");
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get("content-type"), /javascript/);
    assert.equal((await fetch(base + "/missing.js")).status, 404);
    const head = await fetch(base + "/", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
    assert.ok(folder.startsWith(join(tmpdir(), "la-static-")));
    rmSync(folder, { recursive: true, force: true });
  }
});
test("Rate limit tạo link và tài khoản bị khóa không thể dùng phiên cũ", async () => {
  const f = await fixture();
  try {
    const u = await login(f),
      admin = await login(f, "admin@demo.local");
    for (let i = 0; i < 20; i++)
      assert.equal(
        (
          await request(f, "/clicks", {
            ...u,
            method: "POST",
            body: { url: "https://shopee.vn/test-i.1.2" },
          })
        ).status,
        200,
      );
    assert.equal(
      (
        await request(f, "/clicks", {
          ...u,
          method: "POST",
          body: { url: "https://shopee.vn/test-i.1.2" },
        })
      ).status,
      429,
    );
    const uid = (await request(f, "/bootstrap", u)).data.user.id;
    assert.equal(
      (
        await request(f, "/admin/users", {
          ...admin,
          method: "PATCH",
          body: { id: uid, status: "blocked" },
        })
      ).status,
      200,
    );
    assert.equal((await request(f, "/wallet", u)).status, 401);
  } finally {
    await f.close();
  }
});
test("Đoán sai mật khẩu từ nơi khác không khóa được chủ tài khoản; đúng thì xóa bộ đếm", async () => {
  const f = await fixture();
  try {
    // Kẻ tấn công ở IP khác đã sai 50 lần.
    f.db
      .prepare("INSERT INTO rate_limits VALUES (?,?,?)")
      .run("auth:fail:ban@demo.local:203.0.113.9", 50, Date.now() + 900000);
    await login(f);
    const wrong = () =>
      request(f, "/auth/login", {
        method: "POST",
        body: { email: "ban@demo.local", password: "SaiMatKhau1" },
      });
    for (let i = 0; i < 9; i++) assert.equal((await wrong()).status, 401);
    await login(f);
    for (let i = 0; i < 10; i++) assert.equal((await wrong()).status, 401);
    assert.equal((await wrong()).status, 429);
  } finally {
    await f.close();
  }
});
test("Dữ liệu sai kiểu và URL hỏng trả lỗi 4xx thay vì 500", async () => {
  const f = await fixture();
  try {
    const admin = await login(f, "admin@demo.local");
    const ov = (await request(f, "/admin/overview", admin)).data;
    const w = ov.withdrawals[0].id;
    for (const [path, body, method = "POST"] of [
      ["/admin/withdrawals", { id: w, action: "approved", reason: { a: 1 } }],
      ["/admin/withdrawals", { id: { a: 1 }, action: "approved" }],
      ["/admin/withdrawals", { id: w, action: "paid", reference: ["x"] }],
      ["/admin/reconcile", { orderId: { a: 1 }, eventId: "evt-12345678" }],
      [
        "/admin/resolve",
        { eventId: [1], clickId: "x", reason: "a".repeat(12) },
      ],
      [
        "/admin/adjustments",
        {
          userId: {},
          amount: 5,
          reason: "a".repeat(12),
          reference: "ADJ-12345",
        },
      ],
      ["/admin/users", { id: { a: 1 }, status: "blocked" }, "PATCH"],
      ["/admin/tickets", { id: [1], response: "xin chào" }],
      [
        "/tickets",
        { orderId: { a: 1 }, subject: "Hỏi đơn", message: "0123456789" },
      ],
      ["/demo/order", { clickId: { a: 1 } }],
    ]) {
      const r = await request(f, path, { ...admin, method, body });
      assert.ok(r.status >= 400 && r.status < 500, `${path} → ${r.status}`);
    }
    const bad = await fetch(f.base + "/%E0%A4%A");
    assert.equal(bad.status, 400);
  } finally {
    await f.close();
  }
});
test("Không tạo được chính sách hiệu lực lùi về quá khứ", async () => {
  const f = await fixture();
  try {
    const admin = await login(f, "admin@demo.local");
    const policy = (effectiveAt) =>
      request(f, "/admin/policies", {
        ...admin,
        method: "POST",
        body: {
          shareBps: 9000,
          holdDays: 0,
          minimumWithdrawal: 1000,
          effectiveAt,
        },
      });
    assert.equal((await policy("2020-01-01T00:00:00.000Z")).status, 400);
    assert.equal((await policy(new Date().toISOString())).status, 200);
    const later = new Date(Date.now() + 86400000).toISOString();
    assert.equal((await policy(later)).status, 200);
  } finally {
    await f.close();
  }
});
test("Sandbox khách: tài khoản riêng có dữ liệu mẫu, không đụng người mua chung", async () => {
  const f = await fixture();
  try {
    const start = await request(f, "/auth/demo", { method: "POST", body: {} });
    assert.equal(start.status, 200);
    assert.match(start.data.user.email, /^khach-[0-9a-f]{8}@demo\.local$/);
    const guest = { cookie: start.cookie, csrf: start.data.csrf };
    const orders = await request(f, "/orders", guest);
    assert.equal(orders.data.length, 4);
    assert.ok(orders.data.every((o) => o.clicked_at));
    const wallet = await request(f, "/wallet", guest);
    assert.equal(wallet.data.balances.available, 76000);
    const second = await request(f, "/auth/demo", { method: "POST", body: {} });
    assert.notEqual(second.data.user.email, start.data.user.email);
    const shared = await login(f);
    assert.equal((await request(f, "/orders", shared)).data.length, 4);
    for (let i = 0; i < 3; i++)
      await request(f, "/auth/demo", { method: "POST", body: {} });
    assert.equal(
      (await request(f, "/auth/demo", { method: "POST", body: {} })).status,
      429,
    );
  } finally {
    await f.close();
  }
});
test("Đối soát khác số nguồn cần lý do; nhật ký ghi đăng nhập và thao tác đối soát", async () => {
  const f = await fixture();
  try {
    const admin = await login(f, "admin@demo.local");
    const overview = await request(f, "/admin/overview", admin);
    assert.equal(overview.data.stats.unbalancedJournals, 0);
    const order = overview.data.orders.find((o) => o.status === "pending");
    const reconcile = (body) =>
      request(f, "/admin/reconcile", {
        ...admin,
        method: "POST",
        body: { orderId: order.id, status: "approved", ...body },
      });
    const changed = await reconcile({
      eventId: "api-diff-0001",
      commission: order.commission + 5000,
    });
    assert.equal(changed.status, 400);
    assert.match(changed.data.error, /Cần lý do/);
    assert.equal(
      (
        await reconcile({
          eventId: "api-diff-0002",
          commission: order.commission + 5000,
          reason: "Nguồn gửi bản điều chỉnh tăng hoa hồng",
        })
      ).status,
      200,
    );
    const audit = (await request(f, "/admin/overview", admin)).data.audit;
    assert.ok(audit.some((a) => a.action === "auth.login"));
    const entry = audit.find((a) => a.action === "order.reconcile");
    assert.equal(
      JSON.parse(entry.details).previousCommission,
      order.commission,
    );
  } finally {
    await f.close();
  }
});
test("Tệp tĩnh: route lạ trả 404, asset có mã băm cache vĩnh viễn, HSTS khi HTTPS", async () => {
  const dir = mkdtempSync(join(tmpdir(), "la-static-"));
  const db = openDb(":memory:");
  seed(db);
  const server = createApp(db, { staticDir: dir, secureCookie: true });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    writeFileSync(join(dir, "index.html"), "<!doctype html><title>x</title>");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(dir, "assets"));
    writeFileSync(join(dir, "assets", "index-abc.js"), "1");
    writeFileSync(join(dir, "robots.txt"), "User-agent: *");
    const app = await fetch(base + "/app");
    assert.equal(app.status, 200);
    assert.match(app.headers.get("strict-transport-security"), /max-age=/);
    assert.equal((await fetch(base + "/khong-ton-tai")).status, 404);
    const asset = await fetch(base + "/assets/index-abc.js");
    assert.match(asset.headers.get("cache-control"), /immutable/);
    const robots = await fetch(base + "/robots.txt");
    assert.equal(
      robots.headers.get("content-type"),
      "text/plain; charset=utf-8",
    );
    const missing = await fetch(base + "/favicon.ico");
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error, "Không tìm thấy.");
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("Sandbox theo chính sách hiện hành; lỗi giữa chừng hoàn tác toàn bộ", async () => {
  const f = await fixture();
  try {
    const admin = await login(f, "admin@demo.local");
    const policy = await request(f, "/admin/policies", {
      ...admin,
      method: "POST",
      body: {
        shareBps: 7000,
        holdDays: 1,
        minimumWithdrawal: 100000,
        effectiveAt: new Date().toISOString(),
      },
    });
    assert.equal(policy.status, 200);
    const start = await request(f, "/auth/demo", { method: "POST", body: {} });
    assert.equal(start.status, 200);
    const guest = { cookie: start.cookie, csrf: start.data.csrf };
    assert.equal((await request(f, "/orders", guest)).data.length, 4);
    const wallet = (await request(f, "/wallet", guest)).data;
    assert.equal(wallet.balances.locked, 126000);
    assert.equal(wallet.balances.available, 0);
    assert.equal(wallet.withdrawals.length, 0);
    const users = f.db.prepare("SELECT COUNT(*) n FROM users").get().n;
    assert.throws(() =>
      transaction(f.db, () => {
        f.db
          .prepare(
            "INSERT INTO users(id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)",
          )
          .run(
            "tx-test",
            "tx@demo.local",
            "Tx",
            "x:y",
            new Date().toISOString(),
          );
        transaction(f.db, () => {
          throw new Error("lỗi giữa chừng");
        });
      }),
    );
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM users").get().n, users);
  } finally {
    await f.close();
  }
});
test("Sai mật khẩu xác nhận khác với hết phiên", async () => {
  const f = await fixture();
  try {
    const user = await login(f);
    const wrong = await request(f, "/bank", {
      ...user,
      method: "PUT",
      body: {
        password: "Sai-mat-khau-1",
        label: "Ngân hàng mô phỏng",
        account: "DEMO-00009999",
        holder: "NGUOI DUNG DEMO",
      },
    });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.data.reason, undefined);
    assert.equal((await request(f, "/wallet", user)).status, 200);
    const expired = await request(f, "/wallet");
    assert.equal(expired.status, 401);
    assert.equal(expired.data.reason, "auth_required");
  } finally {
    await f.close();
  }
});
test("Đơn quản trị: phân trang, tìm phía server, CSV đủ dữ liệu và chặn công thức", async () => {
  const f = await fixture();
  try {
    const admin = await login(f, "admin@demo.local");
    const click = (await request(f, "/admin/overview", admin)).data.clicks[0];
    const rows = Array.from({ length: 60 }, (_, i) => ({
      eventId: `page-test-${i}`,
      externalId: `PAGE-${i}`,
      itemId: "1",
      clickId: click.id,
      title: i === 0 ? "=1+1" : `Đơn phân trang ${i}`,
      orderValue: 100000,
      commission: 1000,
      status: "pending",
    }));
    const imported = await request(f, "/admin/reports", {
      ...admin,
      method: "POST",
      body: { rows },
    });
    assert.ok(imported.data.results.every((r) => !r.error));
    const first = await request(f, "/admin/orders?page=1", admin);
    assert.equal(first.data.total, 64);
    assert.equal(first.data.rows.length, 50);
    const second = await request(f, "/admin/orders?page=2", admin);
    assert.equal(second.data.rows.length, 14);
    const beyond = await request(f, "/admin/orders?page=999", admin);
    assert.equal(beyond.data.page, 2);
    assert.deepEqual(
      beyond.data.rows.map((o) => o.id),
      second.data.rows.map((o) => o.id),
    );
    const empty = await request(
      f,
      "/admin/orders?page=999&q=NO-SUCH-ORDER",
      admin,
    );
    assert.equal(empty.data.page, 1);
    assert.equal(empty.data.total, 0);
    assert.deepEqual(empty.data.rows, []);
    for (const value of ["1.1", "Infinity", "-1", "abc"]) {
      assert.equal(
        (await request(f, "/admin/orders?page=" + value, admin)).status,
        400,
      );
    }
    const found = await request(f, "/admin/orders?q=PAGE-59", admin);
    assert.equal(found.data.total, 1);
    assert.equal(
      (await request(f, "/admin/orders?status=approved", admin)).data.total,
      1,
    );
    const csv = await fetch(f.base + "/api/admin/orders.csv", {
      headers: { Cookie: admin.cookie },
    });
    assert.match(csv.headers.get("content-type"), /text\/csv/);
    const text = await csv.text();
    assert.equal(text.trim().split("\r\n").length, 65);
    assert.ok(text.includes(`"'=1+1"`));
    assert.ok(!text.includes(`"=1+1"`));
    assert.equal(
      (await request(f, "/admin/orders", await login(f))).status,
      403,
    );
  } finally {
    await f.close();
  }
});
