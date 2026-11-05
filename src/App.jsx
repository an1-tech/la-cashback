import React, { useEffect, useId, useRef, useState } from "react";
import {
  api,
  setCsrf,
  money,
  date,
  pageTitles,
  currentPage,
  shopeeLinkError,
  digits,
} from "./api";
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
  LogoutButton,
} from "./components";
import { Admin } from "./pages/Admin";
import {
  QuickActions,
  HomeCommunity,
  Feed,
  Leaderboard,
  MemberPage,
  AccountOverview,
  HelpPage,
  LinkHistory,
  copyText,
} from "./pages/Community";
import "./styles.css";
import "./redesign.css";
import "./community.css";
import "./upgrades.css";
import { Context, useApp } from "./context";
import {
  Brand,
  primaryNavigation,
  secondaryNavigation,
  Identity,
  PromoCarousel,
  ProfileHub,
  Blog,
  FAQ,
  Contact,
  Legal,
  PageFooter,
} from "./pages/Reference";
import "./reference.css";
const nav = [
  ["home", "Trang chủ", "home"],
  ["orders", "Đơn hàng", "bag"],
  ["deals", "Ưu đãi", "gift"],
  ["wallet", "Số dư", "wallet"],
  ["profile", "Cá nhân", "user"],
];
export default function App() {
  const [boot, setBoot] = useState(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    [page, setPage] = useState(currentPage),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width: 760px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 760px)");
    const resize = () => {
      setMobile(media.matches);
      setMenuOpen(false);
    };
    const escape = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    media.addEventListener("change", resize);
    window.addEventListener("keydown", escape);
    return () => {
      media.removeEventListener("change", resize);
      window.removeEventListener("keydown", escape);
    };
  }, []);
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
    const handler = () => setPage(currentPage());
    window.addEventListener("hashchange", handler);
    handler(); // Catch navigation between the lazy module render and effect subscription.
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    const expired = () =>
      refresh()
        .then(() => {
          setToast("Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.");
          setModal("auth");
        })
        .catch(() => {});
    window.addEventListener("la:unauthorized", expired);
    return () => window.removeEventListener("la:unauthorized", expired);
  }, []);
  useEffect(() => {
    document.title =
      page === "home"
        ? "Lá Cashback — Ứng dụng hoàn tiền"
        : (pageTitles[page] || "Trang không tồn tại") + " · Lá Cashback";
  }, [page]);
  useEffect(() => {
    if (page !== "try" || !boot) return;
    if (boot.user) navigate("home");
    else
      startDemo().catch((e) => {
        setToast(e.message);
        navigate("home");
      });
  }, [page, boot]);
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
    setMenuOpen(false);
    if (location.pathname === "/demo-shop") location.assign("/app#" + value);
    else {
      location.hash = value;
      setPage(value);
    }
    window.scrollTo({
      top: 0,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  // Tạo người mua sandbox riêng, không cần đăng ký.
  const startDemo = async () => {
    await api("/auth/demo", { method: "POST", body: {} });
    await refresh();
    setModal(null);
    navigate("home");
    setToast("Đã tạo tài khoản dùng thử riêng của bạn, kèm dữ liệu mẫu.");
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
    startDemo,
  };
  const title = pageTitles[page] || "Lá Cashback";
  return (
    <Context.Provider value={context}>
      <div className={"app-shell route-" + page}>
        {menuOpen && (
          <button
            className="sidebar-backdrop"
            aria-label="Đóng menu điều hướng"
            onClick={() => setMenuOpen(false)}
          />
        )}
        <aside
          className={"sidebar " + (menuOpen ? "is-open" : "")}
          inert={mobile && !menuOpen}
        >
          <Brand />
          <nav aria-label="Điều hướng chính">
            {primaryNavigation.map(([key, label, icon]) => (
              <button
                key={key}
                className={"nav-item " + (page === key ? "active" : "")}
                aria-current={page === key ? "page" : undefined}
                onClick={() => navigate(key)}
              >
                <Icon name={icon} />
                <span>{label}</span>
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
          <nav className="secondary-nav" aria-label="Khám phá Lá">
            {secondaryNavigation.map(([key, label, icon]) => (
              <button
                key={key}
                className={"nav-item " + (page === key ? "active" : "")}
                aria-current={page === key ? "page" : undefined}
                onClick={() => navigate(key)}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <button
              className="icon-button app-menu-button"
              aria-label="Mở menu điều hướng"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name="menu" />
            </button>
            <a
              className="mobile-brand"
              href="/"
              aria-label="Lá Cashback, trang giới thiệu"
            >
              <Icon name="leaf" /> lá cashback
            </a>
            <div className="top-actions">
              <button
                className="icon-button header-theme"
                aria-label="Đổi chế độ sáng tối"
                role="switch"
                aria-checked={theme === "dark"}
                title={
                  theme === "dark"
                    ? "Chuyển sang chế độ sáng"
                    : "Chuyển sang chế độ tối"
                }
                onClick={() =>
                  setTheme((v) => (v === "dark" ? "light" : "dark"))
                }
              >
                <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
              </button>
              <span className="demo-pill">
                <span />
                DEMO
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
          <main
            className={
              "main-content " +
              ([
                "deals",
                "blog",
                "admin",
                "faq",
                "help",
                "contact",
                "feedback",
              ].includes(page)
                ? "wide-content"
                : "narrow-content")
            }
          >
            {!["home", "demo"].includes(page) && (
              <div className="page-heading">
                <h1>{title}</h1>
                {page === "admin" && <Badge>CHỈ QUẢN TRỊ VIÊN</Badge>}
              </div>
            )}
            {page === "home" ? (
              <Home />
            ) : page === "feed" ? (
              <Feed />
            ) : page === "ranking" ? (
              <Leaderboard />
            ) : ["help", "faq"].includes(page) ? (
              <FAQ support={page === "help"} />
            ) : page === "blog" ? (
              <Blog />
            ) : ["contact", "feedback"].includes(page) ? (
              <Contact feedback={page === "feedback"} />
            ) : page === "legal" ? (
              <Legal />
            ) : page === "links" ? (
              <div className="link-page">
                <section className="panel composer-reference">
                  <h2>Dán link để hoàn tiền</h2>
                  <LinkBox />
                  {boot.user && <LinkHistory />}
                </section>
                <PromoCarousel />
              </div>
            ) : page === "deals" ? (
              <Deals />
            ) : page === "demo" ? (
              <DemoShop />
            ) : page === "try" ? (
              <Loading />
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
              <ProfileHub />
            ) : page === "settings" ? (
              <Profile />
            ) : [
                "checkin",
                "membership",
                "referrals",
                "gifts",
                "rewards",
              ].includes(page) ? (
              <MemberPage key={page} section={page} />
            ) : page === "admin" && boot.user.role === "admin" ? (
              <Admin />
            ) : (
              <Empty title="Trang không tồn tại" />
            )}
          </main>
          <PageFooter />
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
  const { boot, navigate } = useApp();
  return (
    <div className="home-dashboard reference-home">
      <Identity />
      <QuickActions />
      <section
        className="panel composer-reference"
        aria-labelledby="shopping-title"
      >
        <h1 id="shopping-title">Tạo link hoàn tiền</h1>
        <div className="merchant-icons">
          <span className="merchant-tile" title="Shopee mô phỏng">
            <span className="shopee-mini">S</span>
          </span>
          <span className="merchant-coming">Sàn khác · Sắp có</span>
        </div>
        <LinkBox />
        {boot.user && <LinkHistory />}
      </section>
      <PromoCarousel />
      <div className="home-ranking">
        <Leaderboard />
      </div>
      <section className="panel discovery-reference">
        <div className="section-heading">
          <h2>Khám phá ưu đãi</h2>
          <button className="text-button" onClick={() => navigate("deals")}>
            Xem tất cả <Icon name="arrow" size={15} />
          </button>
        </div>
        <div className="discovery-grid">
          {[
            ["Công nghệ", "Tai nghe", 0],
            ["Làm đẹp", "Chăm sóc da", 1],
            ["Thời trang", "Thời trang", 2],
          ].map(([category, label, index]) => (
            <button
              className="discovery-card"
              aria-label={label + " minh họa"}
              key={category}
              onClick={() => {
                sessionStorage.setItem("la-deal-category", category);
                navigate("deals");
              }}
            >
              <img
                src={"/images/category-" + index + "-400.webp"}
                alt=""
                width="400"
                height="400"
                loading="lazy"
              />
              <strong>{label}</strong>
              <small>Ưu đãi minh họa</small>
            </button>
          ))}
        </div>
      </section>
      <p className="home-demo-caption">
        Bản demo đề án · Đơn hàng và thanh toán mô phỏng
      </p>
    </div>
  );
}
function RecentOrders() {
  const { version, navigate } = useApp();
  const state = useData("/orders", version);
  return (
    <DataState state={state}>
      {(rows) =>
        rows.length ? (
          <div className="recent-orders">
            {rows.slice(0, 3).map((order) => (
              <button
                className="recent-order"
                key={order.id}
                onClick={() => navigate("orders")}
              >
                <span className="recent-order-icon">
                  <Icon name="bag" size={23} />
                </span>
                <span>
                  <strong>{order.title}</strong>
                  <Badge status={order.status} />
                </span>
                <Icon name="chevron" size={14} />
              </button>
            ))}
          </div>
        ) : (
          <div className="recent-empty">
            <Icon name="bag" size={30} />
            <p>Chưa có đơn hàng được ghi nhận.</p>
            <small>
              Đơn hàng sẽ xuất hiện sau khi nhận báo cáo từ nguồn đối soát.
            </small>
          </div>
        )
      }
    </DataState>
  );
}
const pendingLinkKey = "la-pending-link";
function LinkBox({ initialUrl = "" }) {
  const inputId = useId();
  const { boot, mutate, setModal, setToast } = useApp();
  const [value, setValue] = useState(initialUrl),
    [checked, setChecked] = useState(null),
    [created, setCreated] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const inspect = async (url) => {
    setBusy(true);
    setError("");
    try {
      setChecked(null);
      setCreated(null);
      const result = await api("/links/inspect", {
        method: "POST",
        body: { url },
      });
      const click = await mutate("/clicks", { url: result.url });
      setChecked(result);
      setCreated(click);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const check = (e) => {
    e.preventDefault();
    const problem = shopeeLinkError(value);
    if (problem) {
      setError(problem);
      return;
    }
    if (!boot.user) {
      // Giữ link để tự kiểm tra tiếp sau khi đăng nhập, không bắt dán lại.
      sessionStorage.setItem(pendingLinkKey, value.trim());
      setModal("auth");
      return;
    }
    inspect(value.trim());
  };
  useEffect(() => {
    const pending = sessionStorage.getItem(pendingLinkKey);
    if (!boot.user || !pending) return;
    sessionStorage.removeItem(pendingLinkKey);
    setValue(pending);
    inspect(pending);
  }, [boot.user?.id]);
  const buy = async () => {
    setBusy(true);
    setError("");
    try {
      const click = created || (await mutate("/clicks", { url: checked.url }));
      setToast("Đã tạo lượt theo dõi demo. Chưa có tiền hoàn được cộng.");
      location.assign(click.redirectUrl);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <div className="link-box">
      <label className="link-visible-label" htmlFor={inputId}>
        Dán link sản phẩm Shopee
      </label>
      <form onSubmit={check} noValidate>
        <div className="link-input">
          <Icon name="link" size={20} />
          <input
            id={inputId}
            aria-label="Link sản phẩm Shopee"
            aria-invalid={error ? true : undefined}
            type="url"
            inputMode="url"
            required
            placeholder="https://shopee.vn/..."
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setChecked(null);
              setCreated(null);
              setError("");
            }}
          />
          <button
            type="button"
            className="paste-link"
            aria-label="Dán link từ bộ nhớ tạm"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                setValue(text);
                setChecked(null);
                setCreated(null);
                setError("");
              } catch {
                setToast("Hãy nhấn giữ ô nhập hoặc dùng Ctrl+V để dán link.");
              }
            }}
          >
            <Icon name="copy" size={16} />
            Dán
          </button>
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
        Tiền hoàn được xác nhận sau khi đối soát.
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {checked && (
        <>
          {created && (
            <div className="created-link">
              <div className="section-heading">
                <strong>
                  <Icon name="check" size={17} /> Đã tạo link theo dõi demo
                </strong>
                <button
                  className="button compact"
                  onClick={() =>
                    copyText(location.origin + created.redirectUrl, setToast)
                  }
                >
                  <Icon name="copy" size={15} />
                  Sao chép
                </button>
              </div>
              <a href={created.redirectUrl}>
                {location.origin + created.redirectUrl}
              </a>
              <small>Link này mở cửa hàng mô phỏng của tài khoản bạn.</small>
            </div>
          )}
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
        </>
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
  const [q, setQ] = useState(
      () => new URLSearchParams(location.search).get("search") || "",
    ),
    [category, setCategory] = useState(() => {
      const value = sessionStorage.getItem("la-deal-category");
      sessionStorage.removeItem("la-deal-category");
      return value || "Tất cả";
    }),
    [saved, setSaved] = useState(false),
    [sort, setSort] = useState("relevance");
  const categories = ["Tất cả", ...new Set(boot.deals.map((d) => d.category))];
  const deals = boot.deals.filter(
    (d) =>
      (category === "Tất cả" || d.category === category) &&
      (!saved || d.saved) &&
      (d.title + " " + d.description + " " + d.code)
        .toLocaleLowerCase("vi")
        .includes(q.toLocaleLowerCase("vi")),
  );
  if (sort === "expiry")
    deals.sort((a, b) => a.expires_at.localeCompare(b.expires_at));
  if (sort === "title")
    deals.sort((a, b) => a.title.localeCompare(b.title, "vi"));
  return (
    <div className="reference-deals">
      <div className="search-input">
        <Icon name="search" />
        <input
          aria-label="Tìm ưu đãi"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nhập tên sản phẩm, ưu đãi hoặc mã giảm giá…"
        />
      </div>
      <div className="tabs deal-mode-tabs">
        <button
          className={!saved ? "active" : ""}
          onClick={() => setSaved(false)}
        >
          Deal hời
        </button>
        <button
          className={saved ? "active" : ""}
          onClick={() => setSaved(true)}
        >
          Đã lưu
        </button>
      </div>
      <div className="tabs deal-sort-tabs" aria-label="Sắp xếp ưu đãi">
        {[
          ["relevance", "Liên quan nhất"],
          ["expiry", "Sắp hết hạn"],
          ["title", "Tên A đến Z"],
        ].map(([v, t]) => (
          <button
            key={v}
            className={sort === v ? "active" : ""}
            onClick={() => setSort(v)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="deal-browser">
        <aside className="panel deal-filters">
          <h2>Bộ lọc</h2>
          <h3>Danh mục</h3>
          <div className="tabs deal-category-list">
            {categories.map((c) => (
              <button
                key={c}
                className={category === c ? "active" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
            />
            Ưu đãi đã lưu
          </label>
          <button
            className="button"
            onClick={() => {
              setQ("");
              setCategory("Tất cả");
              setSaved(false);
              setSort("relevance");
            }}
          >
            Xóa bộ lọc
          </button>
          <p className="microcopy">
            Nội dung minh họa cho đề án, chưa áp dụng khi mua sắm thật
          </p>
        </aside>
        <section>
          <p className="deal-result-count">{deals.length} ưu đãi minh họa</p>
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
        </section>
      </div>
    </div>
  );
}
function Orders() {
  const { version, setModal } = useApp();
  const [status, setStatus] = useState(() => {
      const value = sessionStorage.getItem("la-order-status") || "";
      sessionStorage.removeItem("la-order-status");
      return value;
    }),
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
                    <OrderTimeline order={o} />
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
function WithdrawForm({ available, minimum, bank, onSubmit }) {
  const inputId = useId();
  const [amount, setAmount] = useState(""),
    [confirming, setConfirming] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const value = Number(amount || 0);
  const choices = [
    [50000, money(50000)],
    [100000, money(100000)],
    [available, "Rút hết"],
  ].filter(
    ([n], i, all) =>
      n >= minimum && n <= available && all.findIndex(([m]) => m === n) === i,
  );
  const pick = (n) => {
    setAmount(String(n));
    setConfirming(false);
    setError("");
  };
  const review = (e) => {
    e.preventDefault();
    const problem = !value
      ? "Hãy nhập số tiền muốn rút."
      : available < minimum
        ? `Cần ít nhất ${money(minimum)} khả dụng để rút.`
        : value < minimum
          ? `Số tiền rút tối thiểu là ${money(minimum)}.`
          : value > available
            ? `Bạn chỉ có ${money(available)} có thể rút.`
            : "";
    setError(problem);
    setConfirming(!problem);
  };
  return (
    <form className="form withdraw-form" onSubmit={review} noValidate>
      <label className="field" htmlFor={inputId}>
        <span>Số tiền (VND)</span>
      </label>
      <div className="amount-input">
        <input
          id={inputId}
          inputMode="numeric"
          autoComplete="off"
          placeholder={
            "Ví dụ: " + new Intl.NumberFormat("vi-VN").format(minimum)
          }
          aria-invalid={error ? true : undefined}
          value={amount ? new Intl.NumberFormat("vi-VN").format(value) : ""}
          onChange={(e) => pick(digits(e.target.value).slice(0, 13))}
        />
        <span aria-hidden="true">đ</span>
      </div>
      {choices.length > 0 && (
        <div className="amount-chips" aria-label="Chọn nhanh số tiền">
          {choices.map(([n, label]) => (
            <button
              type="button"
              key={label}
              className={"chip " + (value === n ? "active" : "")}
              aria-pressed={value === n}
              onClick={() => pick(n)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <div role="alert" className="alert error">
          {error}
        </div>
      )}
      {confirming ? (
        <div
          className="withdraw-confirm"
          role="group"
          aria-label="Xác nhận rút tiền"
        >
          <p>
            Rút <b>{money(value)}</b> về {bank.label} ••••{" "}
            {bank.account.slice(-4)}. Số tiền này được giữ ngay khi gửi.
          </p>
          <div className="inline-actions">
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await onSubmit(value);
                  setAmount("");
                  setConfirming(false);
                } catch (err) {
                  setError(err.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? <span className="spinner" /> : "Xác nhận rút"}
            </button>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Sửa số tiền
            </button>
          </div>
        </div>
      ) : (
        <button className="button primary" type="submit">
          Gửi yêu cầu rút mô phỏng
        </button>
      )}
      <p className="microcopy">
        Duyệt yêu cầu chưa đồng nghĩa với đã thanh toán. Không có tiền thật được
        chuyển trong demo.
      </p>
    </form>
  );
}
// Các mốc của một đơn: đã qua (done), đang chờ (current) hoặc chưa tới.
function OrderTimeline({ order: o }) {
  const reviewed = o.status !== "pending";
  const steps = [
    ["Bấm link theo dõi", date(o.clicked_at), "done"],
    ["Đơn được ghi nhận", date(o.created_at), "done"],
    [
      o.status === "rejected" ? "Bị từ chối" : "Đối soát hoa hồng",
      reviewed ? date(o.updated_at) : "Đang chờ quản trị viên duyệt",
      reviewed ? (o.status === "rejected" ? "failed" : "done") : "current",
    ],
    [
      "Có thể rút",
      o.status !== "approved"
        ? "Chưa đủ điều kiện"
        : o.released
          ? "Đã chuyển sang số dư khả dụng"
          : "Dự kiến " + date(o.available_at),
      o.status !== "approved" ? "" : o.released ? "done" : "current",
    ],
  ];
  return (
    <ol className="order-timeline" aria-label="Tiến trình đơn hàng">
      {steps.map(([label, detail, state]) => (
        <li key={label} className={state}>
          <span className="timeline-dot" aria-hidden="true" />
          <strong>{label}</strong>
          <small>{detail}</small>
        </li>
      ))}
    </ol>
  );
}
function Wallet() {
  const { boot, version, mutate, setToast, navigate } = useApp();
  const state = useData("/wallet", version);
  const key = useRef(crypto.randomUUID());
  const [tab, setTab] = useState(() => {
    const value = sessionStorage.getItem("la-wallet-tab") || "withdrawals";
    sessionStorage.removeItem("la-wallet-tab");
    return value;
  });
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
                  <WithdrawForm
                    available={data.balances.available}
                    minimum={data.policy.minimum_withdrawal}
                    bank={boot.user.bank}
                    onSubmit={async (amount) => {
                      await mutate("/withdrawals", {
                        amount,
                        requestKey: key.current,
                      });
                      key.current = crypto.randomUUID();
                      setToast("Đã giữ tiền cho yêu cầu rút.");
                    }}
                  />
                </>
              ) : (
                <>
                  <Empty title="Thêm ngân hàng mô phỏng" icon="wallet">
                    Cập nhật thông tin nhận tiền thử nghiệm trước khi yêu cầu
                    rút.
                  </Empty>
                  <button
                    className="button"
                    onClick={() => navigate("settings")}
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
                đến số dư khả dụng
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
  const { boot, mutate, setModal, navigate } = useApp();
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
          <LogoutButton />
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
              {boot.publicDemo
                ? "Bản demo trực tuyến chưa hỗ trợ đặt lại mật khẩu qua email. Liên hệ chủ đề án nếu cần hỗ trợ tài khoản."
                : "Nếu cần đặt lại mật khẩu, dùng “Quên mật khẩu” tại màn hình đăng nhập. Bản cục bộ hiển thị mã thử ngay trên màn hình."}
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
  const { boot, setModal, refresh, setToast, startDemo } = useApp();
  const [mode, setMode] = useState("login"),
    [resetToken, setResetToken] = useState("");
  const [demo, setDemo] = useState("user");
  const [starting, setStarting] = useState(false);
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
      <div className="quick-try">
        <div>
          <strong>Dùng thử ngay, không cần đăng ký</strong>
          <span>Tài khoản riêng của bạn, có sẵn đơn và số dư mẫu.</span>
        </div>
        <button
          type="button"
          className="button primary"
          disabled={starting}
          onClick={async () => {
            setStarting(true);
            try {
              await startDemo();
            } catch (e) {
              setToast(e.message);
              setStarting(false);
            }
          }}
        >
          {starting ? <span className="spinner" /> : "Dùng thử ngay"}
        </button>
      </div>
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
            {boot.publicDemo && demo === "admin"
              ? "Mật khẩu quản trị do chủ đề án cung cấp riêng."
              : (demo === "admin" ? "admin" : "ban") +
                "@demo.local · Mật khẩu: Demo@123456"}
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
            defaultValue={
              mode === "login" && !(boot.publicDemo && demo === "admin")
                ? "Demo@123456"
                : ""
            }
            required
            minLength={10}
            maxLength={128}
          />
        </Form>
      ) : (
        <>
          {boot.publicDemo && (
            <p className="alert">
              Bản demo online chưa có dịch vụ email. Bạn có thể đăng ký tài
              khoản thử mới; không nhập thông tin thật.
            </p>
          )}
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
        <Icon name="shield" size={13} /> Bản demo học tập. Chỉ sử dụng thông tin
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
              setToast(
                "Đã gửi yêu cầu. Xem phản hồi trong Cá nhân → Thông tin cá nhân.",
              );
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
        Thử một lần mua
        <br />
        Hiểu cả hành trình
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
