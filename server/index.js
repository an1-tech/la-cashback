import { openDb } from "./db.js";
import { seed } from "./seed.js";
import { createApp } from "./app.js";
if (process.env.DEMO_MODE === "false")
  throw new Error(
    "Chưa có adapter đã xác minh cho vận hành thật. Bản này chỉ cho phép demo.",
  );
const db = openDb();
seed(db);
const host = process.env.HOST || "127.0.0.1",
  port = Number(process.env.PORT || 3080);
const server = createApp(db, {
  secureCookie: process.env.COOKIE_SECURE === "true",
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(port, host, () =>
  console.log(
    `Lá Cashback DEMO: http://${host}:${port} · không kết nối Shopee hoặc ngân hàng`,
  ),
);
function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
