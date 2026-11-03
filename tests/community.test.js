import test from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../server/db.js";
import { createApp } from "../server/app.js";
import { seed } from "../server/seed.js";
import { vietnamDay } from "../server/community.js";

test("Vietnam day changes at 17:00 UTC", () => {
  assert.equal(vietnamDay(Date.parse("2026-11-03T16:59:59Z")), "2026-11-03");
  assert.equal(vietnamDay(Date.parse("2026-11-03T17:00:00Z")), "2026-11-04");
});

test("Community: persistent rewards, privacy, referral uniqueness and moderation", async () => {
  const db = openDb(":memory:");
  seed(db);
  const server = createApp(db);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const request = async (path, method = "GET", body, auth = {}) => {
    const res = await fetch(base + "/api" + path, {
      method,
      headers: { "Content-Type": "application/json", ...auth },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: res.status,
      data: await res.json(),
      cookie: res.headers.get("set-cookie")?.split(";")[0],
    };
  };
  const login = async (email) => {
    const r = await request("/auth/login", "POST", {
      email,
      password: "Demo@123456",
    });
    assert.equal(r.status, 200);
    return { cookie: r.cookie, "x-csrf-token": r.data.csrf };
  };
  try {
    const a = await login("ban@demo.local"),
      b = await login("khac@demo.local"),
      admin = await login("admin@demo.local");
    assert.equal((await request("/member")).status, 401);
    assert.equal(
      (await request("/member/checkin", "POST", {}, { cookie: a.cookie }))
        .status,
      403,
    );
    const before = (await request("/wallet", "GET", undefined, a)).data
      .balances;
    const attempts = await Promise.all(
      Array.from({ length: 5 }, () =>
        request("/member/checkin", "POST", {}, a),
      ),
    );
    assert.equal(
      attempts.reduce((sum, r) => sum + r.data.awarded, 0),
      10,
    );
    let member = (await request("/member", "GET", undefined, a)).data;
    assert.equal(member.checkedIn, true);
    assert.equal(member.points, 10);
    assert.equal(member.streak, 1);
    assert.equal(
      (await request("/member/gift", "POST", { code: "bad" }, a)).status,
      400,
    );
    assert.equal(
      (await request("/member/gift", "POST", { code: "LACHAMBAO" }, a)).status,
      200,
    );
    assert.equal(
      (await request("/member/gift", "POST", { code: "LACHAMBAO" }, a)).status,
      400,
    );
    assert.equal(
      (await request("/member/gift", "POST", { code: "LACHAMBAO" }, b)).status,
      200,
    );
    member = (await request("/member", "GET", undefined, a)).data;
    assert.equal(member.points, 110);
    assert.equal(member.rewards.length, 2);
    assert.deepEqual(
      (await request("/wallet", "GET", undefined, a)).data.balances,
      before,
    );
    const code = member.referral_code;
    assert.equal(
      (await request("/member/referral", "POST", { code }, a)).status,
      400,
    );
    assert.equal(
      (await request("/member/referral", "POST", { code }, b)).status,
      200,
    );
    assert.equal(
      (await request("/member/referral", "POST", { code }, b)).status,
      400,
    );
    assert.equal(
      (await request("/member", "GET", undefined, a)).data.invitations,
      1,
    );
    assert.equal(
      (await request("/member", "GET", undefined, b)).data.referred,
      true,
    );
    assert.deepEqual((await request("/leaderboard")).data.rows, []);
    assert.equal(
      (
        await request(
          "/member/preferences",
          "PATCH",
          { alias: "Mầm thử nghiệm", visible: true },
          a,
        )
      ).status,
      200,
    );
    let ranks = (await request("/leaderboard?period=all")).data.rows;
    assert.equal(ranks.length, 1);
    assert.equal(ranks[0].alias, "Mầm thử nghiệm");
    assert.equal("email" in ranks[0], false);
    assert.equal("user_id" in ranks[0], false);
    assert.equal((await request("/leaderboard?period=bad")).status, 400);
    const uid = db
      .prepare("SELECT id FROM users WHERE email=?")
      .get("ban@demo.local").id;
    const expected = db
      .prepare(
        "SELECT SUM(cashback) total FROM orders WHERE user_id=? AND status='approved'",
      )
      .get(uid).total;
    assert.equal(ranks[0].cashback, expected);
    await request(
      "/member/preferences",
      "PATCH",
      { alias: "Mầm thử nghiệm", visible: false },
      a,
    );
    assert.deepEqual((await request("/leaderboard")).data.rows, []);
    const posts = (await request("/feed")).data;
    const first = posts[0];
    await request("/feed/like", "POST", { postId: first.id, liked: true }, a);
    await request("/feed/like", "POST", { postId: first.id, liked: true }, a);
    assert.equal(
      (await request("/feed", "GET", undefined, a)).data.find(
        (p) => p.id === first.id,
      ).likes,
      1,
    );
    await request("/feed/like", "POST", { postId: first.id, liked: false }, a);
    assert.equal(
      (await request("/feed")).data.find((p) => p.id === first.id).likes,
      0,
    );
    const post = {
      title: "Bài kiểm tra quản trị",
      content: "Nội dung thử nghiệm chức năng đăng bài.",
      category: "Hướng dẫn",
      pinned: true,
    };
    assert.equal((await request("/admin/posts", "POST", post, a)).status, 403);
    assert.equal(
      (await request("/admin/posts", "POST", post, admin)).status,
      200,
    );
    const created = (await request("/feed")).data.find(
      (p) => p.title === post.title,
    );
    assert.ok(created);
    assert.equal(
      (await request("/admin/posts", "DELETE", { id: created.id }, admin))
        .status,
      200,
    );
    assert.equal(
      (await request("/feed")).data.some((p) => p.id === created.id),
      false,
    );
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
  }
});
