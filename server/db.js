import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
export const now = () => new Date().toISOString();
export function openDb(
  path = process.env.DATABASE_PATH || "./data/cashback.sqlite",
) {
  if (path !== ":memory:")
    mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;",
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
