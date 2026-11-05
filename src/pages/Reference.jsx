import React, { useState } from "react";
import { useApp } from "../context";
import { money, date } from "../api";
import {
  Icon,
  Form,
  Field,
  DataState,
  useData,
  LogoutButton,
} from "../components";
import { memberTier } from "./Community";

export function Brand({ className = "" }) {
  return (
    <a
      className={`la-brand ${className}`}
      href="/"
      aria-label="Lá Cashback, trang giới thiệu"
    >
      <span className="la-logo">
        <Icon name="leaf" size={27} />
      </span>
      <strong>
        Lá <span>Cashback</span>
      </strong>
    </a>
  );
}

export const primaryNavigation = [
  ["home", "Trang chủ", "home"],
  ["feed", "Bảng tin", "feed"],
  ["links", "Tạo link hoàn tiền", "link"],
  ["deals", "Deal hời", "bag"],
  ["profile", "Hồ sơ", "user"],
];
export const secondaryNavigation = [
  ["help", "Hỏi đáp & Hỗ trợ", "help"],
  ["settings", "Cài đặt", "grid"],
  ["blog", "Blog", "feed"],
  ["faq", "Hỏi đáp", "help"],
  ["contact", "Liên hệ", "external"],
  ["legal", "Pháp lý", "shield"],
  ["feedback", "Phản hồi và góp ý", "feed"],
];

export function Identity({ email = false }) {
  const { boot, navigate, setModal } = useApp();
  return (
    <div className="reference-identity">
      <span className="identity-avatar">
        {boot.user?.name.slice(0, 2) || <Icon name="leaf" size={30} />}
      </span>
      <div>
        <strong>{boot.user?.name || "Chào bạn, ghé Lá nhé"}</strong>
        {email ? (
          <p>{boot.user?.email}</p>
        ) : (
          <button
            className="tier-chip"
            onClick={() =>
              boot.user ? navigate("membership") : setModal("auth")
            }
          >
            Thành viên Lá
          </button>
        )}
      </div>
      {!email && (
        <button
          className="balance-chip"
          aria-label="Xem chi tiết"
          onClick={() => (boot.user ? navigate("wallet") : setModal("auth"))}
        >
          <Icon name="wallet" size={16} />
          {boot.balances ? money(boot.balances.available) : "Mở ví"}
        </button>
      )}
    </div>
  );
}

