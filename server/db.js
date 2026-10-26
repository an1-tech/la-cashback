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
export function transaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
