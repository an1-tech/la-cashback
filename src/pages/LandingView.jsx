import React, { useState } from "react";
import { Icon } from "../components";

const benefits = [
  [
    "wallet",
    "Hoàn tiền minh bạch",
    "Theo dõi từng khoản hoàn và biến động trong ví",
  ],
  ["link", "Nhanh & đơn giản", "Dán link và bắt đầu hành trình mua sắm"],
  ["shield", "An toàn & Bảo mật", "Không cần nhập thông tin ngân hàng thật"],
  [
    "bag",
    "Trọn vẹn trải nghiệm",
    "Từ tạo link, đối soát đến rút tiền mô phỏng",
  ],
];

export default function LandingView({
  policyState,
  loadPolicy,
  example,
  cashbackLabel,
  faq,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("la-theme") || "dark",
  );
  const toggleTheme = () => {
    const value = theme === "dark" ? "light" : "dark";
    setTheme(value);
    localStorage.setItem("la-theme", value);
    document.documentElement.dataset.theme = value;
  };
  return (
    <div className="landing" id="landing-top">
      <header className="landing-header">
        <div className="landing-wrap landing-header-inner">
          <a
            className="landing-brand"
            href="/"
            aria-label="Lá Cashback, trang giới thiệu"
          >
            <span>
              <Icon name="leaf" size={27} />
            </span>
            <strong>Lá Cashback</strong>
          </a>
          <button
            className="landing-menu-button"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            aria-controls="landing-nav"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
          <nav
            id="landing-nav"
            className={menuOpen ? "open" : ""}
            aria-label="Điều hướng trang giới thiệu"
            onClick={() => setMenuOpen(false)}
          >
            {[
              ["/", "Trang chủ"],
              ["/app#links", "Tạo link hoàn tiền"],
              ["/app#feed", "Bảng tin"],
              ["/app#faq", "Hỏi đáp"],
              ["/app#contact", "Liên hệ"],
            ].map(([href, title]) => (
              <a href={href} key={title}>
                {title}
              </a>
            ))}
          </nav>
          <div className="landing-header-actions">
            <button
              className="landing-icon-button"
              aria-label="Đổi chế độ sáng tối"
              role="switch"
              aria-checked={theme === "dark"}
              onClick={toggleTheme}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={19} />
            </button>
            <a
              className="landing-icon-button landing-bell"
              href="/app#profile"
              aria-label="Mở thông báo"
            >
              <Icon name="bell" size={19} />
            </a>
            <a className="landing-account" href="/app#profile">
              <Icon name="user" size={18} />
              <span>Tài khoản</span>
              <Icon name="chevron" size={13} />
            </a>
          </div>
        </div>
      </header>
      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-wrap">
            <div className="landing-hero-grid">
              <div className="landing-intro">
                <span className="landing-eyebrow">
                  <i />
                  Mua sắm thêm vui, nhận lại cùng Lá
                </span>
                <h1 id="landing-title">
                  MUA SẮM
                  <br />
                  HOÀN
                  <br />
                  TIỀN CÙNG
                  <br />
                  <em>LÁ CASHBACK</em>
                </h1>
                <p>
                  Trải nghiệm mua sắm, theo dõi đơn và nhận hoàn tiền trong một
                  hành trình
                </p>
                <div className="landing-actions">
                  <a className="landing-button landing-start" href="/app#try">
                    Bắt đầu trải nghiệm <Icon name="arrow" size={20} />
                  </a>
                  <a className="landing-demo-link" href="/app#links">
                    Tôi đã có tài khoản <Icon name="chevron" size={17} />
                  </a>
                </div>
                <small>Bản demo đề án · Không giao dịch tiền thật</small>
              </div>
              <div className="landing-visual">
                <div className="hero-floating hero-floating-top">
                  <strong>
                    RÕ TỪNG
                    <br />
                    KHOẢN HOÀN
                  </strong>
                  <span>Theo dõi ngay trong ví Lá</span>
                </div>
                <img
                  className="landing-photo"
                  src="/images/la-mascot.webp"
                  width="1024"
                  height="1024"
                  fetchPriority="high"
                  alt="Sóc Lá đeo túi xanh hình chiếc lá, ngồi trên những đồng xu"
                />
                <div className="hero-floating hero-floating-bottom">
                  <strong>Nhanh & đơn giản</strong>
                  <span>Tạo link, mua thử và theo dõi đơn</span>
                </div>
              </div>
            </div>
            <div className="landing-benefit-strip">
              {benefits.map(([icon, title, text], i) => (
                <article key={title}>
                  <span className="benefit-number">0{i + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="landing-how" id="landing-how">
          <div className="landing-wrap">
            <div className="landing-section-heading">
              <span>LÁ CASHBACK FLOW</span>
              <h2>Cách hoạt động</h2>
              <p>Ba bước gọn để đơn hàng được ghi nhận hoàn tiền</p>
            </div>
            <ol>
              {[
                [
                  "link",
                  "Tạo link",
                  "Dán link sản phẩm Shopee, Lá sẽ tạo link theo dõi cho lượt mua thử",
                ],
                [
                  "bag",
                  "Mua như bình thường",
                  "Mở link vừa tạo và đặt hàng trong cửa hàng mô phỏng",
                ],
                [
                  "wallet",
                  "Nhận hoàn tiền",
                  "Xem khoản hoàn trong ví sau khi đơn hàng được quản trị viên xác nhận",
                ],
              ].map(([icon, title, text], i) => (
                <li key={title}>
                  <span className="step-watermark">0{i + 1}</span>
                  <span className="step-icon">
                    <Icon name={icon} size={29} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="landing-why">
          <div className="landing-wrap">
            <div className="landing-section-heading align-left">
              <span>VÌ SAO CHỌN LÁ</span>
              <h2>Mua sắm thêm một chút vui</h2>
              <p>
                Thông tin rõ ràng, ít thao tác, mọi khoản hoàn đều có lịch sử
              </p>
            </div>
            <div className="landing-why-grid">
              {benefits.map(([icon, title, text]) => (
                <article key={title}>
                  <span className="why-icon">
                    <Icon name={icon} size={24} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="landing-example" id="landing-example">
          <div className="landing-wrap landing-example-grid">
            <div>
              <span className="landing-section-label">
                MINH BẠCH TỪ CÁCH TÍNH
              </span>
              <h2>Một đơn, tính rõ từng đồng</h2>
              <p>
                Ví dụ với một đơn mô phỏng. Khoản hoàn tính trên hoa hồng hợp
                lệ, không phải giá sản phẩm.
              </p>
              {policyState !== "ready" && (
                <div role="status" aria-live="polite">
                  <p>
                    {policyState === "loading"
                      ? "Đang tải chính sách hoàn tiền"
                      : "Chưa tải được chính sách hoàn tiền"}
                  </p>
                  {policyState === "error" && (
                    <button className="landing-button" onClick={loadPolicy}>
                      Thử tải lại chính sách
                    </button>
                  )}
                </div>
              )}
            </div>
            <dl className="landing-calc">
              {example.map(([title, value]) => (
                <div key={title}>
                  <dt>{title}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              <div className="landing-calc-total">
                <dt>Bạn nhận lại</dt>
                <dd>{cashbackLabel}</dd>
              </div>
            </dl>
          </div>
        </section>
        <section className="landing-faq landing-wrap">
          <div className="landing-section-heading align-left">
            <span>BẠN HỎI, LÁ TRẢ LỜI</span>
            <h2>Câu hỏi thường gặp</h2>
          </div>
          <div>
            {faq.map(([title, text]) => (
              <details key={title}>
                <summary>
                  {title}
                  <Icon name="chevron" size={17} />
                </summary>
                <p>{text}</p>
              </details>
            ))}
            <a className="landing-text-link" href="/app#faq">
              Xem tất cả câu hỏi <Icon name="arrow" size={17} />
            </a>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="landing-wrap">
          <div className="landing-footer-grid">
            <section>
              <a className="landing-brand" href="/">
                <Icon name="leaf" size={26} />
                <strong>Lá Cashback</strong>
              </a>
              <p>Mua sắm thêm vui, nhận lại cùng Lá</p>
              <a className="landing-button" href="/app">
                Mở ứng dụng <Icon name="arrow" size={17} />
              </a>
            </section>
            <section>
              <h3>Liên kết</h3>
              {[
                ["faq", "Hỏi đáp"],
                ["contact", "Liên hệ"],
                ["feedback", "Phản hồi và góp ý"],
              ].map(([key, title]) => (
                <a href={"/app#" + key} key={key}>
                  {title}
                </a>
              ))}
            </section>
            <section>
              <h3>Pháp lý</h3>
              {[
                "Tài liệu pháp lý",
                "Điều khoản sử dụng",
                "Chính sách bảo mật",
                "Chính sách Cookie",
                "Quy chế hoạt động",
              ].map((t) => (
                <a href="/app#legal" key={t}>
                  {t}
                </a>
              ))}
            </section>
            <section>
              <h3>Liên hệ</h3>
              <a href="/app#help">
                <Icon name="help" size={17} />
                Trung tâm hỗ trợ Lá
              </a>
              <a href="/app#contact">
                <Icon name="feed" size={17} />
                Gửi ý kiến và báo lỗi
              </a>
              <p>
                Đề án ứng dụng hoàn tiền
                <br />
                Đơn hàng và thanh toán mô phỏng
              </p>
            </section>
          </div>
          <div className="landing-footer-bottom">
            <span>© 2026 Lá Cashback · v1.0 demo</span>
            <a
              href="https://github.com/an1-tech/la-cashback"
              target="_blank"
              rel="noreferrer"
            >
              Mã nguồn dự án <Icon name="external" size={13} />
            </a>
          </div>
        </div>
      </footer>
      <a
        className="landing-floating-help"
        href="/app#help"
        aria-label="Mở trung tâm hỗ trợ"
      >
        <Icon name="help" size={23} />
      </a>
    </div>
  );
}