const banners = [
  {
    label: "MUA SẮM CÙNG LÁ",
    title: "3 bước nhận hoàn tiền cực đơn giản",
    steps: [
      ["link", "Sao chép link"],
      ["copy", "Tạo link tại Lá"],
      ["bag", "Mua hàng demo"],
    ],
  },
  {
    label: "LÁ LUÔN Ở ĐÂY",
    title: "Đã mua nhưng chưa thấy đơn?",
    description: "Gửi mã đơn và link đã dùng để Lá kiểm tra giúp bạn",
    action: "Tạo báo thiếu đơn",
    target: "support",
  },
  {
    label: "GÓP MỘT MẦM XANH",
    title: "Ghé Lá mỗi ngày, thêm niềm vui",
    description: "Điểm danh, tích điểm trải nghiệm và khám phá hạng thành viên",
    action: "Điểm danh hôm nay",
    target: "checkin",
  },
];
export function PromoCarousel() {
  const [index, setIndex] = useState(0);
  const { boot, navigate, setModal } = useApp();
  const banner = banners[index];
  return (
    <section
      className={`promo-carousel slide-${index}`}
      aria-roledescription="băng chuyền"
      aria-label="Hướng dẫn và tiện ích Lá"
    >
      <div className="promo-content">
        <small>{banner.label}</small>
        <h2>{banner.title}</h2>
        {banner.steps ? (
          <div className="promo-steps">
            {banner.steps.map(([icon, title], i) => (
              <div key={title}>
                <b>{i + 1}</b>
                <Icon name={icon} size={32} />
                <strong>{title}</strong>
              </div>
            ))}
          </div>
        ) : (
          <>
            <p>{banner.description}</p>
            <button
              className="button primary"
              onClick={() =>
                !boot.user
                  ? setModal("auth")
                  : banner.target === "support"
                    ? setModal("support")
                    : navigate(banner.target)
              }
            >
              {banner.action}
              <Icon name="arrow" size={16} />
            </button>
          </>
        )}
      </div>
      {!banner.steps && (
        <img
          className="promo-mascot"
          src="/images/la-mascot.webp"
          width="320"
          height="360"
          alt="Sóc Lá"
          loading="lazy"
        />
      )}
      <div className="carousel-controls">
        <button
          className="carousel-arrow"
          aria-label="Banner trước"
          onClick={() => setIndex((index + 2) % 3)}
        >
          ‹
        </button>
        <div>
          {banners.map((b, i) => (
            <button
              key={b.title}
              aria-label={`Xem banner ${i + 1}`}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <button
          className="carousel-arrow"
          aria-label="Banner sau"
          onClick={() => setIndex((index + 1) % 3)}
        >
          ›
        </button>
      </div>
    </section>
  );
}

export function ProfileHub() {
  const { boot, navigate, setModal, version } = useApp();
  const member = useData("/member", version);
  const balance = boot.balances;
  return (
    <div className="profile-hub">
      <div className="profile-top">
        <Identity email />
        <LogoutButton />
      </div>
      <section className="profile-balance">
        <small>TỔNG TIỀN TÍCH LŨY MÔ PHỎNG</small>
        <strong>
          {money(
            balance.available +
              balance.pending +
              balance.locked +
              balance.held +
              balance.paid,
          )}
        </strong>
        <dl>
          {[
            ["Số dư khả dụng", balance.available],
            ["Số tiền đã rút", balance.paid],
            [
              "Số tiền hoàn chờ xử lý",
              balance.pending + balance.locked + balance.held,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{money(value)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="panel profile-order-panel">
        <div className="section-heading">
          <h2>Lịch sử đơn hàng</h2>
          <button className="text-button" onClick={() => setModal("support")}>
            Báo thiếu đơn <Icon name="chevron" size={14} />
          </button>
        </div>
        <nav className="quick-actions" aria-label="Lịch sử đơn hàng">
          {[
            ["", "Tất cả"],
            ["pending", "Chờ hoàn tiền"],
            ["approved", "Đã duyệt"],
            ["rejected", "Đã hủy"],
          ].map(([status, title]) => (
            <button
              key={title}
              onClick={() => {
                sessionStorage.setItem("la-order-status", status);
                navigate("orders");
              }}
            >
              <Icon name="bag" />
              <span>{title}</span>
            </button>
          ))}
        </nav>
      </section>
      <div className="profile-menu">
        {[
          ["settings", "Thông tin cá nhân", "user"],
          ["wallet", "Lịch sử giao dịch", "clock"],
          ["wallet", "Rút tiền", "wallet"],
          ["settings", "Phương thức nhận tiền", "shield"],
          ["membership", "Hạng thành viên", "leaf"],
          ["referrals", "Giới thiệu", "users"],
          ["ranking", "Bảng xếp hạng", "trophy"],
          ["gifts", "Mã quà tặng", "gift"],
          ["rewards", "Phần thưởng của tôi", "bookmark"],
        ].map(([key, title, icon]) => (
          <button
            key={title}
            onClick={() => {
              if (title === "Lịch sử giao dịch")
                sessionStorage.setItem("la-wallet-tab", "ledger");
              navigate(key);
            }}
          >
            <Icon name={icon} size={20} />
            <span>{title}</span>
            {key === "membership" && member.data && (
              <span className="tier-chip">
                {memberTier(member.data.points)}
              </span>
            )}
            <Icon name="chevron" size={16} />
          </button>
        ))}
      </div>
      <div className="profile-session panel">
        <div>
          <strong>
            {boot.user.role === "admin" ? "Quản trị Lá" : "Tài khoản của bạn"}
          </strong>
          <small>Đơn hàng và thanh toán đều mô phỏng</small>
        </div>
        {boot.user.role === "admin" && (
          <button className="button" onClick={() => navigate("admin")}>
            Quản trị
          </button>
        )}
      </div>
    </div>
  );
}

export function EditorialArt({ category, compact = false }) {
  const type =
    category === "Hướng dẫn"
      ? "link"
      : category === "Ví & đơn hàng"
        ? "wallet"
        : "leaf";
  return (
    <div
      className={`editorial-art art-${type} ${compact ? "compact" : ""}`}
      aria-hidden="true"
    >
      <div className="art-orbit" />
      <span className="art-brand">
        <Icon name="leaf" size={17} /> Lá Cashback
      </span>
      <Icon name={type} size={compact ? 46 : 70} />
      <strong>
        {type === "link"
          ? "Một link, một hành trình"
          : type === "wallet"
            ? "Từng khoản hoàn, thật rõ"
            : "Chuyện từ vườn Lá"}
      </strong>
    </div>
  );
}

export function Blog() {
  const { version, navigate } = useApp();
  const state = useData("/feed", version);
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("Tất cả");
  return (
    <div className="blog-page">
      <div className="blog-intro">
        <span>Góc Lá</span>
        <h2>Mua sắm thông minh, nhận lại nhiều hơn</h2>
        <p>
          Hướng dẫn hoàn tiền, theo dõi đơn và quản lý chi tiêu trong bản trải
          nghiệm
        </p>
      </div>
      <div className="blog-filters">
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            aria-label="Tìm bài viết"
            placeholder="Tìm bài viết…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Danh mục bài viết"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {["Tất cả", "Hướng dẫn", "Ví & đơn hàng", "Cộng đồng"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <DataState state={state}>
        {(posts) => {
          const rows = posts.filter(
            (p) =>
              (category === "Tất cả" || category === p.category) &&
              (p.title + p.body)
                .toLocaleLowerCase("vi")
                .includes(query.toLocaleLowerCase("vi")),
          );
          return (
            <>
              <p className="muted">{rows.length} bài viết</p>
              <div className="blog-grid">
                {rows.map((p) => (
                  <article className="blog-card" key={p.id}>
                    <EditorialArt category={p.category} />
                    <div>
                      <span className="blog-category">{p.category}</span>
                      <small>{date(p.created_at)}</small>
                      <h3>{p.title}</h3>
                      <p>
                        {p.body.slice(0, 150)}
                        {p.body.length > 150 ? "…" : ""}
                      </p>
                      <button
                        className="text-button"
                        onClick={() => navigate("feed?post=" + p.id)}
                      >
                        Đọc bài viết <Icon name="arrow" size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!rows.length && <p>Không tìm thấy bài viết phù hợp</p>}
            </>
          );
        }}
      </DataState>
    </div>
  );
}

const faqGroups = [
  [
    "Bắt đầu sử dụng",
    [
      [
        "Tại sao tôi có thể nhận tiền hoàn qua Lá?",
        "Trong bản demo, quản trị viên mô phỏng báo cáo hoa hồng. Lá chia một phần hoa hồng theo chính sách đã lưu khi bạn tạo link. Chưa có kết nối affiliate hay khoản chi thật.",
      ],
      [
        "Lá hoạt động như thế nào?",
        "Dán link sản phẩm, tạo link theo dõi, mở cửa hàng mô phỏng để đặt đơn, sau đó xem quản trị viên duyệt khoản hoàn và thực hiện rút tiền thử.",
      ],
      [
        "Tôi cần tạo tài khoản không?",
        "Bạn có thể đăng ký hoặc chọn Dùng thử ngay để tạo tài khoản riêng kèm dữ liệu mẫu.",
      ],
      [
        "Sử dụng Lá có mất phí không?",
        "Bản demo đề án miễn phí. Không yêu cầu nạp tiền hay nhập thông tin thanh toán thật.",
      ],
      [
        "Làm sao để tôi nhận hoàn tiền?",
        "Sau khi đặt đơn mô phỏng, chờ quản trị viên đối soát. Khoản đủ điều kiện sẽ xuất hiện ở Số dư khả dụng trong ví.",
      ],
      [
        "Có áp dụng voucher của sàn không?",
        "Các voucher tại Lá hiện là nội dung minh họa. Điều kiện thực tế của sàn chưa được tích hợp.",
      ],
    ],
  ],
  [
    "Hoàn tiền & Thanh toán",
    [
      [
        "Khi nào tiền được rút?",
        "Tiền phải được duyệt và qua thời gian chờ theo chính sách tại thời điểm tạo link. Ví hiển thị riêng khoản khả dụng, đang giữ và đang chờ.",
      ],
      [
        "Tôi có rút tiền thật được không?",
        "Không. Chức năng rút và đối soát thanh toán trong đề án chỉ được mô phỏng.",
      ],
      [
        "Vì sao số dư thay đổi?",
        "Sổ giao dịch trong Ví lưu biến động khi đơn được duyệt, hủy hoặc khi có yêu cầu rút tiền. Bạn có thể mở từng giao dịch để đối chiếu.",
      ],
    ],
  ],
  [
    "Sử dụng link",
    [
      [
        "Tạo link có tự cộng tiền không?",
        "Không. Tạo link chỉ ghi nhận lượt theo dõi. Khoản hoàn phụ thuộc đơn mua mô phỏng và kết quả đối soát.",
      ],
      [
        "Lá hỗ trợ những sàn nào?",
        "Hiện chỉ nhận link HTTPS của Shopee để thử luồng demo. Những sàn khác chưa được kết nối.",
      ],
    ],
  ],
  [
    "Đơn hàng",
    [
      [
        "Vì sao chưa thấy đơn hàng?",
        "Tạo link không tự sinh đơn. Hãy hoàn tất mua hàng trong cửa hàng mô phỏng. Nếu vẫn thiếu đơn, gửi mã đơn, thời gian mua và link đã dùng qua yêu cầu hỗ trợ.",
      ],
      [
        "Đơn bị hủy có được hoàn tiền?",
        "Không. Khi đối soát từ chối hoặc hủy đơn, khoản hoàn của đơn đó được đảo lại trong sổ giao dịch.",
      ],
    ],
  ],
  [
    "Tài khoản",
    [
      [
        "Điểm trải nghiệm có rút được không?",
        "Không. Điểm danh và mã quà tặng chỉ cộng điểm thành viên, không cộng vào ví hoàn tiền.",
      ],
      [
        "Đăng xuất tài khoản ở đâu?",
        "Mở Hồ sơ. Nút Đăng xuất nằm ở cuối phần tài khoản.",
      ],
      [
        "Thông tin cá nhân có công khai không?",
        "Chỉ biệt danh được hiển thị khi bạn chủ động bật tham gia bảng xếp hạng. Email và tài khoản ngân hàng không được công khai.",
      ],
    ],
  ],
  [
    "Khác",
    [
      [
        "Lá đã kết nối Shopee thật chưa?",
        "Chưa. Đây là bản demo đề án; đơn hàng, voucher và thanh toán đều được mô phỏng.",
      ],
      [
        "Tôi muốn gửi góp ý hoặc báo lỗi?",
        "Mở Phản hồi và góp ý, điền nội dung rồi gửi. Phản hồi của quản trị viên được lưu trong yêu cầu hỗ trợ của tài khoản.",
      ],
    ],
  ],
];
export function FAQ({ support = false }) {
  const [group, setGroup] = useState(support ? 3 : 0),
    [query, setQuery] = useState("");
  const { navigate, setModal } = useApp();
  const rows = query
    ? faqGroups
        .flatMap((g) => g[1])
        .filter((r) =>
          r
            .join(" ")
            .toLocaleLowerCase("vi")
            .includes(query.toLocaleLowerCase("vi")),
        )
    : faqGroups[group][1];
  return (
    <div className="faq-page">
      <aside>
        <label className="field">
          <span>Tìm câu hỏi</span>
          <input
            placeholder="Đơn hàng, rút tiền…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <p className="muted">DANH MỤC</p>
        <nav aria-label="Danh mục hỏi đáp">
          {faqGroups.map(([title, items], i) => (
            <button
              className={!query && group === i ? "active" : ""}
              key={title}
              onClick={() => {
                setGroup(i);
                setQuery("");
              }}
            >
              <span>{title}</span>
              <small>{items.length}</small>
            </button>
          ))}
        </nav>
        {support && (
          <div className="support-shortcuts">
            <button
              className="button primary"
              onClick={() => setModal("support")}
            >
              Gửi yêu cầu hỗ trợ
            </button>
            <button
              className="text-button"
              onClick={() => navigate("settings")}
            >
              Xem yêu cầu đã gửi <Icon name="arrow" size={15} />
            </button>
          </div>
        )}
      </aside>
      <section>
        <div className="section-heading">
          <h2>{query ? "Kết quả tìm kiếm" : faqGroups[group][0]}</h2>
          <span className="muted">{rows.length} câu hỏi</span>
        </div>
        <div className="faq-list">
          {rows.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <Icon name="chevron" size={17} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
          {!rows.length && <p>Không tìm thấy câu hỏi phù hợp</p>}
        </div>
      </section>
    </div>
  );
}

export function Contact({ feedback = false }) {
  const { boot, mutate, setModal, navigate } = useApp();
  return (
    <div className="contact-page">
      <div className="contact-intro">
        <h2>{feedback ? "Phản hồi và góp ý" : "Liên hệ với chúng tôi"}</h2>
        <p>
          Có thắc mắc hoặc cần hỗ trợ? Gửi thông tin để Lá kiểm tra và phản hồi
        </p>
      </div>
      <div className="contact-columns">
        <section className="panel">
          <h3>Gửi ý kiến cho Lá</h3>
          <Form
            key={feedback ? "feedback" : "contact"}
            submitLabel="Gửi ý kiến"
            onSubmit={async (v, form) => {
              if (!boot.user) {
                setModal("auth");
                throw new Error(
                  "Vui lòng đăng nhập để lưu và theo dõi yêu cầu.",
                );
              }
              await mutate("/tickets", {
                subject: `[${v.topic}] ${v.subject}`,
                message: `${v.message}\n\nNgười gửi: ${v.name}\nEmail: ${v.email}${v.phone ? "\nLiên hệ: " + v.phone : ""}`,
                orderId: null,
              });
              form.reset();
            }}
          >
            <Field label="Chủ đề">
              <select name="topic" defaultValue={feedback ? "Góp ý" : "Hỗ trợ"}>
                {["Hỗ trợ", "Báo lỗi", "Góp ý", "Báo thiếu đơn"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field
              label="Tiêu đề"
              name="subject"
              required
              minLength={5}
              maxLength={90}
            />
            <Field label="Nội dung">
              <textarea
                name="message"
                rows={5}
                required
                minLength={10}
                maxLength={1400}
              />
            </Field>
            <div className="contact-names">
              <Field
                label="Họ và tên"
                name="name"
                required
                maxLength={80}
                defaultValue={boot.user?.name || ""}
              />
              <Field
                label="Email"
                name="email"
                type="email"
                required
                maxLength={120}
                defaultValue={boot.user?.email || ""}
              />
            </div>
            <Field
              label="Số điện thoại (tùy chọn)"
              name="phone"
              type="tel"
              maxLength={20}
            />
            <p className="microcopy">
              Yêu cầu được lưu trong hệ thống demo. Không nhập mật khẩu, số thẻ
              hoặc thông tin thanh toán thật.
            </p>
          </Form>
        </section>
        <aside>
          <h3>Thông tin liên hệ</h3>
          <div className="contact-channel">
            <Icon name="help" />
            <div>
              <strong>Trung tâm hỗ trợ Lá</strong>
              <p>Hỏi đáp về đơn hàng, ví và tài khoản</p>
              <button className="text-button" onClick={() => navigate("help")}>
                Mở trung tâm hỗ trợ <Icon name="arrow" size={15} />
              </button>
            </div>
          </div>
          <div className="contact-channel">
            <Icon name="feed" />
            <div>
              <strong>Theo dõi phản hồi</strong>
              <p>Đọc trả lời của quản trị viên trong tài khoản</p>
              <button
                className="text-button"
                onClick={() =>
                  boot.user ? navigate("settings") : setModal("auth")
                }
              >
                Xem yêu cầu đã gửi <Icon name="arrow" size={15} />
              </button>
            </div>
          </div>
          <div className="contact-channel">
            <Icon name="external" />
            <div>
              <strong>Mã nguồn đề án</strong>
              <p>
                <a
                  href="https://github.com/an1-tech/la-cashback"
                  target="_blank"
                  rel="noreferrer"
                >
                  an1-tech / la-cashback
                </a>
              </p>
            </div>
          </div>
          <section className="project-information">
            <h3>Thông tin dự án</h3>
            <p>Lá Cashback · Đề án ứng dụng hoàn tiền</p>
            <dl>
              <dt>Phạm vi</dt>
              <dd>Tạo link, đơn hàng, ví, thành viên và hỗ trợ</dd>
              <dt>Chế độ</dt>
              <dd>Mô phỏng, không giao dịch tiền thật</dd>
              <dt>Công nghệ</dt>
              <dd>React · Node.js · SQLite / Turso</dd>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function Legal() {
  return (
    <div className="legal-page">
      <p className="muted">Tài liệu dành cho bản demo đề án</p>
      {[
        [
          "Điều khoản sử dụng",
          "Lá Cashback là sản phẩm học tập. Các đơn hàng, hoa hồng, ưu đãi và giao dịch thanh toán trong bản trải nghiệm là mô phỏng. Không có cam kết hoàn tiền thực tế.",
        ],
        [
          "Chính sách bảo mật",
          "Hệ thống lưu thông tin tài khoản, phiên đăng nhập và lịch sử hoạt động để phục vụ demo. Không nhập dữ liệu ngân hàng thật. Bảng xếp hạng chỉ công khai biệt danh khi bạn chủ động tham gia.",
        ],
        [
          "Chính sách Cookie",
          "Cookie phiên đăng nhập được dùng để xác thực tài khoản. Trình duyệt lưu lựa chọn giao diện sáng/tối. Lá không triển khai cookie quảng cáo trong bản demo.",
        ],
        [
          "Cơ chế hỗ trợ",
          "Gửi yêu cầu từ mục Hỗ trợ hoặc Liên hệ. Quản trị viên kiểm tra và phản hồi trong hệ thống. Kết quả xử lý được lưu cùng yêu cầu để đối chiếu.",
        ],
        [
          "Quy chế hoạt động",
          "Tài khoản người mua tạo link và đặt đơn mô phỏng. Quản trị viên đối soát trạng thái và xử lý yêu cầu rút. Sổ giao dịch ghi nhận từng biến động; điểm thành viên tách biệt với số dư ví.",
        ],
      ].map(([title, body]) => (
        <section className="panel" key={title}>
          <h2>{title}</h2>
          <p>{body}</p>
        </section>
      ))}
    </div>
  );
}

export function PageFooter() {
  const { navigate } = useApp();
  return (
    <footer className="main-footer reference-footer">
      <nav aria-label="Liên kết cuối trang">
        {[
          ["blog", "Blog"],
          ["faq", "Hỏi đáp"],
          ["contact", "Liên hệ"],
          ["feedback", "Phản hồi và góp ý"],
          ["legal", "Pháp lý"],
          ["legal", "Quy chế hoạt động"],
        ].map(([key, title]) => (
          <button key={title} onClick={() => navigate(key)}>
            {title}
          </button>
        ))}
      </nav>
      <p>Lá Cashback · Bản demo đề án · Đơn hàng và thanh toán mô phỏng</p>
      <span>
        <Icon name="leaf" size={15} /> © 2026 Lá Cashback · v1.0 demo
      </span>
    </footer>
  );
}
