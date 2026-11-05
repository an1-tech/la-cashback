import { DatabaseSync } from "node:sqlite";
import Libsql from "libsql";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
export const now = () => new Date().toISOString();
const remoteDatabases = new WeakSet();
export const isRemoteDb = (db) => remoteDatabases.has(db);
export const isSqliteError = (error) =>
  /^(ERR_SQLITE|SQLITE_)/.test(String(error.code));
export function databaseLocation(env = process.env) {
  const url = env.TURSO_DATABASE_URL?.trim();
  const authToken = env.TURSO_AUTH_TOKEN?.trim();
  if (url || authToken) {
    if (!url || !authToken)
      throw new Error("Cần cả TURSO_DATABASE_URL và TURSO_AUTH_TOKEN.");
    const parsed = new URL(url);
    const localTest =
      parsed.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(parsed.hostname);
    if (
      (!localTest && !["libsql:", "https:"].includes(parsed.protocol)) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    )
      throw new Error(
        "TURSO_DATABASE_URL phải là URL libsql:// hoặc HTTPS hợp lệ.",
      );
    return url;
  }
  return env.DATABASE_PATH || "./data/cashback.sqlite";
}
export function openDb(path = databaseLocation()) {
  const remote = /^(libsql|https?):\/\//.test(path);
  if (!remote && path !== ":memory:")
    mkdirSync(dirname(resolve(path)), { recursive: true });
  let db;
  try {
    db =
      remote || process.env.SQLITE_DRIVER === "libsql"
        ? new Libsql(
            path,
            remote ? { authToken: process.env.TURSO_AUTH_TOKEN?.trim() } : {},
          )
        : new DatabaseSync(path);
    if (remote) remoteDatabases.add(db);
    db.exec(
      remote
        ? "PRAGMA foreign_keys=ON;"
        : "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;",
    );
    db.exec(
      "CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
    );
    const folder = fileURLToPath(new URL("./migrations/", import.meta.url));
    for (const name of readdirSync(folder)
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      if (!db.prepare("SELECT 1 FROM migrations WHERE name=?").get(name)) {
        transaction(db, () => {
          db.exec(readFileSync(resolve(folder, name), "utf8"));
          db.prepare("INSERT INTO migrations VALUES (?,?)").run(name, now());
        });
      }
    }
    return db;
  } catch (error) {
    db?.close();
    // Không khởi tạo DB local thay thế khi dịch vụ từ xa lỗi; tránh hai bộ dữ liệu khác nhau.
    if (remote)
      throw new Error(
        "Không thể mở hoặc migration Turso. Kiểm tra URL, token, trạng thái database và quyền đọc/ghi.",
      );
    throw error;
  }
}
// Độ sâu transaction theo từng kết nối: lời gọi lồng nhau dùng SAVEPOINT,
// nên một thao tác gồm nhiều bước nghiệp vụ vẫn hoàn tác trọn vẹn khi lỗi.
const depth = new WeakMap();
export function transaction(db, fn) {
  const level = depth.get(db) || 0;
  const savepoint = `sp_${level}`;
  db.exec(level ? `SAVEPOINT ${savepoint}` : "BEGIN IMMEDIATE");
  depth.set(db, level + 1);
  try {
    const result = fn();
    db.exec(level ? `RELEASE ${savepoint}` : "COMMIT");
    return result;
  } catch (error) {
    db.exec(
      level ? `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}` : "ROLLBACK",
    );
    throw error;
  } finally {
    depth.set(db, level);
  }
}
