import React from "react";
import { Icon } from "../components";
import "./landing.css";

const steps = [
  [
    "Tạo link theo dõi",
    "Dán link sản phẩm Shopee vào Lá để tạo link cho lượt mua thử.",
  ],
  ["Mô phỏng mua hàng", "Mở link vừa tạo và đặt đơn mẫu trong cửa hàng demo."],
  [
    "Theo dõi khoản hoàn",
    "Xem trạng thái đối soát trong Đơn hàng và số tiền được duyệt trong ví.",
  ],
];

export function Landing() {
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
        <nav aria-label="Điều hướng trang giới thiệu">
          <a href="#landing-how">Cách hoạt động</a>
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
                tiền vào ví Lá.
              </p>
              <a className="landing-button landing-start" href="/app#links">
                Tạo link dùng thử <Icon name="arrow" size={19} />
              </a>
              <small>Bản demo. Đơn hàng và thanh toán đều mô phỏng.</small>
            </div>
            <figure className="landing-visual">
              <div
                className="landing-photo"
                role="img"
                aria-label="Tai nghe sáng màu đặt bên tán lá"
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
              Từ link sản phẩm đến số dư trong ví, bạn có thể theo dõi từng
              bước.
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

        <section className="landing-next" aria-labelledby="landing-next-title">
          <div className="landing-wrap">
            <h2 id="landing-next-title">Thử với một link bạn có sẵn</h2>
            <a className="landing-button" href="/app#links">
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
