import { now, transaction } from "./db.js";
import { ensure, hash, textInput, rateLimit } from "./security.js";
import { id } from "./finance.js";

export const vietnamDay = (at = Date.now()) =>
  new Date(at + 7 * 3600000).toISOString().slice(0, 10);
export function memberProfile(db, userId) {
  db.prepare(
    "INSERT OR IGNORE INTO member_profiles(user_id,referral_code) VALUES (?,?)",
  ).run(userId, hash(userId).slice(0, 12).toUpperCase());
  return db
    .prepare("SELECT * FROM member_profiles WHERE user_id=?")
    .get(userId);
}
export function communityRoutes({
  db,
  path,
  method,
  body,
  url,
  user,
  needUser,
  needAdmin,
  send,
}) {
  if (path === "/api/feed" && method === "GET") {
    send(
      db
        .prepare(
          `SELECT p.*, (SELECT COUNT(*) FROM post_likes WHERE post_id=p.id) likes,
      EXISTS(SELECT 1 FROM post_likes WHERE post_id=p.id AND user_id=?) liked
      FROM posts p WHERE active=1 ORDER BY pinned DESC,created_at DESC,id LIMIT 100`,
        )
        .all(user?.id || ""),
    );
    return true;
  }
  if (path === "/api/feed/like" && method === "POST") {
    needUser();
    ensure(
      typeof body.liked === "boolean",
      "Trạng thái yêu thích không hợp lệ.",
    );
    const postId = textInput(body.postId, "Bài viết", 80);
    ensure(
      db.prepare("SELECT 1 FROM posts WHERE id=? AND active=1").get(postId),
      "Bài viết không tồn tại.",
      404,
    );
    if (body.liked)
      db.prepare("INSERT OR IGNORE INTO post_likes VALUES (?,?)").run(
        postId,
        user.id,
      );
    else
      db.prepare("DELETE FROM post_likes WHERE post_id=? AND user_id=?").run(
        postId,
        user.id,
      );
    send({ ok: true });
    return true;
  }
  if (path === "/api/admin/posts" && method === "POST") {
    needAdmin();
    const title = textInput(body.title, "Tiêu đề", 120, 5);
    const content = textInput(body.content, "Nội dung", 6000, 10);
    const category = textInput(body.category, "Chuyên mục", 50);
    db.prepare("INSERT INTO posts VALUES (?,?,?,?,?,1,?)").run(
      id(),
      title,
      content,
      category,
      body.pinned === true ? 1 : 0,
      now(),
    );
    send({ ok: true });
    return true;
  }
  if (path === "/api/admin/posts" && method === "DELETE") {
    needAdmin();
    const result = db
      .prepare("UPDATE posts SET active=0 WHERE id=?")
      .run(textInput(body.id, "Bài viết", 80));
    ensure(result.changes, "Bài viết không tồn tại.", 404);
    send({ ok: true });
    return true;
  }
  if (path === "/api/leaderboard" && method === "GET") {
    const period = url.searchParams.get("period") || "month";
    ensure(
      ["week", "month", "year", "all"].includes(period),
      "Khoảng thời gian không hợp lệ.",
    );
    const today = vietnamDay();
    const start = new Date(today + "T00:00:00+07:00");
    if (period === "week") {
      const weekday = new Date(today + "T12:00:00Z").getUTCDay();
      start.setUTCDate(start.getUTCDate() - ((weekday + 6) % 7));
    }
    const since =
      period === "all"
        ? "1970-01-01T00:00:00.000Z"
        : period === "week"
          ? start.toISOString()
          : new Date(
              (period === "year"
                ? today.slice(0, 4) + "-01-01"
                : today.slice(0, 7) + "-01") + "T00:00:00+07:00",
            ).toISOString();
    const rows = db
      .prepare(
        `SELECT m.alias, SUM(o.cashback) cashback, COUNT(*) orders,
      CASE WHEN m.user_id=? THEN 1 ELSE 0 END isMe
      FROM orders o JOIN member_profiles m ON m.user_id=o.user_id JOIN users u ON u.id=o.user_id
      WHERE m.ranking_visible=1 AND u.status='active' AND u.role='user' AND o.status='approved' AND o.updated_at>=?
      GROUP BY m.user_id ORDER BY cashback DESC,m.user_id LIMIT 20`,
      )
      .all(user?.id || "", since);
    send({ rows, period, since });
    return true;
  }
  if (!path.startsWith("/api/member")) return false;
  needUser();
  const profile = memberProfile(db, user.id);
  if (path === "/api/member" && method === "GET") {
    const rewards = db
      .prepare(
        "SELECT id,points,label,created_at FROM reward_events WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
      )
      .all(user.id);
    const points = db
      .prepare(
        "SELECT COALESCE(SUM(points),0) total FROM reward_events WHERE user_id=?",
      )
      .get(user.id).total;
    const days = db
      .prepare(
        "SELECT source FROM reward_events WHERE user_id=? AND source LIKE 'checkin:%' ORDER BY source DESC",
      )
      .all(user.id)
      .map((r) => r.source.slice(8));
    let streak = 0;
    let cursor = new Date(vietnamDay() + "T12:00:00Z");
    if (!days.includes(vietnamDay()))
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (days.includes(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    send({
      ...profile,
      points,
      rewards,
      streak,
      checkedIn: days.includes(vietnamDay()),
      referred: !!db
        .prepare("SELECT 1 FROM referrals WHERE invitee_id=?")
        .get(user.id),
      invitations: db
        .prepare("SELECT COUNT(*) total FROM referrals WHERE inviter_id=?")
        .get(user.id).total,
    });
    return true;
  }
  if (path === "/api/member/preferences" && method === "PATCH") {
    ensure(
      typeof body.visible === "boolean",
      "Lựa chọn hiển thị không hợp lệ.",
    );
    db.prepare(
      "UPDATE member_profiles SET ranking_visible=?,alias=? WHERE user_id=?",
    ).run(
      body.visible ? 1 : 0,
      textInput(body.alias, "Biệt danh", 40, 2),
      user.id,
    );
    send({ ok: true });
    return true;
  }
  if (path === "/api/member/checkin" && method === "POST") {
    const result = db
      .prepare("INSERT OR IGNORE INTO reward_events VALUES (?,?,?,?,?,?)")
      .run(
        id(),
        user.id,
        "checkin:" + vietnamDay(),
        10,
        "Điểm danh hằng ngày",
        now(),
      );
    send({ awarded: result.changes ? 10 : 0 });
    return true;
  }
  if (path === "/api/member/gift" && method === "POST") {
    rateLimit(db, "gift:" + user.id, 20, 3600);
    const code = textInput(body.code, "Mã quà tặng", 40).toUpperCase();
    transaction(db, () => {
      const gift = db
        .prepare(
          "SELECT * FROM gift_codes WHERE code=? AND active=1 AND expires_at>?",
        )
        .get(code, now());
      ensure(gift, "Mã không tồn tại hoặc đã hết hạn.");
      ensure(
        !db
          .prepare("SELECT 1 FROM reward_events WHERE user_id=? AND source=?")
          .get(user.id, "gift:" + code),
        "Bạn đã nhận mã này.",
      );
      db.prepare("INSERT INTO reward_events VALUES (?,?,?,?,?,?)").run(
        id(),
        user.id,
        "gift:" + code,
        gift.points,
        "Mã quà tặng " + code,
        now(),
      );
    });
    send({ ok: true });
    return true;
  }
  if (path === "/api/member/referral" && method === "POST") {
    rateLimit(db, "referral:" + user.id, 10, 3600);
    const code = textInput(body.code, "Mã giới thiệu", 20).toUpperCase();
    transaction(db, () => {
      const inviter = db
        .prepare(
          "SELECT m.user_id FROM member_profiles m JOIN users u ON u.id=m.user_id WHERE referral_code=? AND u.status='active'",
        )
        .get(code);
      ensure(
        inviter && inviter.user_id !== user.id,
        "Mã giới thiệu không hợp lệ hoặc là mã của chính bạn.",
      );
      ensure(
        !db.prepare("SELECT 1 FROM referrals WHERE invitee_id=?").get(user.id),
        "Tài khoản đã ghi nhận người giới thiệu.",
      );
      db.prepare("INSERT INTO referrals VALUES (?,?,?)").run(
        user.id,
        inviter.user_id,
        now(),
      );
    });
    send({ ok: true });
    return true;
  }
  return false;
}
