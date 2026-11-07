import React, { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Icon, Loading } from "./components";
import "./styles.css";
import { Assistant } from "./Assistant";
document.documentElement.dataset.theme =
  localStorage.getItem("la-theme") || "dark";
const App = lazy(() => import("./App"));
const Landing = lazy(() =>
  import("./pages/Landing").then((m) => ({ default: m.Landing })),
);
function isLanding() {
  return (
    location.pathname === "/" &&
    (!location.hash || location.hash.startsWith("#landing-"))
  );
}

function NotFound() {
  useEffect(() => {
    document.title = "Không tìm thấy trang · Lá Cashback";
  }, []);
  return (
    <main className="startup-error not-found">
      <Icon name="leaf" size={40} />
      <h1>Không tìm thấy trang này</h1>
      <p>Đường dẫn có thể đã đổi hoặc bị gõ nhầm.</p>
      <div className="inline-actions">
        <a className="button primary" href="/app">
          Mở ứng dụng
        </a>
        <a className="button" href="/">
          Về trang giới thiệu
        </a>
      </div>
    </main>
  );
}
const knownPaths = ["/", "/app", "/demo-shop", "/index.html"];
function Site() {
  const [showLanding, setShowLanding] = useState(isLanding);
  useEffect(() => {
    const syncRoute = () => setShowLanding(isLanding());
    window.addEventListener("hashchange", syncRoute);
    syncRoute();
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);
  if (!knownPaths.includes(location.pathname)) return <NotFound />;
  return (
    <>
      <Suspense
        fallback={
          <div className="startup-error">
            <Loading />
          </div>
        }
      >
        {showLanding ? <Landing /> : <App />}
      </Suspense>
      <Assistant appPage={!showLanding} />
    </>
  );
}

createRoot(document.getElementById("root")).render(<Site />);
