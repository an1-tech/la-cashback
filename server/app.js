import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { now, transaction } from "./db.js";
import {
  AppError,
  ensure,
  textInput,
  integer,
  isoDate,
  shopeeUrl,
  rateLimit,
  token,
  hash,
  passwordHash,
  passwordMatches,
} from "./security.js";
import {
  id,
  balances,
  currentPolicy,
  releaseFunds,
  audit,
  ingestReport,
  resolveUnmatched,
  requestWithdrawal,
  processWithdrawal,
  addPolicy,
  adjustBalance,
} from "./finance.js";
import { demoProvider } from "./providers/demo.js";
const safeUser = (u) =>
  u && {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    bank: u.bank_account
      ? { label: u.bank_label, account: u.bank_account, holder: u.bank_holder }
      : null,
  };
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};
export function createApp(
  db,
  { secureCookie = false, staticDir = resolve("dist") } = {},
) {
  return createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    const send = (data, status = 200) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, "http://localhost");
      const path = url.pathname;
      if (!path.startsWith("/api/")) {
        ensure(
          req.method === "GET" || req.method === "HEAD",
          "Không hỗ trợ phương thức.",
          405,
        );
        let file = resolve(staticDir, "." + decodeURIComponent(path));
        ensure(
          file === staticDir || file.startsWith(staticDir + sep),
          "Đường dẫn không hợp lệ.",
          404,
        );
        if (!extname(file)) file = resolve(staticDir, "index.html");
        try {
          const info = await stat(file);
          ensure(info.isFile(), "Không tìm thấy.", 404);
          const data = await readFile(file);
          res.writeHead(200, {
            "Content-Type": mime[extname(file)] || "application/octet-stream",
            "Cache-Control":
              extname(file) === ".html" ? "no-cache" : "public,max-age=3600",
          });
          res.end(req.method === "HEAD" ? undefined : data);
        } catch (error) {
          if (error.status) throw error;
          throw new AppError(
            "Chưa có giao diện build. Chạy npm run build trước npm start.",
            404,
          );
        }
        return;
      }
      let body = {};
      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        const origin = req.headers.origin;
        if (origin) {
          let parsed;
          try {
            parsed = new URL(origin);
          } catch {
            throw new AppError("Origin không hợp lệ.", 403);
          }
          ensure(
            parsed.host === req.headers.host,
            "Không cho phép yêu cầu từ nguồn khác.",
            403,
          );
        }
        ensure(
          req.headers["content-type"]?.startsWith("application/json"),
          "Yêu cầu Content-Type application/json.",
          415,
        );
        const chunks = [];
        let length = 0;
        for await (const chunk of req) {
          length += chunk.length;
          ensure(length <= 524288, "Nội dung quá lớn.", 413);
          chunks.push(chunk);
        }
        try {
          body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        } catch {
          throw new AppError("JSON không hợp lệ.");
        }
        ensure(
          body && typeof body === "object" && !Array.isArray(body),
          "Nội dung phải là object.",
        );
      }
      const sessionToken = (req.headers.cookie || "")
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("la_session="))
        ?.slice(11);
      const session = sessionToken
        ? db
            .prepare(
              "SELECT s.*,u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=? AND expires_at>?",
            )
            .get(hash(sessionToken), now())
        : null;
      const user = session?.status === "active" ? session : null;
      const needUser = () => {
        ensure(user, "Vui lòng đăng nhập để tiếp tục.", 401);
        return user;
      };
      const needAdmin = () => {
        needUser();
        ensure(
          user.role === "admin",
          "Chỉ quản trị viên được thực hiện thao tác này.",
          403,
        );
      };
      if (
        !["GET", "HEAD"].includes(req.method) &&
        ![
          "/api/auth/login",
          "/api/auth/register",
          "/api/auth/forgot",
          "/api/auth/reset",
        ].includes(path)
      ) {
        needUser();
        ensure(
          req.headers["x-csrf-token"] === session.csrf,
          "Phiên xác thực đã thay đổi. Vui lòng tải lại trang.",
          403,
        );
      }
      const method = req.method;
      const beginSession = (uid) => {
        const t = token(),
          csrf = token();
        db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(now());
        db.prepare("INSERT INTO sessions VALUES (?,?,?,?)").run(
          hash(t),
          uid,
          csrf,
          new Date(Date.now() + 8 * 3600000).toISOString(),
        );
        res.setHeader(
          "Set-Cookie",
          `la_session=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secureCookie ? "; Secure" : ""}`,
        );
        return csrf;
      };
      const ip = req.socket.remoteAddress || "local";
      if (method === "GET" && path === "/api/bootstrap") {
        if (user) transaction(db, () => releaseFunds(db, user.id));
        const deals = db
          .prepare(
            "SELECT * FROM deals WHERE active=1 AND expires_at>? ORDER BY rowid",
          )
          .all(now());
        const saved = user
          ? db
              .prepare("SELECT deal_id FROM saved_deals WHERE user_id=?")
              .all(user.id)
              .map((x) => x.deal_id)
          : [];
        send({
          demo: true,
          provider: "demo",
          user: safeUser(user),
          csrf: user?.csrf || null,
          policy: currentPolicy(db),
          content: Object.fromEntries(
            db
              .prepare("SELECT * FROM content")
              .all()
              .map((x) => [x.key, x.value]),
          ),
          deals: deals.map((d) => ({ ...d, saved: saved.includes(d.id) })),
          balances: user ? balances(db, user.id) : null,
          unread: user
            ? db
                .prepare(
                  "SELECT COUNT(*) AS n FROM notifications WHERE user_id=? AND read_at IS NULL",
                )
                .get(user.id).n
            : 0,
        });
        return;
      }
      if (
        method === "POST" &&
        ["/api/auth/register", "/api/auth/login"].includes(path)
      ) {
        rateLimit(db, `auth:ip:${ip}`, 25, 900);
        const email = textInput(body.email, "Email", 254).toLowerCase();
        ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "Email không hợp lệ.");
        rateLimit(db, `auth:email:${email}`, 10, 900);
        const password = textInput(body.password, "Mật khẩu", 128, 10);
        let found = db.prepare("SELECT * FROM users WHERE email=?").get(email);
        if (path.endsWith("/register")) {
          ensure(!found, "Email đã được sử dụng.");
          const uid = id();
          db.prepare(
            "INSERT INTO users(id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)",
          ).run(
            uid,
            email,
            textInput(body.name, "Tên", 80, 2),
            passwordHash(password),
            now(),
          );
          found = db.prepare("SELECT * FROM users WHERE id=?").get(uid);
        } else {
          const fallback =
            "00000000000000000000000000000000:" + "00".repeat(64);
          ensure(
            passwordMatches(password, found?.password_hash || fallback) &&
              found?.status === "active",
            "Email hoặc mật khẩu không đúng, hoặc tài khoản đang bị khóa.",
            401,
          );
        }
        send({ user: safeUser(found), csrf: beginSession(found.id) });
        return;
      }
      if (method === "POST" && path === "/api/auth/logout") {
        db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
          user.token_hash,
        );
        res.setHeader(
          "Set-Cookie",
          `la_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureCookie ? "; Secure" : ""}`,
        );
        send({ ok: true });
        return;
      }
      if (method === "POST" && path === "/api/auth/forgot") {
        rateLimit(db, `reset:${ip}`, 5, 900);
        const email = textInput(body.email, "Email", 254).toLowerCase();
        const u = db.prepare("SELECT * FROM users WHERE email=?").get(email);
        let resetToken = null;
        if (u) {
          resetToken = token();
          db.prepare("INSERT INTO reset_tokens VALUES (?,?,?,NULL)").run(
            hash(resetToken),
            u.id,
            new Date(Date.now() + 15 * 60000).toISOString(),
          );
        }
        send({
          message:
            "Demo: chưa kết nối email. Nếu tài khoản tồn tại, mã thử nghiệm hiển thị bên dưới.",
          resetToken,
        });
        return;
      }
      if (method === "POST" && path === "/api/auth/reset") {
        rateLimit(db, `reset-use:${ip}`, 10, 900);
        const t = textInput(body.token, "Mã đặt lại", 100);
        const pw = textInput(body.password, "Mật khẩu mới", 128, 10);
        transaction(db, () => {
          const r = db
            .prepare(
              "SELECT * FROM reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>?",
            )
            .get(hash(t), now());
          ensure(r, "Mã không hợp lệ hoặc đã hết hạn.");
          db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(
            passwordHash(pw),
            r.user_id,
          );
          db.prepare(
            "UPDATE reset_tokens SET used_at=? WHERE user_id=? AND used_at IS NULL",
          ).run(now(), r.user_id);
          db.prepare("DELETE FROM sessions WHERE user_id=?").run(r.user_id);
        });
        send({ ok: true });
        return;
      }
      if (method === "POST" && path === "/api/links/inspect") {
        rateLimit(db, `inspect:${user.id}`, 40, 60);
        send(demoProvider.inspect(body.url));
        return;
      }
      if (method === "POST" && path === "/api/clicks") {
        rateLimit(db, `click:${user.id}`, 20, 60);
        const link = shopeeUrl(body.url);
        const policy = currentPolicy(db);
        ensure(policy, "Chưa có chính sách đang áp dụng.");
        const clickId = id();
        db.prepare("INSERT INTO clicks VALUES (?,?,?,?,?,?,?)").run(
          clickId,
          user.id,
          policy.id,
          "demo",
          link,
          null,
          now(),
        );
        send({
          ...demoProvider.createLink(clickId),
          policyVersion: policy.version,
        });
        return;
      }
      if (method === "GET" && path === "/api/clicks") {
        needUser();
        send(
          db
            .prepare(
              "SELECT c.*,p.version FROM clicks c JOIN policies p ON p.id=c.policy_id WHERE c.user_id=? ORDER BY c.created_at DESC LIMIT 100",
            )
            .all(user.id),
        );
        return;
      }
      if (method === "POST" && path === "/api/demo/order") {
        rateLimit(db, `demo:${user.id}`, 20, 60);
        const click = db
          .prepare("SELECT * FROM clicks WHERE id=? AND user_id=?")
          .get(body.clickId, user.id);
        ensure(click, "Không tìm thấy lượt bấm của bạn.", 404);
        const externalId = `DEMO-${click.id}`;
        const result = ingestReport(
          db,
          {
            eventId: `demo-order-${click.id}`,
            externalId,
            itemId: "1",
            clickId: click.id,
            title: "Sản phẩm mô phỏng từ lượt mua thử",
            orderValue: 450000,
            commission: 25000,
            status: "pending",
          },
          user.id,
        );
        send(result);
        return;
      }
      if (method === "GET" && path === "/api/orders") {
        needUser();
        const status = url.searchParams.get("status") || "";
        ensure(
          !status || ["pending", "approved", "rejected"].includes(status),
          "Bộ lọc trạng thái không hợp lệ.",
        );
        const from = url.searchParams.get("from") || "",
          to = url.searchParams.get("to") || "";
        for (const val of [from, to])
          ensure(
            !val || /^\d{4}-\d\d-\d\d$/.test(val),
            "Ngày lọc không hợp lệ.",
          );
        const rows = db
          .prepare(
            "SELECT o.*,p.version,p.share_bps,p.hold_days FROM orders o JOIN policies p ON p.id=o.policy_id WHERE o.user_id=? AND (?='' OR o.status=?) AND (?='' OR substr(o.created_at,1,10)>=?) AND (?='' OR substr(o.created_at,1,10)<=?) ORDER BY o.created_at DESC LIMIT 500",
          )
          .all(user.id, status, status, from, from, to, to);
        send(rows);
        return;
      }
      if (method === "GET" && path === "/api/wallet") {
        needUser();
        transaction(db, () => releaseFunds(db, user.id));
        send({
          balances: balances(db, user.id),
          withdrawals: db
            .prepare(
              "SELECT * FROM withdrawals WHERE user_id=? ORDER BY created_at DESC LIMIT 200",
            )
            .all(user.id),
          ledger: db
            .prepare(
              "SELECT j.id,j.reference,j.description,j.created_at,l.account,l.amount FROM journals j JOIN ledger l ON j.id=l.journal_id WHERE j.user_id=? AND l.account!='clearing' ORDER BY j.created_at DESC,l.id DESC LIMIT 500",
            )
            .all(user.id),
          policy: currentPolicy(db),
        });
        return;
      }
      if (method === "POST" && path === "/api/withdrawals") {
        rateLimit(db, `withdraw:${user.id}`, 10, 300);
        send(requestWithdrawal(db, user.id, body.amount, body.requestKey));
        return;
      }
      if (method === "PATCH" && path === "/api/profile") {
        const name = textInput(body.name, "Tên", 80, 2);
        db.prepare("UPDATE users SET name=? WHERE id=?").run(name, user.id);
        send({ ok: true });
        return;
      }
      if (method === "PUT" && path === "/api/bank") {
        rateLimit(db, `bank:${user.id}`, 5, 900);
        ensure(
          passwordMatches(body.password, user.password_hash),
          "Mật khẩu xác nhận không đúng.",
          401,
        );
        ensure(
          body.label === "Ngân hàng mô phỏng" &&
            /^DEMO-\d{8}$/.test(body.account),
          "Chỉ dùng ngân hàng mô phỏng và số DEMO-xxxxxxxx. Không nhập thông tin ngân hàng thật.",
        );
        const holder = textInput(body.holder, "Tên người nhận demo", 80, 3);
        transaction(db, () => {
          db.prepare(
            "UPDATE users SET bank_label=?,bank_account=?,bank_holder=?,bank_changed_at=? WHERE id=?",
          ).run(body.label, body.account, holder, now(), user.id);
          audit(db, user.id, "bank.update", user.id, {
            account: "DEMO-****" + body.account.slice(-4),
          });
        });
        send({ ok: true });
        return;
      }
      if (method === "GET" && path === "/api/notifications") {
        needUser();
        send(
          db
            .prepare(
              "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
            )
            .all(user.id),
        );
        return;
      }
      if (method === "POST" && path === "/api/notifications/read") {
        db.prepare(
          "UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL",
        ).run(now(), user.id);
        send({ ok: true });
        return;
      }
      if (method === "POST" && /^\/api\/deals\/[^/]+\/save$/.test(path)) {
        const dealId = path.split("/")[3];
        ensure(
          db.prepare("SELECT 1 FROM deals WHERE id=?").get(dealId),
          "Ưu đãi không tồn tại.",
          404,
        );
        if (body.saved === true)
          db.prepare("INSERT OR IGNORE INTO saved_deals VALUES (?,?)").run(
            user.id,
            dealId,
          );
        else
          db.prepare(
            "DELETE FROM saved_deals WHERE user_id=? AND deal_id=?",
          ).run(user.id, dealId);
        send({ ok: true });
        return;
      }
      if (method === "GET" && path === "/api/tickets") {
        needUser();
        send(
          db
            .prepare(
              "SELECT * FROM tickets WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
            )
            .all(user.id),
        );
        return;
      }
      if (method === "POST" && path === "/api/tickets") {
        rateLimit(db, `ticket:${user.id}`, 10, 3600);
        if (body.orderId)
          ensure(
            db
              .prepare("SELECT 1 FROM orders WHERE id=? AND user_id=?")
              .get(body.orderId, user.id),
            "Không tìm thấy đơn của bạn.",
            404,
          );
        const ticketId = id(),
          at = now();
        db.prepare("INSERT INTO tickets VALUES (?,?,?,?,?,?,NULL,?,?)").run(
          ticketId,
          user.id,
          body.orderId || null,
          textInput(body.subject, "Tiêu đề", 120, 5),
          textInput(body.message, "Nội dung", 2000, 10),
          "open",
          at,
          at,
        );
        send({ id: ticketId });
        return;
      }
      if (path.startsWith("/api/admin/")) {
        needAdmin();
        if (method === "GET" && path === "/api/admin/overview") {
          for (const row of db
            .prepare(
              "SELECT DISTINCT user_id FROM orders WHERE status='approved' AND released=0 AND available_at<=?",
            )
            .all(now()))
            transaction(db, () => releaseFunds(db, row.user_id));
          const stats = {
            users: db.prepare("SELECT COUNT(*) n FROM users").get().n,
            clicks: db.prepare("SELECT COUNT(*) n FROM clicks").get().n,
            orders: db.prepare("SELECT COUNT(*) n FROM orders").get().n,
            commission: db
              .prepare(
                "SELECT COALESCE(SUM(commission),0) n FROM orders WHERE status='approved'",
              )
              .get().n,
            payable: db
              .prepare(
                "SELECT COALESCE(SUM(amount),0) n FROM ledger WHERE account IN ('locked','available','held')",
              )
              .get().n,
            withdrawals: db
              .prepare(
                "SELECT COUNT(*) n FROM withdrawals WHERE status IN ('requested','approved')",
              )
              .get().n,
          };
          send({
            stats,
            users: db
              .prepare(
                "SELECT id,email,name,role,status,created_at FROM users ORDER BY created_at DESC",
              )
              .all(),
            orders: db
              .prepare(
                "SELECT o.*,u.email,p.version FROM orders o JOIN users u ON u.id=o.user_id JOIN policies p ON p.id=o.policy_id ORDER BY o.updated_at DESC LIMIT 500",
              )
              .all(),
            clicks: db
              .prepare(
                "SELECT c.*,u.email FROM clicks c JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC LIMIT 200",
              )
              .all(),
            withdrawals: db
              .prepare(
                "SELECT w.*,u.email FROM withdrawals w JOIN users u ON u.id=w.user_id ORDER BY w.created_at DESC LIMIT 200",
              )
              .all(),
            policies: db
              .prepare("SELECT * FROM policies ORDER BY version DESC")
              .all(),
            unmatched: db
              .prepare(
                "SELECT * FROM provider_events WHERE state='unmatched' ORDER BY created_at DESC LIMIT 200",
              )
              .all(),
            tickets: db
              .prepare(
                "SELECT t.*,u.email FROM tickets t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 200",
              )
              .all(),
            audit: db
              .prepare(
                "SELECT a.*,u.email FROM audit_logs a JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 200",
              )
              .all(),
            deals: db.prepare("SELECT * FROM deals").all(),
            content: Object.fromEntries(
              db
                .prepare("SELECT * FROM content")
                .all()
                .map((x) => [x.key, x.value]),
            ),
          });
          return;
        }
        if (method === "POST" && path === "/api/admin/reports") {
          ensure(
            Array.isArray(body.rows) &&
              body.rows.length > 0 &&
              body.rows.length <= 200,
            "Báo cáo cần từ 1 đến 200 dòng.",
          );
          send({
            results: body.rows.map((row, index) => {
              try {
                return { line: index + 1, ...ingestReport(db, row, user.id) };
              } catch (error) {
                if (
                  !error.status &&
                  !String(error.code).startsWith("ERR_SQLITE")
                )
                  throw error;
                return {
                  line: index + 1,
                  error: error.status
                    ? error.message
                    : "Dữ liệu vi phạm ràng buộc. Kiểm tra mã tham chiếu.",
                };
              }
            }),
          });
          return;
        }
        if (method === "POST" && path === "/api/admin/resolve") {
          send(
            resolveUnmatched(
              db,
              body.eventId,
              body.clickId,
              body.reason,
              user.id,
            ),
          );
          return;
        }
        if (method === "POST" && path === "/api/admin/reconcile") {
          const order = db
            .prepare("SELECT * FROM orders WHERE id=?")
            .get(body.orderId);
          ensure(order, "Không tìm thấy đơn.", 404);
          const eventId = textInput(body.eventId, "Mã sự kiện", 100, 8);
          ensure(
            ["approved", "rejected"].includes(body.status),
            "Chỉ duyệt hoặc từ chối.",
          );
          send(
            ingestReport(
              db,
              {
                eventId,
                externalId: order.external_id,
                itemId: order.item_id,
                clickId: order.click_id,
                title: order.title,
                orderValue: order.order_value,
                commission: integer(body.commission, "Hoa hồng"),
                status: body.status,
                reason: body.reason,
              },
              user.id,
            ),
          );
          return;
        }
        if (method === "POST" && path === "/api/admin/withdrawals") {
          send(
            processWithdrawal(
              db,
              body.id,
              body.action,
              body.reason,
              body.reference,
              user.id,
            ),
          );
          return;
        }
        if (method === "POST" && path === "/api/admin/policies") {
          send(addPolicy(db, body, user.id));
          return;
        }
        if (method === "POST" && path === "/api/admin/adjustments") {
          send(
            adjustBalance(
              db,
              body.userId,
              body.amount,
              body.reason,
              body.reference,
              user.id,
            ),
          );
          return;
        }
        if (method === "PATCH" && path === "/api/admin/users") {
          ensure(
            body.id !== user.id,
            "Không thể tự khóa tài khoản quản trị hiện tại.",
          );
          ensure(
            ["active", "blocked"].includes(body.status),
            "Trạng thái không hợp lệ.",
          );
          ensure(
            db
              .prepare("SELECT 1 FROM users WHERE id=? AND role='user'")
              .get(body.id),
            "Chỉ thay đổi tài khoản người dùng.",
            404,
          );
          transaction(db, () => {
            db.prepare("UPDATE users SET status=? WHERE id=?").run(
              body.status,
              body.id,
            );
            if (body.status === "blocked")
              db.prepare("DELETE FROM sessions WHERE user_id=?").run(body.id);
            audit(db, user.id, "user.status", body.id, { status: body.status });
          });
          send({ ok: true });
          return;
        }
        if (method === "POST" && path === "/api/admin/tickets") {
          const t = db.prepare("SELECT * FROM tickets WHERE id=?").get(body.id);
          ensure(t, "Không tìm thấy yêu cầu.", 404);
          const response = textInput(body.response, "Phản hồi", 2000, 5);
          transaction(db, () => {
            db.prepare(
              "UPDATE tickets SET status='closed',response=?,updated_at=? WHERE id=?",
            ).run(response, now(), body.id);
            audit(db, user.id, "ticket.respond", body.id, {});
          });
          send({ ok: true });
          return;
        }
        if (method === "PUT" && path === "/api/admin/content") {
          const banner = textInput(body.banner, "Banner", 160, 5),
            guide = textInput(body.guide, "Hướng dẫn", 1500, 10);
          transaction(db, () => {
            for (const [k, v] of [
              ["banner", banner],
              ["guide", guide],
            ])
              db.prepare(
                "INSERT INTO content VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
              ).run(k, v);
            audit(db, user.id, "content.update", "homepage", {});
          });
          send({ ok: true });
          return;
        }
        if (method === "POST" && path === "/api/admin/deals") {
          const dealId = body.id || id();
          const values = [
            textInput(body.title, "Tiêu đề", 150, 3),
            textInput(body.category, "Danh mục", 50),
            textInput(body.description, "Mô tả", 500),
            body.code ? textInput(body.code, "Mã", 50) : "",
            isoDate(body.expiresAt, "Hết hạn"),
            shopeeUrl(body.url),
            textInput(body.conditions, "Điều kiện", 500),
            ["mint", "peach", "lavender", "blue"].includes(body.accent)
              ? body.accent
              : "mint",
            body.active === false ? 0 : 1,
          ];
          transaction(db, () => {
            db.prepare(
              "INSERT INTO deals VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,category=excluded.category,description=excluded.description,code=excluded.code,expires_at=excluded.expires_at,url=excluded.url,conditions=excluded.conditions,accent=excluded.accent,active=excluded.active",
            ).run(dealId, ...values);
            audit(db, user.id, "deal.save", dealId, {});
          });
          send({ id: dealId });
          return;
        }
      }
      throw new AppError("Không tìm thấy chức năng.", 404);
    } catch (error) {
      if (error.status) send({ error: error.message }, error.status);
      else if (String(error.code).startsWith("ERR_SQLITE"))
        send(
          {
            error:
              "Dữ liệu xung đột hoặc mã tham chiếu đã tồn tại. Vui lòng tải lại và kiểm tra.",
          },
          409,
        );
      else {
        console.error("Unhandled request error:", error.name, error.message);
        send({ error: "Có lỗi xử lý. Vui lòng thử lại." }, 500);
      }
    }
  });
}
