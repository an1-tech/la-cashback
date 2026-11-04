import React, { useState } from "react";
import { Icon } from "../components";
import "./landing.css";

const steps = [
  [
    "Tạo link theo dõi",
    "Dán link sản phẩm Shopee vào Lá để tạo link cho lượt mua thử",
  ],
  ["Mô phỏng mua hàng", "Mở link vừa tạo và đặt đơn mẫu trong cửa hàng demo"],
  [
    "Theo dõi khoản hoàn",
    "Xem trạng thái đối soát trong Đơn hàng và số tiền được duyệt trong ví",
  ],
];

const example = [
  ["Giá trị đơn", "450.000 đ"],
  ["Hoa hồng nguồn báo về", "25.000 đ"],
  ["Lá chia cho bạn", "70%"],
];

const faq = [
  [
    "Lá có phải Shopee không?",
    "Không. Đây là bản demo học tập, chưa kết nối Shopee. Cửa hàng và đơn hàng đều là mô phỏng.",
  ],
  [
    "Khi nào tiền hoàn được rút?",
    "Sau khi quản trị viên đối soát và duyệt hoa hồng, khoản hoàn chuyển sang Có thể rút. Mức rút tối thiểu hiện là 50.000 đ.",
  ],
  [
    "Có dùng tiền thật không?",
    "Không. Ngân hàng, voucher và thanh toán đều là dữ liệu thử nghiệm. Không nhập thông tin thật.",
  ],
];

export function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="landing" id="landing-top">
      <header className="landing-header landing-wrap">
        <a
          className="landing-brand"
          href="/"
          aria-label="Lá Cashback, trang giới thiệu"
        >
          <Icon name="leaf" size={28} /> <strong>lá cashback</strong>
        </a>
        <button
          type="button"
          className="landing-menu-button"
          aria-expanded={menuOpen}
          aria-controls="landing-nav"
          aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon name={menuOpen ? "close" : "menu"} size={22} />
        </button>
        <nav
          id="landing-nav"
          className={menuOpen ? "open" : ""}
          aria-label="Điều hướng trang giới thiệu"
          onClick={() => setMenuOpen(false)}
        >
          <a href="#landing-how">Cách hoạt động</a>
          <a href="#landing-example">Ví dụ tính tiền</a>
          <a href="/app#deals">Ưu đãi</a>
          <a href="/app#help">Hỏi đáp</a>
        </nav>
        <a className="landing-button landing-open" href="/app">
          Mở ứng dụng <Icon name="arrow" size={17} />
        </a>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-wrap landing-hero-grid">
            <div className="landing-intro">
              <h1 id="landing-title">
                Mua sắm
                <br />
                Nhận lại
              </h1>
              <p>
                Trải nghiệm cách tạo link mua sắm, theo dõi đơn và nhận hoàn
                tiền vào ví Lá
              </p>
              <div className="landing-actions">
                <a className="landing-button landing-start" href="/app#try">
                  Dùng thử ngay <Icon name="arrow" size={19} />
                </a>
                <a className="landing-text-link" href="/app#links">
                  Tôi đã có tài khoản
                </a>
              </div>
              <small>
                Không cần đăng ký · Đơn hàng và thanh toán đều mô phỏng
              </small>
            </div>
            <figure className="landing-visual">
              <img
                className="landing-photo"
                src="/images/hero-720.webp"
                srcSet="/images/hero-480.webp 480w, /images/hero-720.webp 720w"
                sizes="(max-width: 760px) 92vw, 46vw"
                width="720"
                height="720"
                fetchPriority="high"
                alt="Tai nghe sáng màu đặt bên tán lá"
              />
              <figcaption>
                <Icon name="leaf" size={19} /> Lá Cashback
              </figcaption>
            </figure>
          </div>
        </section>

        <section
          className="landing-wrap landing-how"
          id="landing-how"
          aria-labelledby="landing-how-title"
        >
          <div>
            <h2 id="landing-how-title">Cách Lá ghi nhận hoàn tiền</h2>
            <p>
              Từ link sản phẩm đến số dư trong ví, bạn có thể theo dõi từng bước
            </p>
          </div>
          <ol>
            {steps.map(([title, description]) => (
              <li key={title}>
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="landing-example"
          id="landing-example"
          aria-labelledby="landing-example-title"
        >
          <div className="landing-wrap landing-example-grid">
            <div>
              <h2 id="landing-example-title">Một đơn, tính rõ từng đồng</h2>
              <p>
                Tiền hoàn tính trên hoa hồng hợp lệ, không phải giá sản phẩm.
                Làm tròn xuống đến 1 đồng.
              </p>
            </div>
            <dl className="landing-calc">
              {example.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              <div className="landing-calc-total">
                <dt>Bạn nhận lại</dt>
                <dd>17.500 đ</dd>
              </div>
            </dl>
          </div>
        </section>

        <section
          className="landing-wrap landing-faq"
          aria-labelledby="landing-faq-title"
        >
          <h2 id="landing-faq-title">Câu hỏi thường gặp</h2>
          <div>
            {faq.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <Icon name="chevron" size={18} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
            <a className="landing-text-link" href="/app#help">
              Xem tất cả câu hỏi <Icon name="arrow" size={16} />
            </a>
          </div>
        </section>

        <section className="landing-next" aria-labelledby="landing-next-title">
          <div className="landing-wrap">
            <h2 id="landing-next-title">Thử với một link bạn có sẵn</h2>
            <a className="landing-button" href="/app#try">
              Bắt đầu trải nghiệm <Icon name="arrow" size={17} />
            </a>
          </div>
        </section>
      </main>

      <footer className="landing-wrap landing-footer">
        <span>© 2026 Lá Cashback · v1.0 demo</span>
        <a href="/app#help">Hỏi đáp &amp; hỗ trợ</a>
      </footer>
    </div>
  );
}
