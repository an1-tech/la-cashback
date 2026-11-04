import React, { useState } from "react";
import { useApp } from "../context";
import { money, date } from "../api";
import {
  Icon,
  DataState,
  useData,
  Form,
  Field,
  Empty,
  LogoutButton,
} from "../components";

export async function copyText(text, setToast) {
  try {
    await navigator.clipboard.writeText(text);
    setToast("Đã sao chép.");
  } catch {
    setToast(
      "Không thể sao chép tự động. Hãy chọn nội dung và dùng Ctrl+C hoặc nhấn giữ.",
    );
  }
}
export const memberTier = (points) =>
  points >= 500 ? "Tán xanh" : points >= 100 ? "Lá non" : "Mầm xanh";

export function QuickActions() {
  const { navigate, boot, setModal } = useApp();
  return (
    <nav className="quick-actions" aria-label="Tiện ích của Lá">
      {[
        ["links", "Tạo link", "link"],
        ["feed", "Bảng tin", "feed"],
        ["checkin", "Điểm danh", "calendar"],
        ["referrals", "Giới thiệu", "users"],
        ["ranking", "Xếp hạng", "trophy"],
      ].map(([key, label, icon]) => (
        <button
          key={key}
          onClick={() =>
            !boot.user && !["feed", "ranking", "links"].includes(key)
              ? setModal("auth")
              : navigate(key)
          }
        >
          <Icon name={icon} />
          <span>{label}</span>
          <Icon name="arrow" size={14} />
        </button>
      ))}
    </nav>
  );
}

