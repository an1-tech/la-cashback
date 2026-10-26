import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, setCsrf, money, date } from "./api";
import {
  Icon,
  Badge,
  Empty,
  Loading,
  DataState,
  useData,
  Form,
  Field,
  Modal,
  DealArt,
} from "./components";
import { Admin } from "./pages/Admin";
import "./styles.css";
import { Context, useApp } from "./context";
const nav = [
  ["home", "Trang chủ", "home"],
  ["orders", "Đơn hàng", "bag"],
  ["deals", "Ưu đãi", "gift"],
  ["wallet", "Số dư", "wallet"],
  ["profile", "Cá nhân", "user"],
];
function App() {
  const [boot, setBoot] = useState(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    [page, setPage] = useState(
      location.pathname === "/demo-shop"
        ? "demo"
        : location.hash.slice(1) || "home",
    ),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState("");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("la-theme") || "dark",
  );
  const refresh = async () => {
    const data = await api("/bootstrap");
    setCsrf(data.csrf);
    setBoot(data);
    setVersion((v) => v + 1);
  };
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    const handler = () =>
      setPage(
        location.pathname === "/demo-shop"
          ? "demo"
          : location.hash.slice(1) || "home",
      );
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("la-theme", theme);
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = (value) => {
    if (location.pathname === "/demo-shop") location.assign("/#" + value);
    else {
      location.hash = value;
      setPage(value);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const mutate = async (path, body, method = "POST") => {
    const result = await api(path, { method, body });
    await refresh();
    return result;
  };
  const notifyError = (fn) => async () => {
    try {
      await fn();
    } catch (e) {
      setToast(e.message);
    }
  };
  if (error)
    return (
      <main className="startup-error">
        <h1>Không thể mở Lá Cashback</h1>
        <p>{error}</p>
        <button className="button primary" onClick={() => location.reload()}>
          Thử lại
        </button>
      </main>
    );
  if (!boot)
    return (
      <div className="startup-error">
        <Loading />
      </div>
    );
  const context = {
    boot,
    version,
    refresh,
    mutate,
    navigate,
    setModal,
    setToast,
    notifyError,
  };
  const title =
    {
      home: "Tổng quan",
      orders: "Đơn hàng của bạn",
      deals: "Khám phá ưu đãi",
      wallet: "Số dư & rút tiền",
      profile: "Tài khoản của bạn",
      admin: "Không gian quản trị",
      demo: "Cửa hàng mô phỏng",
    }[page] || "Lá Cashback";
  return (
    <Context.Provider value={context}>
      <div className="app-shell">
        <aside className="sidebar">
          <a
            className="brand"
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              navigate("home");
            }}
          >
            <span className="brand-mark">
              <Icon name="leaf" size={25} />
            </span>
            <span>
              lá<span className="brand-small">cashback</span>
            </span>
          </a>
          <div className="sidebar-label">MUA SẮM THÔNG MINH</div>
          <nav aria-label="Điều hướng chính">
            {nav.map(([key, label, icon]) => (
              <button
                key={key}
                className={"nav-item " + (page === key ? "active" : "")}
                aria-current={page === key ? "page" : undefined}
                onClick={() => navigate(key)}
              >
                <Icon name={icon} />
                <span>{label}</span>
                {key === "deals" && <span className="nav-tag">MỚI</span>}
              </button>
            ))}
            {boot.user?.role === "admin" && (
              <button
                className={"nav-item " + (page === "admin" ? "active" : "")}
                onClick={() => navigate("admin")}
              >
                <Icon name="grid" />
                Quản trị
              </button>
            )}
          </nav>
          <div className="sidebar-bottom">
            <div className="little-leaf">
              <Icon name="leaf" size={26} />
              <strong>
                Mỗi lần mua,
                <br />
                thêm một chút vui.
              </strong>
              <p>Bắt đầu từ món đồ bạn cần.</p>
              <button className="text-button" onClick={() => setModal("guide")}>
                Tìm hiểu cách hoạt động <Icon name="arrow" size={15} />
              </button>
            </div>
            <button className="nav-item" onClick={() => setModal("support")}>
              <Icon name="help" />
              Trung tâm hỗ trợ
            </button>
            <div className="theme-control">
              <span>
                <Icon name={theme === "dark" ? "moon" : "sun"} size={17} />
                {theme === "dark" ? "Chế độ tối" : "Chế độ sáng"}
              </span>
              <button
                aria-label="Đổi chế độ sáng tối"
                role="switch"
                aria-checked={theme === "dark"}
                className={"switch " + theme}
                onClick={() =>
                  setTheme((v) => (v === "dark" ? "light" : "dark"))
                }
              >
                <span />
              </button>
            </div>
            <div className="sidebar-foot">
              © 2026 Lá Cashback <span>v1.0 demo</span>
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              Không gian của bạn <Icon name="chevron" size={13} />
              <strong>{title}</strong>
            </div>
            <a className="mobile-brand" href="/#home">
              <Icon name="leaf" /> lá cashback
            </a>
            <div className="top-actions">
              <button
                className="icon-button mobile-theme"
                aria-label="Đổi chế độ sáng tối"
                onClick={() =>
                  setTheme((v) => (v === "dark" ? "light" : "dark"))
                }
              >
                <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
              </button>
              <span className="demo-pill">
                <span />
                Chế độ demo
              </span>
              <button
                className="icon-button notification-button"
                aria-label="Xem thông báo"
                onClick={() =>
                  boot.user ? setModal("notifications") : setModal("auth")
                }
              >
                <Icon name="bell" />
                {boot.unread > 0 && <i />}
              </button>
              {boot.user ? (
                <button
                  className="avatar"
                  aria-label="Mở tài khoản"
                  onClick={() => navigate("profile")}
                >
                  {boot.user.name.slice(0, 1)}
                </button>
              ) : (
                <button
                  className="button compact"
                  onClick={() => setModal("auth")}
                >
                  Đăng nhập
                </button>
              )}
            </div>
          </header>
          <main className="main-content">
            <div className="demo-notice">
              <Icon name="info" size={15} />
              <span>
                Bản trải nghiệm · Dữ liệu và thanh toán mô phỏng. Chưa kết nối
                Shopee.
              </span>
              <button onClick={() => setModal("guide")}>
                Tìm hiểu <Icon name="arrow" size={13} />
              </button>
            </div>
            {!["home", "deals", "demo"].includes(page) && (
              <div className="page-heading">
                <div>
                  <span className="eyebrow">LÁ CASHBACK</span>
                  <h1>{title}</h1>
                </div>
                {page === "admin" && <Badge>CHỈ QUẢN TRỊ VIÊN</Badge>}
              </div>
            )}
            {page === "home" ? (
              <Home />
            ) : page === "deals" ? (
              <Deals />
            ) : page === "demo" ? (
              <DemoShop />
            ) : !boot.user ? (
              <div className="panel">
                <Empty title="Một tài khoản, mọi khoản hoàn" icon="user">
                  Đăng nhập để xem đơn hàng, quản lý số dư và trải nghiệm luồng
                  hoàn tiền.
                </Empty>
                <button
                  className="button primary center-button"
                  onClick={() => setModal("auth")}
                >
                  Đăng nhập / Đăng ký
                </button>
              </div>
            ) : page === "orders" ? (
              <Orders />
            ) : page === "wallet" ? (
              <Wallet />
            ) : page === "profile" ? (
              <Profile />
            ) : page === "admin" && boot.user.role === "admin" ? (
              <Admin />
            ) : (
              <Empty title="Trang không tồn tại" />
            )}
            <footer className="main-footer">
              <span>
                <Icon name="leaf" size={15} /> Mua sắm có kế hoạch. Hoàn tiền
                minh bạch.
              </span>
              <button onClick={() => setModal("guide")}>
                Cách tính tiền hoàn <Icon name="external" size={13} />
              </button>
            </footer>
          </main>
        </div>
        <nav className="bottom-nav" aria-label="Điều hướng điện thoại">
          {nav.map(([key, label, icon]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => navigate(key)}
            >
              <Icon name={icon} size={21} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        {toast && (
          <div className="toast" role="status">
            <Icon name="info" />
            {toast}
            <button
              className="icon-button"
              aria-label="Đóng thông báo"
              onClick={() => setToast("")}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        {modal === "auth" && <Auth />}
        {modal === "guide" && <Guide />}
        {modal === "support" && <Support />}
        {modal === "notifications" && <Notifications />}
      </div>
    </Context.Provider>
  );
}
function Home() {
  const { boot, navigate, setModal } = useApp();
  return (
    <>
      <div className="welcome">
        <div>
          <p className="eyebrow">
            MỘT NGÀY MUA SẮM THẬT VUI <span>✦</span>
          </p>
          <h1>
            Xin chào, {boot.user ? boot.user.name : "bạn mới"}
            <span className="greeting-dot">.</span>
          </h1>
          <p>Món đồ bạn thích, thêm một khoản hoàn xinh.</p>
        </div>
        <button
          className="subtle-button desktop-only"
          onClick={() => setModal("guide")}
        >
          <Icon name="help" size={17} />
          Bạn mới? Bắt đầu ở đây <Icon name="arrow" size={16} />
        </button>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-label">
            <span className="shopee-mini">S</span> MUA SẮM TRÊN SHOPEE, BẮT ĐẦU
            TỪ LÁ
          </span>
          <h2>
            Mua sắm như thường.
            <br />
            <em>Nhận lại nhiều hơn.</em>
          </h2>
          <p>{boot.content.banner}</p>
          <LinkBox />
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-spark spark-one">✦</div>
          <div className="hero-spark spark-two">✧</div>
          <div className="floating-leaf">
            <Icon name="leaf" size={39} />
          </div>
          <div className="visual-card">
            <div>
              <span>LÁ CASHBACK</span>
              <Icon name="leaf" size={28} />
            </div>
            <small>Niềm vui từ mỗi lần mua</small>
            <strong>
              mua sắm.
              <br />
              nhận lại.
            </strong>
            <div className="visual-card-footer">
              <span>SHOP SMART. GET MORE.</span>
              <span className="card-circles">
                <i />
                <i />
              </span>
            </div>
          </div>
          <div className="floating-chip">
            <span>
              <Icon name="check" size={15} />
            </span>
            Rõ ràng từng khoản hoàn
          </div>
        </div>
      </section>
      <div className="trust-row">
        <span>
          <Icon name="shield" size={16} />
          Theo dõi minh bạch
        </span>
        <span>
          <Icon name="wallet" size={16} />
          Rút theo số dư khả dụng
        </span>
        <span>
          <Icon name="lock" size={16} />
          Bảo vệ tài khoản của bạn
        </span>
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>
            Ví hoàn tiền của bạn <span className="small-demo">DEMO</span>
          </h2>
          <button
            className="text-button"
            onClick={() => (boot.user ? navigate("wallet") : setModal("auth"))}
          >
            Xem chi tiết <Icon name="arrow" size={15} />
          </button>
        </div>
        <div className="balance-grid">
          {[
            [
              "available",
              "Có thể rút",
              "wallet",
              "Đủ điều kiện để yêu cầu rút",
            ],
            [
              "pending",
              "Đang chờ duyệt",
              "clock",
              "Cần nguồn đối soát xác nhận",
            ],
            ["paid", "Đã thanh toán", "check", "Tổng tiền đã trả mô phỏng"],
          ].map(([key, label, icon, sub], i) => (
            <button
              key={key}
              className={"balance-card " + (i === 0 ? "featured" : "")}
              onClick={() =>
                boot.user ? navigate("wallet") : setModal("auth")
              }
            >
              <div>
                <span className="balance-icon">
                  <Icon name={icon} />
                </span>
                <span>{label}</span>
                <Icon name="chevron" size={15} />
              </div>
              <strong>{boot.balances ? money(boot.balances[key]) : "—"}</strong>
              <small>{boot.user ? sub : "Đăng nhập để xem số dư"}</small>
            </button>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <h2>
            Nhận hoàn tiền thật dễ{" "}
            <span className="muted-label">Chỉ 3 bước</span>
          </h2>
          <button className="text-button" onClick={() => setModal("guide")}>
            Xem hướng dẫn <Icon name="arrow" size={15} />
          </button>
        </div>
        <div className="steps">
          {[
            [
              "01",
              "link",
              "Dán link sản phẩm",
              "Tìm món bạn thích trên Shopee, sao chép link và dán vào Lá.",
            ],
            [
              "02",
              "bag",
              "Mua qua link theo dõi",
              "Tạo lượt theo dõi tại Lá trước khi tiếp tục mua hàng.",
            ],
            [
              "03",
              "wallet",
              "Chờ duyệt, nhận tiền hoàn",
              "Tiền được rút sau khi hoa hồng hợp lệ và đủ điều kiện.",
            ],
          ].map(([no, icon, title, body]) => (
            <div className="step" key={no}>
              <span className="step-icon">
                <Icon name={icon} />
              </span>
              <div>
                <span className="step-number">BƯỚC {no}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <h2>
            Một chút ưu đãi, thêm nhiều niềm vui <span className="live-dot" />
          </h2>
          <button className="text-button" onClick={() => navigate("deals")}>
            Tất cả ưu đãi <Icon name="arrow" size={15} />
          </button>
        </div>
        <div className="deal-grid">
          {boot.deals.slice(0, 4).map((deal, i) => (
            <DealCard key={deal.id} deal={deal} index={i} />
          ))}
        </div>
        <p className="microcopy">
          Các deal và mã giảm giá trên bản demo chỉ để minh họa, không có giá
          trị sử dụng thực tế.
        </p>
      </section>
      <div className="help-strip">
        <span className="help-strip-icon">
          <Icon name="shield" size={27} />
        </span>
        <div>
          <h3>Tiền hoàn rõ ràng, an tâm mua sắm.</h3>
          <p>
            Tiền dự kiến chưa thể rút. Không hủy đơn chưa đồng nghĩa với có hoa
            hồng.
          </p>
        </div>
        <button className="text-button" onClick={() => setModal("guide")}>
          Hiểu thêm <Icon name="arrow" size={16} />
        </button>
      </div>
      {!boot.user && (
        <div className="demo-entry">
          <p>Muốn thử toàn bộ hành trình?</p>
          <button className="button" onClick={() => setModal("auth")}>
            Trải nghiệm tài khoản demo <Icon name="arrow" size={16} />
          </button>
        </div>
      )}
    </>
  );
}
function LinkBox({ initialUrl = "" }) {
  const { boot, mutate, setModal, setToast } = useApp();
  const [value, setValue] = useState(initialUrl),
    [checked, setChecked] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const check = async (e) => {
    e.preventDefault();
    if (!boot.user) {
      setModal("auth");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setChecked(
        await api("/links/inspect", { method: "POST", body: { url: value } }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const buy = async () => {
    setBusy(true);
    setError("");
    try {
      const click = await mutate("/clicks", { url: checked.url });
      setToast("Đã tạo lượt theo dõi demo. Chưa có tiền hoàn được cộng.");
      location.assign(click.redirectUrl);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <div className="link-box">
      <form onSubmit={check}>
        <div className="link-input">
          <Icon name="link" size={20} />
          <input
            aria-label="Link sản phẩm Shopee"
            type="url"
            required
            placeholder="Dán link sản phẩm Shopee vào đây…"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setChecked(null);
              setError("");
            }}
          />
          <button className="button primary" disabled={busy}>
            {busy ? (
              <span className="spinner" />
            ) : (
              <>
                Kiểm tra hoàn tiền <Icon name="arrow" size={17} />
              </>
            )}
          </button>
        </div>
      </form>
      <div className="link-hint">
        <Icon name="info" size={13} />
        Hoa hồng và tiền hoàn phụ thuộc dữ liệu đối soát hợp lệ.
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {checked && (
        <div className="inspection">
          <span className="inspection-icon">
            <Icon name="bag" />
          </span>
          <div>
            <strong>Thông tin sản phẩm: Chưa xác định</strong>
            <p>
              Tiền hoàn dự kiến: <b>Chưa xác định</b>
            </p>
            <small>{checked.message}</small>
          </div>
          <button className="button primary" onClick={buy} disabled={busy}>
            Mua hàng nhận hoàn tiền <Icon name="external" size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
function DealCard({ deal, index }) {
  const { boot, mutate, setModal, setToast } = useApp();
  const [detail, setDetail] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <article className="deal-card">
      <div className={"deal-picture " + deal.accent}>
        <span className="deal-label">ƯU ĐÃI MINH HỌA</span>
        <button
          className={"save-button " + (deal.saved ? "saved" : "")}
          aria-label={deal.saved ? "Bỏ lưu ưu đãi" : "Lưu ưu đãi"}
          aria-pressed={!!deal.saved}
          disabled={busy}
          onClick={async () => {
            if (!boot.user) {
              setModal("auth");
              return;
            }
            setBusy(true);
            try {
              await mutate(`/deals/${deal.id}/save`, { saved: !deal.saved });
              setToast(deal.saved ? "Đã bỏ lưu ưu đãi." : "Đã lưu ưu đãi.");
            } catch (e) {
              setToast(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Icon name="bookmark" size={17} />
        </button>
        <DealArt type={index} />
        <span className="picture-category">{deal.category}</span>
      </div>
      <div className="deal-body">
        <div className="merchant">
          <span className="shopee-mini">S</span> Shopee <span>•</span> Demo
        </div>
        <h3>{deal.title}</h3>
        <p>{deal.description}</p>
        <button className="deal-open" onClick={() => setDetail(true)}>
          Khám phá ưu đãi <Icon name="arrow" size={16} />
        </button>
      </div>
      {detail && (
        <Modal title={deal.title} onClose={() => setDetail(false)}>
          <Badge>ƯU ĐÃI MÔ PHỎNG</Badge>
          <p>{deal.description}</p>
          <div className="coupon">
            <code>{deal.code || "Không cần mã"}</code>
            <button
              className="icon-button"
              aria-label="Sao chép mã"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(deal.code || "");
                  setToast("Đã sao chép mã minh họa.");
                } catch {
                  setToast(
                    "Không thể sao chép tự động. Hãy chọn và sao chép mã.",
                  );
                }
              }}
            >
              <Icon name="copy" />
            </button>
          </div>
          <p>
            <b>Hết hạn:</b> {date(deal.expires_at)}
          </p>
          <p>{deal.conditions}</p>
          <LinkBox initialUrl={deal.url} />
        </Modal>
      )}
    </article>
  );
}
function Deals() {
  const { boot } = useApp();
  const [q, setQ] = useState(""),
    [category, setCategory] = useState("Tất cả"),
    [saved, setSaved] = useState(false);
  const deals = boot.deals.filter(
    (d) =>
      (category === "Tất cả" || d.category === category) &&
      (!saved || d.saved) &&
      (d.title + " " + d.description + " " + d.code)
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="deals-heading">
        <span className="eyebrow">CÓ LÁ, MUA SẮM THÊM VUI</span>
        <h1>
          Ưu đãi nhỏ.
          <br />
          <span>Niềm vui lớn.</span>
        </h1>
        <p>Gom những món đồ bạn cần, lưu những ưu đãi bạn thích.</p>
      </div>
      <div className="filter-bar">
        <div className="search-input">
          <Icon name="search" />
          <input
            aria-label="Tìm ưu đãi"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm ưu đãi hoặc mã giảm giá…"
          />
        </div>
        <button
          className={"button " + (saved ? "selected" : "")}
          onClick={() => setSaved(!saved)}
        >
          <Icon name="bookmark" size={16} />
          Đã lưu
        </button>
      </div>
      <div className="tabs">
        {["Tất cả", ...new Set(boot.deals.map((d) => d.category))].map((c) => (
          <button
            className={category === c ? "active" : ""}
            key={c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      {deals.length ? (
        <div className="deal-grid">
          {deals.map((d) => (
            <DealCard key={d.id} deal={d} index={boot.deals.indexOf(d)} />
          ))}
        </div>
      ) : (
        <Empty title="Chưa tìm thấy ưu đãi">
          Thử từ khóa khác hoặc thay đổi bộ lọc của bạn.
        </Empty>
      )}
      <p className="microcopy">
        Mọi ưu đãi trên phiên bản demo là nội dung mô phỏng.
      </p>
    </>
  );
}
function Orders() {
  const { version, setModal } = useApp();
  const [status, setStatus] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [ticket, setTicket] = useState(null);
  const state = useData(
    `/orders?status=${status}&from=${from}&to=${to}`,
    version,
  );
  return (
    <>
      <div className="filter-bar">
        <div className="tabs">
          {[
            ["", "Tất cả"],
            ["pending", "Chờ duyệt"],
            ["approved", "Đã duyệt"],
            ["rejected", "Bị từ chối"],
          ].map(([v, t]) => (
            <button
              className={status === v ? "active" : ""}
              key={v}
              onClick={() => setStatus(v)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="date-filters">
          <label>
            Từ{" "}
            <input
              aria-label="Từ ngày"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Đến{" "}
            <input
              aria-label="Đến ngày"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      </div>
      <p className="muted">
        Chỉ hiển thị đơn đã được nguồn đối soát ghi nhận. Bấm link chưa tạo ra
        tiền hoàn.
      </p>
      <DataState state={state}>
        {(rows) =>
          rows.length ? (
            <div className="order-list">
              {rows.map((o) => (
                <details className="panel order-row" key={o.id}>
                  <summary>
                    <span className="product-placeholder">
                      <Icon name="bag" size={25} />
                    </span>
                    <span className="order-main">
                      <strong>{o.title}</strong>
                      <small>
                        {o.external_id} · {date(o.created_at)}
                      </small>
                    </span>
                    <span className="order-money">
                      <strong>{money(o.cashback)}</strong>
                      <small>
                        {o.status === "pending"
                          ? "Tiền hoàn dự kiến"
                          : "Tiền hoàn cuối cùng"}
                      </small>
                    </span>
                    <Badge status={o.status} />
                    <Icon name="chevron" size={16} />
                  </summary>
                  <div className="order-detail">
                    <div className="detail-grid">
                      <div>
                        <small>Giá trị đơn theo báo cáo</small>
                        <strong>{money(o.order_value)}</strong>
                      </div>
                      <div>
                        <small>Hoa hồng nguồn ghi nhận</small>
                        <strong>{money(o.commission)}</strong>
                      </div>
                      <div>
                        <small>Tiền hoàn dự kiến từ báo cáo</small>
                        <strong>
                          {o.estimated_cashback === null
                            ? "Chưa xác định"
                            : money(o.estimated_cashback)}
                        </strong>
                      </div>
                      <div>
                        <small>Tiền hoàn cuối cùng</small>
                        <strong>
                          {o.status === "pending"
                            ? "Chưa được duyệt"
                            : money(o.cashback)}
                        </strong>
                      </div>
                      <div>
                        <small>Chính sách tại lượt bấm</small>
                        <strong>
                          v{o.version} · Chia {o.share_bps / 100}% hoa hồng
                        </strong>
                      </div>
                      <div>
                        <small>Khả dụng</small>
                        <strong>
                          {o.status === "approved"
                            ? o.released
                              ? "Đã chuyển sang khả dụng"
                              : date(o.available_at)
                            : "Chưa đủ điều kiện"}
                        </strong>
                      </div>
                    </div>
                    {o.reason && <div className="alert error">{o.reason}</div>}
                    <p className="mono microcopy">
                      Tham chiếu: {o.id}
                      <br />
                      Lượt bấm: {o.click_id}
                    </p>
                    <button className="button" onClick={() => setTicket(o.id)}>
                      <Icon name="help" size={16} />
                      Yêu cầu hỗ trợ đơn này
                    </button>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <Empty title="Chưa có đơn hàng phù hợp">
              Dán link trên Trang chủ để bắt đầu. Đơn chỉ xuất hiện khi có báo
              cáo ghi nhận.
            </Empty>
          )
        }
      </DataState>
      <div className="help-strip">
        <Icon name="help" />
        <div>
          <h3>Bạn chưa thấy đơn hàng?</h3>
          <p>
            Gửi thông tin để quản trị viên kiểm tra; hệ thống không tự cộng tiền
            từ khai báo.
          </p>
        </div>
        <button className="text-button" onClick={() => setModal("support")}>
          Gửi hỗ trợ <Icon name="arrow" size={15} />
        </button>
      </div>
      {ticket && <Support orderId={ticket} onClose={() => setTicket(null)} />}
    </>
  );
}
function Wallet() {
  const { boot, version, mutate, setToast, navigate } = useApp();
  const state = useData("/wallet", version);
  const key = useRef(crypto.randomUUID());
  const [tab, setTab] = useState("withdrawals");
  return (
    <DataState state={state}>
      {(data) => (
        <>
          <div className="wallet-balances">
            {[
              ["available", "Có thể rút", "wallet"],
              ["pending", "Chờ duyệt", "clock"],
              ["locked", "Đã duyệt, chưa khả dụng", "lock"],
              ["held", "Đang xử lý rút", "refresh"],
              ["paid", "Đã thanh toán", "check"],
            ].map(([key, label, icon]) => (
              <div
                key={key}
                className={
                  "balance-card " + (key === "available" ? "featured" : "")
                }
              >
                <div>
                  <Icon name={icon} size={18} />
                  <span>{label}</span>
                </div>
                <strong>{money(data.balances[key])}</strong>
              </div>
            ))}
          </div>
          {data.balances.available < 0 && (
            <div className="alert error">
              Số dư đang âm do điều chỉnh đối soát. Các khoản hoàn mới sẽ bù số
              tiền này trước khi có thể rút.
            </div>
          )}
          <div className="two-column">
            <section className="panel">
              <div className="panel-heading">
                <Icon name="wallet" />
                <h2>Tạo yêu cầu rút tiền</h2>
                <Badge>DEMO</Badge>
              </div>
              <p className="muted">
                Tối thiểu {money(data.policy.minimum_withdrawal)}. Tiền được giữ
                ngay khi yêu cầu thành công.
              </p>
              {boot.user.bank ? (
                <>
                  <div className="bank-card">
                    <Icon name="shield" />
                    <div>
                      <strong>{boot.user.bank.label}</strong>
                      <p>
                        •••• {boot.user.bank.account.slice(-4)} ·{" "}
                        {boot.user.bank.holder}
                      </p>
                    </div>
                  </div>
                  <Form
                    submitLabel="Gửi yêu cầu rút mô phỏng"
                    onSubmit={async (v) => {
                      await mutate("/withdrawals", {
                        amount: Number(v.amount),
                        requestKey: key.current,
                      });
                      key.current = crypto.randomUUID();
                      setToast("Đã giữ tiền cho yêu cầu rút.");
                    }}
                  >
                    <Field
                      label="Số tiền (VND)"
                      name="amount"
                      type="number"
                      step="1"
                      min={data.policy.minimum_withdrawal}
                      max={Math.max(
                        data.policy.minimum_withdrawal,
                        data.balances.available,
                      )}
                      placeholder="Ví dụ: 50000"
                      required
                    />
                    <p className="microcopy">
                      Duyệt yêu cầu chưa đồng nghĩa với đã thanh toán. Không có
                      tiền thật được chuyển trong demo.
                    </p>
                  </Form>
                </>
              ) : (
                <>
                  <Empty title="Thêm ngân hàng mô phỏng" icon="wallet">
                    Cập nhật thông tin nhận tiền thử nghiệm trước khi yêu cầu
                    rút.
                  </Empty>
                  <button
                    className="button"
                    onClick={() => navigate("profile")}
                  >
                    Mở Cá nhân
                  </button>
                </>
              )}
            </section>
            <section className="panel policy-explainer">
              <span className="eyebrow">HIỂU ĐÚNG VỀ TIỀN HOÀN</span>
              <h2>
                Từ đơn hàng
                <br />
                đến số dư khả dụng.
              </h2>
              <ol>
                <li>
                  <strong>Chờ duyệt</strong>
                  <span>
                    Nguồn báo cáo đã ghi nhận, chưa xác nhận hoa hồng.
                  </span>
                </li>
                <li>
                  <strong>Đã duyệt, chưa khả dụng</strong>
                  <span>
                    Hoa hồng hợp lệ, còn chờ điều kiện của chính sách.
                  </span>
                </li>
                <li>
                  <strong>Có thể rút</strong>
                  <span>Đủ điều kiện để yêu cầu thanh toán.</span>
                </li>
              </ol>
              <p className="microcopy">
                Chính sách hiện tại: v{data.policy.version}. Chia{" "}
                {data.policy.share_bps / 100}% hoa hồng hợp lệ. Chờ{" "}
                {data.policy.hold_days} ngày từ khi duyệt. Làm tròn xuống đến 1
                VND.
              </p>
            </section>
          </div>
          <section className="section">
            <div className="tabs">
              <button
                className={tab === "withdrawals" ? "active" : ""}
                onClick={() => setTab("withdrawals")}
              >
                Lịch sử rút tiền
              </button>
              <button
                className={tab === "ledger" ? "active" : ""}
                onClick={() => setTab("ledger")}
              >
                Sổ giao dịch
              </button>
            </div>
            {tab === "withdrawals" ? (
              data.withdrawals.length ? (
                <div className="table-wrap panel">
                  <table>
                    <thead>
                      <tr>
                        <th>Yêu cầu</th>
                        <th>Số tiền</th>
                        <th>Trạng thái</th>
                        <th>Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.withdrawals.map((w) => (
                        <tr key={w.id}>
                          <td>
                            <span className="mono">{w.id.slice(0, 8)}</span>
                            <small>{date(w.created_at)}</small>
                          </td>
                          <td>
                            <b>{money(w.amount)}</b>
                          </td>
                          <td>
                            <Badge status={w.status} />
                          </td>
                          <td>
                            {w.payment_reference ||
                              w.reason ||
                              "Chưa có thanh toán"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="Chưa có yêu cầu rút tiền" icon="wallet" />
              )
            ) : (
              <div className="table-wrap panel">
                <table>
                  <thead>
                    <tr>
                      <th>Thời gian / Tham chiếu</th>
                      <th>Nội dung</th>
                      <th>Ngăn số dư</th>
                      <th>Biến động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ledger.map((l, i) => (
                      <tr key={l.id + l.account + i}>
                        <td>
                          {date(l.created_at)}
                          <small className="mono">{l.reference}</small>
                        </td>
                        <td>{l.description}</td>
                        <td>
                          {
                            {
                              pending: "Chờ duyệt",
                              locked: "Chưa khả dụng",
                              available: "Có thể rút",
                              held: "Giữ để rút",
                              paid: "Đã thanh toán",
                            }[l.account]
                          }
                        </td>
                        <td className={l.amount > 0 ? "positive" : "negative"}>
                          {l.amount > 0 ? "+" : ""}
                          {money(l.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.ledger.length && <Empty title="Chưa có bút toán" />}
              </div>
            )}
          </section>
        </>
      )}
    </DataState>
  );
}
function Profile() {
  const { boot, mutate, setModal, navigate, setToast } = useApp();
  return (
    <>
      <div className="profile-banner">
        <div className="large-avatar">{boot.user.name.slice(0, 1)}</div>
        <div>
          <h2>{boot.user.name}</h2>
          <p>{boot.user.email}</p>
          <Badge>
            {boot.user.role === "admin" ? "Quản trị viên" : "Thành viên"} · DEMO
          </Badge>
        </div>
        <div className="profile-actions">
          {boot.user.role === "admin" && (
            <button
              className="button primary"
              onClick={() => navigate("admin")}
            >
              Mở quản trị <Icon name="arrow" size={16} />
            </button>
          )}
          <button
            className="button"
            onClick={async () => {
              try {
                await mutate("/auth/logout", {});
                navigate("home");
                setToast("Đã đăng xuất.");
              } catch (e) {
                setToast(e.message);
              }
            }}
          >
            <Icon name="logout" size={16} />
            Đăng xuất
          </button>
        </div>
      </div>
      <div className="two-column">
        <section className="panel">
          <h2>Thông tin cá nhân</h2>
          <Form onSubmit={(v) => mutate("/profile", v, "PATCH")}>
            <Field
              label="Tên hiển thị"
              name="name"
              defaultValue={boot.user.name}
              required
              minLength={2}
              maxLength={80}
            />
            <Field
              label="Email đăng nhập"
              type="email"
              value={boot.user.email}
              disabled
            />
            <p className="microcopy">
              Nếu cần đặt lại mật khẩu, dùng chức năng “Quên mật khẩu” tại màn
              hình đăng nhập. Bản demo hiển thị mã thử ngay trên màn hình.
            </p>
          </Form>
          <button
            className="text-button spaced"
            onClick={() => setModal("support")}
          >
            Gửi yêu cầu hỗ trợ <Icon name="arrow" size={15} />
          </button>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Ngân hàng nhận tiền</h2>
            <Badge>CHỈ DỮ LIỆU GIẢ</Badge>
          </div>
          <p className="muted">
            Không nhập tài khoản thật. Thay đổi cần xác nhận lại mật khẩu.
          </p>
          <Form
            onSubmit={(v) => mutate("/bank", v, "PUT")}
            submitLabel="Xác nhận & lưu ngân hàng demo"
          >
            <Field
              label="Ngân hàng"
              name="label"
              value="Ngân hàng mô phỏng"
              readOnly
            />
            <div className="form-grid">
              <Field
                label="Số tài khoản demo"
                name="account"
                pattern="DEMO-[0-9]{8}"
                placeholder="DEMO-00001234"
                defaultValue={boot.user.bank?.account}
                required
              />
              <Field
                label="Tên nhận tiền giả"
                name="holder"
                defaultValue={boot.user.bank?.holder || "NGUOI DUNG DEMO"}
                required
              />
            </div>
            <Field
              label="Mật khẩu hiện tại"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Form>
        </section>
      </div>
      <section className="section">
        <h2>Yêu cầu hỗ trợ của bạn</h2>
        <TicketList />
      </section>
    </>
  );
}
function TicketList() {
  const { version } = useApp();
  const state = useData("/tickets", version);
  return (
    <DataState state={state}>
      {(rows) =>
        rows.length ? (
          <div className="order-list">
            {rows.map((t) => (
              <article className="panel" key={t.id}>
                <div className="section-heading">
                  <h3>{t.subject}</h3>
                  <Badge status={t.status} />
                </div>
                <p>{t.message}</p>
                <small className="muted">
                  {date(t.created_at)} · {t.id.slice(0, 8)}
                </small>
                {t.response && (
                  <div className="alert success">
                    <b>Phản hồi quản trị:</b> {t.response}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Chưa có yêu cầu hỗ trợ" icon="help" />
        )
      }
    </DataState>
  );
}
function Auth() {
  const { setModal, refresh, setToast } = useApp();
  const [mode, setMode] = useState("login"),
    [resetToken, setResetToken] = useState("");
  const [demo, setDemo] = useState("user");
  return (
    <Modal
      title={
        mode === "register"
          ? "Cùng Lá mua sắm thông minh"
          : mode === "forgot"
            ? "Đặt lại mật khẩu demo"
            : "Chào bạn, Lá đây!"
      }
      onClose={() => setModal(null)}
    >
      <p className="muted">Một nơi để theo dõi mọi khoản hoàn tiền của bạn.</p>
      <div className="tabs">
        {[
          ["login", "Đăng nhập"],
          ["register", "Đăng ký"],
          ["forgot", "Quên mật khẩu"],
        ].map(([v, t]) => (
          <button
            key={v}
            className={mode === v ? "active" : ""}
            onClick={() => setMode(v)}
          >
            {t}
          </button>
        ))}
      </div>
      {mode === "login" && (
        <div className="demo-auth">
          <strong>Trải nghiệm nhanh với tài khoản mẫu</strong>
          <div>
            <button
              className={
                "button compact " + (demo === "user" ? "selected" : "")
              }
              onClick={() => setDemo("user")}
            >
              Người mua
            </button>
            <button
              className={
                "button compact " + (demo === "admin" ? "selected" : "")
              }
              onClick={() => setDemo("admin")}
            >
              Quản trị
            </button>
          </div>
          <p>
            {demo === "admin" ? "admin" : "ban"}@demo.local · Mật khẩu:
            Demo@123456
          </p>
        </div>
      )}
      {mode !== "forgot" ? (
        <Form
          key={mode + demo}
          submitLabel={mode === "register" ? "Tạo tài khoản" : "Đăng nhập"}
          onSubmit={async (v) => {
            await api("/auth/" + mode, { method: "POST", body: v });
            await refresh();
            setModal(null);
            setToast("Đăng nhập thành công. Đây là dữ liệu demo.");
          }}
        >
          {mode === "register" && (
            <Field
              label="Tên của bạn"
              name="name"
              placeholder="Bạn muốn Lá gọi là gì?"
              required
              minLength={2}
              maxLength={80}
            />
          )}
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={
              mode === "login"
                ? demo === "admin"
                  ? "admin@demo.local"
                  : "ban@demo.local"
                : ""
            }
            required
          />
          <Field
            label="Mật khẩu (ít nhất 10 ký tự)"
            name="password"
            type="password"
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            defaultValue={mode === "login" ? "Demo@123456" : ""}
            required
            minLength={10}
            maxLength={128}
          />
        </Form>
      ) : (
        <>
          <Form
            submitLabel="Tạo mã đặt lại demo"
            onSubmit={async (v) => {
              const result = await api("/auth/forgot", {
                method: "POST",
                body: v,
              });
              setResetToken(result.resetToken || "");
              if (!result.resetToken)
                setToast("Không có mã cho email này trong demo.");
            }}
          >
            <Field
              label="Email tài khoản demo"
              name="email"
              type="email"
              required
            />
          </Form>
          {resetToken && (
            <>
              <div className="alert">
                <strong>Mã thử nghiệm, chưa gửi email:</strong>
                <code className="break-all">{resetToken}</code>
              </div>
              <Form
                submitLabel="Đặt lại mật khẩu"
                onSubmit={async (v) => {
                  await api("/auth/reset", {
                    method: "POST",
                    body: { token: resetToken, password: v.password },
                  });
                  await refresh();
                  setMode("login");
                  setResetToken("");
                  setToast("Đã đổi mật khẩu và thu hồi các phiên đăng nhập.");
                }}
              >
                <Field
                  label="Mật khẩu mới"
                  name="password"
                  type="password"
                  minLength={10}
                  maxLength={128}
                  required
                  autoComplete="new-password"
                />
              </Form>
            </>
          )}
        </>
      )}
      <p className="microcopy">
        <Icon name="shield" size={13} /> Bản demo cục bộ. Chỉ sử dụng thông tin
        thử nghiệm.
      </p>
    </Modal>
  );
}
function Guide() {
  const { setModal, boot } = useApp();
  return (
    <Modal
      title="Hoàn tiền rõ ràng, từ bước đầu"
      onClose={() => setModal(null)}
      wide
    >
      <Badge>HƯỚNG DẪN & ĐIỀU KIỆN DEMO</Badge>
      <p>{boot.content.guide}</p>
      <div className="guide-steps">
        <p>
          <b>1. Dán link → kiểm tra → mua qua link theo dõi.</b>
          <br />
          Demo không đọc sản phẩm, không tạo link affiliate thật. Lượt bấm không
          tạo ra số dư.
        </p>
        <p>
          <b>2. Ghi nhận đơn từ báo cáo.</b>
          <br />
          Tại cửa hàng mô phỏng, bạn có thể tạo đơn mẫu. Quản trị viên duyệt
          hoặc từ chối hoa hồng. Đơn chưa xác định người mua sẽ được giữ để đối
          chiếu.
        </p>
        <p>
          <b>3. Chờ đủ điều kiện rồi rút.</b>
          <br />
          Tiền hoàn = hoa hồng hợp lệ × tỷ lệ chia của phiên bản chính sách tại
          lượt bấm. Làm tròn xuống 1 VND. Tiền dự kiến không thể rút.
        </p>
        <p>
          <b>4. Duyệt rút và thanh toán là hai bước riêng.</b>
          <br />
          Demo chỉ dùng ngân hàng giả và tham chiếu DEMO-. Không chuyển tiền
          thật.
        </p>
      </div>
      <div className="alert">
        Đơn không hủy hoặc hoàn hàng vẫn có thể không được duyệt hoa hồng. Không
        có cam kết tỷ lệ hoặc thời gian ghi nhận Shopee trong bản này.
      </div>
      <h3>Trước khi vận hành thật</h3>
      <p>
        Cần tài liệu chính thức, quyền API/báo cáo, xác nhận chương trình cho
        phép cashback, cơ chế theo dõi và đối soát, chính sách khả dụng, dịch vụ
        email, ngân hàng và hạ tầng bảo mật. Chi tiết trong README của dự án.
      </p>
    </Modal>
  );
}
function Support({ orderId = null, onClose }) {
  const { boot, setModal, mutate, setToast } = useApp();
  const close = onClose || (() => setModal(null));
  return (
    <Modal title="Lá có thể giúp gì cho bạn?" onClose={close}>
      {boot.user ? (
        <>
          <p className="muted">
            Mô tả đơn bị thiếu hoặc khoản hoàn cần kiểm tra. Không gửi mật khẩu,
            số thẻ hoặc thông tin ngân hàng thật.
          </p>
          <Form
            submitLabel="Gửi yêu cầu hỗ trợ"
            onSubmit={async (v) => {
              await mutate("/tickets", { ...v, orderId });
              setToast("Đã gửi yêu cầu. Xem phản hồi trong Cá nhân.");
              close();
            }}
          >
            <Field
              label="Tiêu đề"
              name="subject"
              required
              minLength={5}
              maxLength={120}
              defaultValue={orderId ? "Kiểm tra tiền hoàn của đơn hàng" : ""}
            />
            <Field label="Nội dung">
              <textarea
                name="message"
                rows={5}
                required
                minLength={10}
                maxLength={2000}
                placeholder="Mã đơn, ngày mua và điều bạn cần hỗ trợ…"
              />
            </Field>
          </Form>
        </>
      ) : (
        <>
          <Empty title="Đăng nhập để gửi hỗ trợ" icon="help" />
          <button className="button primary" onClick={() => setModal("auth")}>
            Đăng nhập
          </button>
        </>
      )}
    </Modal>
  );
}
function Notifications() {
  const { version, mutate, setModal, setToast } = useApp();
  const state = useData("/notifications", version);
  return (
    <Modal title="Thông báo của bạn" onClose={() => setModal(null)}>
      <button
        className="text-button"
        onClick={async () => {
          try {
            await mutate("/notifications/read", {});
            setToast("Đã đánh dấu tất cả là đã đọc.");
          } catch (e) {
            setToast(e.message);
          }
        }}
      >
        Đánh dấu tất cả đã đọc <Icon name="check" size={16} />
      </button>
      <DataState state={state}>
        {(rows) =>
          rows.length ? (
            <div className="notification-list">
              {rows.map((n) => (
                <article key={n.id} className={n.read_at ? "read" : ""}>
                  <span className="notification-dot" />
                  <div>
                    <h3>{n.title}</h3>
                    <p>{n.body}</p>
                    <small>{date(n.created_at)}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty title="Chưa có thông báo" icon="bell" />
          )
        }
      </DataState>
    </Modal>
  );
}
function DemoShop() {
  const { boot, version, mutate, setModal, navigate, setToast } = useApp();
  const clickId = new URLSearchParams(location.search).get("click");
  const state = useData("/clicks", version);
  return (
    <section className="panel demo-shop">
      <span className="hero-label">CỬA HÀNG MÔ PHỎNG · KHÔNG PHẢI SHOPEE</span>
      <h1>
        Thử một lần mua.
        <br />
        Hiểu cả hành trình.
      </h1>
      <p>Không có hàng hóa được mua hay tiền thật được sử dụng.</p>
      {!boot.user ? (
        <button className="button primary" onClick={() => setModal("auth")}>
          Đăng nhập để thử
        </button>
      ) : (
        <DataState state={state}>
          {(clicks) => {
            const click = clicks.find((c) => c.id === clickId);
            return click ? (
              <>
                <div className="demo-product">
                  <span className="demo-product-art">
                    <Icon name="bag" size={62} />
                  </span>
                  <div>
                    <h2>Sản phẩm mô phỏng</h2>
                    <p>
                      Giá trị đơn: {money(450000)} · Hoa hồng giả lập:{" "}
                      {money(25000)}
                    </p>
                    <p>
                      Đây là số tiền cố định của kịch bản demo, không phải mức
                      hoa hồng Shopee.
                    </p>
                    <p className="mono microcopy">
                      Theo dõi: {click.id}
                      <br />
                      Chính sách đã gắn: v{click.version}
                    </p>
                  </div>
                </div>
                <Form
                  submitLabel="Mô phỏng mua & ghi nhận đơn chờ duyệt"
                  onSubmit={async () => {
                    const result = await mutate("/demo/order", { clickId });
                    setToast(
                      result.duplicate
                        ? "Đơn demo này đã được ghi nhận trước đó."
                        : "Đã ghi nhận đơn demo, chờ quản trị đối soát.",
                    );
                    navigate("orders");
                  }}
                >
                  <p className="microcopy">
                    Gửi lại không tạo đơn hoặc tiền hoàn trùng. Quản trị viên
                    thực hiện bước duyệt/từ chối tiếp theo.
                  </p>
                </Form>
              </>
            ) : (
              <Empty title="Không tìm thấy lượt theo dõi của bạn">
                Trở về Trang chủ và tạo lượt mua thử mới.
              </Empty>
            );
          }}
        </DataState>
      )}
      <button className="text-button spaced" onClick={() => navigate("home")}>
        Trở về Trang chủ <Icon name="arrow" size={16} />
      </button>
    </section>
  );
}
createRoot(document.getElementById("root")).render(<App />);