export function HomeCommunity() {
  const { navigate } = useApp();
  return (
    <div className="home-community">
      <section className="panel daily-panel">
        <h2>Ghé Lá mỗi ngày</h2>
        <p>Thêm một mầm xanh vào hành trình mua sắm của bạn.</p>
        <button className="button" onClick={() => navigate("checkin")}>
          Điểm danh hôm nay <Icon name="arrow" size={16} />
        </button>
        <small>Điểm trải nghiệm · Không quy đổi tiền</small>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Từ vườn Lá</h2>
          <button className="text-button" onClick={() => navigate("feed")}>
            Mở bảng tin <Icon name="arrow" size={15} />
          </button>
        </div>
        <p>Cách theo dõi đơn hàng, đọc số dư và nhận hoàn tiền minh bạch.</p>
        <div className="guide-links">
          <button onClick={() => navigate("help")}>
            Tôi chưa thấy đơn hàng <Icon name="chevron" size={14} />
          </button>
          <button onClick={() => navigate("ranking")}>
            Khám phá bảng xếp hạng <Icon name="chevron" size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}

export function Feed() {
  const { version, boot, mutate, setModal, setToast } = useApp();
  const state = useData("/feed", version);
  const [category, setCategory] = useState("Tất cả");
  const [query, setQuery] = useState("");
  return (
    <div className="feed-layout">
      <div>
        <div className="community-toolbar">
          <label className="search-field">
            <Icon name="search" size={18} />
            <input
              aria-label="Tìm bài viết"
              placeholder="Tìm trong bảng tin…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Chuyên mục</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {["Tất cả", "Hướng dẫn", "Ví & đơn hàng", "Cộng đồng"].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </label>
        </div>
        <DataState state={state}>
          {(rows) => {
            const filtered = rows.filter(
              (p) =>
                (category === "Tất cả" || p.category === category) &&
                `${p.title} ${p.body}`
                  .toLocaleLowerCase("vi")
                  .includes(query.toLocaleLowerCase("vi")),
            );
            return (
              <div className="feed-grid">
                {filtered.length ? (
                  filtered.map((p) => (
                    <Post
                      key={p.id}
                      post={p}
                      boot={boot}
                      mutate={mutate}
                      setModal={setModal}
                      setToast={setToast}
                    />
                  ))
                ) : (
                  <Empty title="Không có bài viết phù hợp" />
                )}
              </div>
            );
          }}
        </DataState>
      </div>
      <aside className="community-aside panel">
        <Icon name="leaf" size={38} />
        <h2>Chuyện mua sắm, kể thật rõ</h2>
        <p>
          Bản tin chính thức của Lá. Hướng dẫn ngắn, thông tin rõ và những cập
          nhật bạn cần.
        </p>
        <p className="muted">
          Nội dung dành cho bản trải nghiệm. Không phải thông báo từ Shopee.
        </p>
        {boot.user?.role === "admin" && (
          <details>
            <summary>Đăng bài viết</summary>
            <Form
              submitLabel="Đăng lên bảng tin"
              onSubmit={async (v, form) => {
                await mutate("/admin/posts", {
                  ...v,
                  pinned: v.pinned === "on",
                });
                form.reset();
              }}
            >
              <Field
                label="Tiêu đề"
                name="title"
                required
                minLength={5}
                maxLength={120}
              />
              <Field label="Nội dung">
                <textarea
                  name="content"
                  required
                  minLength={10}
                  maxLength={6000}
                  rows={6}
                />
              </Field>
              <Field label="Chuyên mục">
                <select name="category">
                  {["Hướng dẫn", "Ví & đơn hàng", "Cộng đồng"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <label className="check-label">
                <input type="checkbox" name="pinned" />
                Ghim bài viết
              </label>
            </Form>
          </details>
        )}
      </aside>
    </div>
  );
}
function Post({ post: p, boot, mutate, setModal, setToast }) {
  const [expanded, setExpanded] = useState(false),
    [busy, setBusy] = useState(false);
  const highlighted =
    new URLSearchParams(location.hash.split("?")[1]).get("post") === p.id;
  return (
    <article
      className={"panel feed-post " + (highlighted ? "highlighted" : "")}
      id={"post-" + p.id}
    >
      <div className="post-meta">
        <span>
          <Icon name="leaf" size={17} /> Lá Cashback
        </span>
        <small>{p.pinned ? "Đã ghim" : p.category}</small>
      </div>
      <small className="muted">{date(p.created_at)}</small>
      <h2>{p.title}</h2>
      <p className="post-body">
        {expanded || p.body.length <= 260 ? p.body : p.body.slice(0, 260) + "…"}
      </p>
      {p.body.length > 260 && (
        <button
          className="text-button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Thu gọn" : "Đọc tiếp"}
        </button>
      )}
      <div className="post-actions">
        <button
          className="text-button"
          aria-pressed={!!p.liked}
          disabled={busy}
          onClick={async () => {
            if (!boot.user) {
              setModal("auth");
              return;
            }
            setBusy(true);
            try {
              await mutate("/feed/like", { postId: p.id, liked: !p.liked });
            } catch (e) {
              setToast(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Icon name="heart" size={18} />
          {p.likes} lượt thích
        </button>
        <button
          className="text-button"
          onClick={() =>
            copyText(location.origin + "/app#feed?post=" + p.id, setToast)
          }
        >
          <Icon name="external" size={16} />
          Chia sẻ
        </button>
      </div>
      {boot.user?.role === "admin" && (
        <details>
          <summary>Quản lý bài viết</summary>
          <button
            className="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await mutate("/admin/posts", { id: p.id }, "DELETE");
              } catch (e) {
                setToast(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Ẩn khỏi bảng tin
          </button>
        </details>
      )}
    </article>
  );
}

export function Leaderboard() {
  const { version, navigate } = useApp();
  const [period, setPeriod] = useState("month");
  const state = useData("/leaderboard?period=" + period, version);
  return (
    <div className="member-layout">
      <section className="panel">
        <div className="section-heading">
          <h2>Những khoản hoàn được xác nhận</h2>
          <Icon name="trophy" />
        </div>
        <div className="tabs period-tabs">
          {[
            ["week", "Tuần này"],
            ["month", "Tháng này"],
            ["year", "Năm nay"],
            ["all", "Tất cả"],
          ].map(([v, t]) => (
            <button
              key={v}
              className={period === v ? "active" : ""}
              aria-pressed={period === v}
              onClick={() => setPeriod(v)}
            >
              {t}
            </button>
          ))}
        </div>
        <DataState state={state}>
          {({ rows }) =>
            rows.length ? (
              <ol className="ranking-list">
                {rows.map((r, i) => (
                  <li key={i}>
                    <span className="rank-position">{i + 1}</span>
                    <span>
                      <strong>
                        {r.alias}
                        {r.isMe ? " · Bạn" : ""}
                      </strong>
                      <small>{r.orders} đơn đã duyệt</small>
                    </span>
                    <b>{money(r.cashback)}</b>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty title="Chưa có thành viên trong kỳ này">
                Thành viên tự chọn tham gia. Chỉ tính đơn đã duyệt trong kỳ.
              </Empty>
            )
          }
        </DataState>
      </section>
      <aside className="panel">
        <h2>Chủ động quyền riêng tư</h2>
        <p>
          Xếp hạng theo tiền hoàn của đơn hiện đã duyệt, dựa trên thời điểm cập
          nhật đối soát. Đơn bị hủy sẽ không còn được tính.
        </p>
        <p className="muted">
          Dữ liệu mô phỏng. Chỉ hiện biệt danh khi bạn bật tham gia; không công
          khai email hay tài khoản ngân hàng.
        </p>
        <button className="button" onClick={() => navigate("membership")}>
          Quản lý hiển thị <Icon name="arrow" size={16} />
        </button>
      </aside>
    </div>
  );
}

export function MemberPage({ section }) {
  const { version, mutate, setToast, navigate } = useApp();
  const state = useData("/member", version);
  return (
    <DataState state={state}>
      {(m) => (
        <div className="member-layout">
          <section className="panel member-main">
            {section === "checkin" && (
              <>
                <Icon name="leaf" size={52} />
                <h2>Một ngày, một mầm xanh</h2>
                <p>
                  Điểm danh nhận 10 điểm trải nghiệm mỗi ngày, theo giờ Việt Nam
                  (UTC+7).
                </p>
                <div className="member-numbers">
                  <div>
                    <strong>{m.streak}</strong>
                    <span>ngày liên tiếp</span>
                  </div>
                  <div>
                    <strong>{m.points}</strong>
                    <span>điểm đã tích lũy</span>
                  </div>
                </div>
                <CheckinButton checked={m.checkedIn} />
                <p className="muted">
                  Mỗi ngày chỉ được ghi nhận một lần. Bỏ lỡ một ngày sẽ bắt đầu
                  lại chuỗi.
                </p>
              </>
            )}
            {section === "referrals" && (
              <>
                <h2>Cùng bạn bè ghé Lá</h2>
                <p>
                  Chia sẻ đường dẫn hoặc mã của bạn. Mỗi tài khoản chỉ ghi nhận
                  một người giới thiệu.
                </p>
                <Field
                  label="Mã giới thiệu của bạn"
                  value={m.referral_code}
                  readOnly
                />
                <Field
                  label="Đường dẫn mời bạn bè"
                  value={
                    location.origin +
                    "/app?ref=" +
                    m.referral_code +
                    "#referrals"
                  }
                  readOnly
                />
                <button
                  className="button"
                  onClick={() =>
                    copyText(
                      location.origin +
                        "/app?ref=" +
                        m.referral_code +
                        "#referrals",
                      setToast,
                    )
                  }
                >
                  <Icon name="copy" size={16} />
                  Sao chép lời mời
                </button>
                <p>
                  <b>{m.invitations}</b> tài khoản đã nhập mã của bạn.
                </p>
                {m.referred ? (
                  <div className="alert success">
                    Đã ghi nhận người giới thiệu cho tài khoản này.
                  </div>
                ) : (
                  <Form
                    submitLabel="Ghi nhận người giới thiệu"
                    onSubmit={(v) => mutate("/member/referral", v)}
                  >
                    <Field
                      label="Bạn có mã của người giới thiệu?"
                      name="code"
                      defaultValue={
                        new URLSearchParams(location.search).get("ref") || ""
                      }
                      required
                      maxLength={20}
                    />
                  </Form>
                )}
                <p className="muted">
                  Bản demo ghi nhận lượt giới thiệu, chưa có chính sách trả
                  thưởng bằng tiền.
                </p>
              </>
            )}
            {section === "membership" && (
              <>
                <h2>Hạng {memberTier(m.points)}</h2>
                <p>Hành trình của bạn được ghi lại bằng điểm trải nghiệm.</p>
                <div className="member-numbers">
                  <div>
                    <strong>{m.points}</strong>
                    <span>điểm tích lũy</span>
                  </div>
                </div>
                <progress
                  aria-label="Tiến độ hạng thành viên"
                  max={m.points >= 500 ? m.points : m.points >= 100 ? 500 : 100}
                  value={m.points}
                />
                <ul className="tier-list">
                  <li>Mầm xanh · từ 0 điểm</li>
                  <li>Lá non · từ 100 điểm</li>
                  <li>Tán xanh · từ 500 điểm</li>
                </ul>
                <Form
                  key={m.ranking_visible + "-" + m.alias}
                  submitLabel="Lưu hiển thị xếp hạng"
                  onSubmit={(v) =>
                    mutate(
                      "/member/preferences",
                      { alias: v.alias, visible: v.visible === "on" },
                      "PATCH",
                    )
                  }
                >
                  <Field
                    label="Biệt danh trên bảng xếp hạng"
                    name="alias"
                    defaultValue={m.alias}
                    required
                    minLength={2}
                    maxLength={40}
                  />
                  <label className="check-label">
                    <input
                      name="visible"
                      type="checkbox"
                      defaultChecked={!!m.ranking_visible}
                    />
                    Cho phép hiển thị biệt danh và tổng hoàn đã duyệt
                  </label>
                </Form>
              </>
            )}
            {section === "gifts" && (
              <>
                <h2>Mở một món quà nhỏ</h2>
                <p>
                  Nhập mã được Lá cung cấp để nhận điểm. Mỗi mã chỉ nhận một lần
                  cho mỗi tài khoản.
                </p>
                <Form
                  submitLabel="Nhận quà"
                  onSubmit={(v) => mutate("/member/gift", v)}
                >
                  <Field
                    label="Mã quà tặng"
                    name="code"
                    placeholder="Nhập mã của bạn"
                    required
                    maxLength={40}
                  />
                </Form>
                <p className="muted">
                  Thử mã <b>LACHAMBAO</b> để nhận 100 điểm trải nghiệm.
                </p>
              </>
            )}
            {section === "rewards" && (
              <>
                <h2>Lịch sử điểm của bạn</h2>
                <p>
                  <b>{m.points}</b> điểm tích lũy · Hạng {memberTier(m.points)}
                </p>
                {m.rewards.length ? (
                  <ul className="reward-list">
                    {m.rewards.map((r) => (
                      <li key={r.id}>
                        <span>
                          <strong>{r.label}</strong>
                          <small>{date(r.created_at)}</small>
                        </span>
                        <b>+{r.points} điểm</b>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty title="Mầm xanh đầu tiên đang chờ bạn">
                    Điểm danh hoặc nhập mã quà tặng để bắt đầu.
                  </Empty>
                )}
              </>
            )}
          </section>
          <aside className="panel community-aside">
            <h2>Thành viên Lá</h2>
            <p className="muted">
              Điểm và hạng là tính năng trải nghiệm, không phải tiền hoàn, không
              quy đổi hoặc rút về ngân hàng.
            </p>
            <div className="account-links">
              {[
                ["checkin", "Điểm danh", "calendar"],
                ["membership", "Hạng thành viên", "leaf"],
                ["referrals", "Giới thiệu bạn bè", "users"],
                ["gifts", "Mã quà tặng", "gift"],
                ["rewards", "Phần thưởng của tôi", "bookmark"],
                ["ranking", "Bảng xếp hạng", "trophy"],
              ]
                .filter(([k]) => k !== section)
                .map(([k, t, icon]) => (
                  <button key={k} onClick={() => navigate(k)}>
                    <Icon name={icon} size={18} />
                    <span>{t}</span>
                    <Icon name="chevron" size={15} />
                  </button>
                ))}
            </div>
          </aside>
        </div>
      )}
    </DataState>
  );
}
function CheckinButton({ checked }) {
  const { mutate, setToast } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="button primary"
      disabled={busy || checked}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await mutate("/member/checkin", {});
          setToast(
            r.awarded
              ? "Đã nhận 10 điểm trải nghiệm."
              : "Bạn đã điểm danh hôm nay.",
          );
        } catch (e) {
          setToast(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Icon name={checked ? "check" : "calendar"} size={18} />
      {checked
        ? "Đã điểm danh hôm nay"
        : busy
          ? "Đang ghi nhận…"
          : "Điểm danh +10 điểm"}
    </button>
  );
}

export function AccountOverview() {
  const { boot, navigate, setModal, version } = useApp();
  const state = useData("/member", version);
  const groups = [
    [
      "Tiền & đơn hàng",
      [
        ["orders", "Lịch sử đơn hàng", "bag"],
        ["wallet", "Rút tiền & giao dịch", "wallet"],
        ["settings", "Phương thức nhận tiền", "shield"],
      ],
    ],
    [
      "Thành viên & phần thưởng",
      [
        ["membership", "Hạng thành viên", "leaf"],
        ["referrals", "Giới thiệu bạn bè", "users"],
        ["ranking", "Bảng xếp hạng", "trophy"],
        ["gifts", "Mã quà tặng", "gift"],
        ["rewards", "Phần thưởng của tôi", "bookmark"],
      ],
    ],
    [
      "Thông tin & hỗ trợ",
      [
        ["settings", "Thông tin cá nhân", "user"],
        ["help", "Hỏi đáp & hỗ trợ", "help"],
        ["feed", "Bảng tin Lá", "feed"],
        ["links", "Link đã tạo", "link"],
      ],
    ],
  ];
  return (
    <>
      <div className="account-hero">
        <div className="account-identity">
          <span className="large-avatar">{boot.user.name.slice(0, 1)}</span>
          <div>
            <h2>{boot.user.name}</h2>
            <p>{boot.user.email}</p>
            <DataState state={state}>
              {(m) => (
                <span className="member-caption">
                  {memberTier(m.points)} · {m.points} điểm trải nghiệm
                </span>
              )}
            </DataState>
          </div>
        </div>
        <div className="account-actions">
          <button className="button" onClick={() => navigate("settings")}>
            Chỉnh sửa hồ sơ <Icon name="arrow" size={16} />
          </button>
          <LogoutButton />
        </div>
      </div>
      <section className="profile-money">
        <div>
          <span>Có thể rút</span>
          <strong>{money(boot.balances.available)}</strong>
        </div>
        <div>
          <span>Đang chờ duyệt</span>
          <strong>{money(boot.balances.pending)}</strong>
        </div>
        <div>
          <span>Đã thanh toán</span>
          <strong>{money(boot.balances.paid)}</strong>
        </div>
        <button className="button primary" onClick={() => navigate("wallet")}>
          Mở ví <Icon name="arrow" size={16} />
        </button>
      </section>
      <div className="account-grid">
        {groups.map(([title, items]) => (
          <section className="panel" key={title}>
            <h2>{title}</h2>
            <div className="account-links">
              {items.map(([k, t, icon]) => (
                <button key={k} onClick={() => navigate(k)}>
                  <Icon name={icon} size={18} />
                  <span>{t}</span>
                  <Icon name="chevron" size={15} />
                </button>
              ))}
            </div>
            {title === "Tiền & đơn hàng" && (
              <button
                className="text-button spaced"
                onClick={() => setModal("support")}
              >
                Báo thiếu đơn <Icon name="arrow" size={15} />
              </button>
            )}
            {title === "Thông tin & hỗ trợ" && boot.user.role === "admin" && (
              <button className="button" onClick={() => navigate("admin")}>
                Mở quản trị
              </button>
            )}
          </section>
        ))}
      </div>
    </>
  );
}

export function HelpPage() {
  const { setModal, navigate } = useApp();
  const [search, setSearch] = useState("");
  const faqs = [
    [
      "Vì sao chưa thấy đơn hàng?",
      "Tạo link không tự sinh đơn. Bản demo ghi nhận đơn sau khi bạn hoàn thành thao tác ở cửa hàng mô phỏng. Với kết nối thật, đơn phụ thuộc báo cáo từ đối tác. Hãy gửi mã đơn, thời gian mua và link đã dùng qua yêu cầu hỗ trợ.",
    ],
    [
      "Khi nào tiền được rút?",
      "Tiền phải được duyệt và qua thời gian chờ theo chính sách tại thời điểm tạo link. Ví hiển thị riêng số tiền có thể rút, đang giữ và đang chờ.",
    ],
    [
      "Điểm trải nghiệm có rút được không?",
      "Không. Điểm danh và mã quà tặng chỉ cộng điểm thành viên, không cộng vào ví hoàn tiền.",
    ],
    [
      "Lá đã kết nối Shopee thật chưa?",
      "Chưa. Đây là bản demo. Thông tin sản phẩm và tiền hoàn dự kiến chưa được xác định. Mua hàng và thanh toán đang được mô phỏng.",
    ],
    [
      "Tôi muốn gửi góp ý hoặc báo lỗi?",
      "Chọn Gửi yêu cầu hỗ trợ, mô tả thao tác và lỗi bạn gặp. Theo dõi phản hồi của quản trị viên trong Cài đặt tài khoản.",
    ],
    [
      "Dữ liệu cá nhân được hiển thị thế nào?",
      "Bảng xếp hạng chỉ hiển thị biệt danh và tổng tiền hoàn của thành viên chủ động tham gia. Không nhập thông tin ngân hàng thật trong bản demo.",
    ],
  ];
  return (
    <div className="member-layout">
      <section className="panel">
        <h2>Bạn cần Lá giúp gì?</h2>
        <Field
          label="Tìm câu hỏi"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Đơn hàng, rút tiền, điểm…"
        />
        <div className="faq-list">
          {faqs
            .filter((f) =>
              f
                .join(" ")
                .toLocaleLowerCase("vi")
                .includes(search.toLocaleLowerCase("vi")),
            )
            .map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
        </div>
      </section>
      <aside className="panel">
        <h2>Hỗ trợ từ Lá</h2>
        <p>Báo thiếu đơn, gửi góp ý hoặc yêu cầu giải thích một giao dịch.</p>
        <button className="button primary" onClick={() => setModal("support")}>
          Gửi yêu cầu hỗ trợ
        </button>
        <button
          className="text-button spaced"
          onClick={() => navigate("settings")}
        >
          Xem yêu cầu đã gửi <Icon name="arrow" size={16} />
        </button>
      </aside>
    </div>
  );
}

export function LinkHistory() {
  const { version, setToast } = useApp();
  const state = useData("/clicks", version);
  return (
    <details className="link-history">
      <summary>Link đã tạo gần đây</summary>
      <DataState state={state}>
        {(rows) =>
          rows.length ? (
            <ul>
              {rows.slice(0, 20).map((r) => (
                <li key={r.id}>
                  <div>
                    <a href={"/demo-shop?click=" + encodeURIComponent(r.id)}>
                      {r.product_name || "Link Shopee mô phỏng"}
                    </a>
                    <small>
                      {date(r.created_at)} · Chính sách v{r.version}
                    </small>
                    <span className="source-url">{r.url}</span>
                  </div>
                  <button
                    className="button compact"
                    aria-label={"Sao chép link " + r.id.slice(0, 8)}
                    onClick={() =>
                      copyText(
                        location.origin +
                          "/demo-shop?click=" +
                          encodeURIComponent(r.id),
                        setToast,
                      )
                    }
                  >
                    <Icon name="copy" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Chưa có link. Dán link sản phẩm để bắt đầu.</p>
          )
        }
      </DataState>
    </details>
  );
}
