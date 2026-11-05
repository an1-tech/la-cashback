import { openDb, now, transaction } from "./db.js";
import { currentPolicy } from "./finance.js";
import { createSandboxAccount } from "./seed.js";
import { ensure } from "./security.js";

// Only generated sample data goes through this serializer. Identifiers below
// are server constants; values are SQLite literals, never executable input.
function literal(value) {
  if (value === null) return "NULL";
  if (typeof value === "number" && Number.isSafeInteger(value))
    return String(value);
  ensure(
    typeof value === "string" && !value.includes("\0"),
    "Dữ liệu mẫu không hợp lệ.",
    500,
  );
  return "'" + value.replaceAll("'", "''") + "'";
}

export function createBatchedSandbox(target) {
  const actor = target
    .prepare("SELECT id FROM users WHERE role='admin' LIMIT 1")
    .get();
  const policy = currentPolicy(target);
  ensure(actor && policy, "Demo chưa sẵn sàng. Vui lòng thử lại.", 503);
  const local = openDb(":memory:");
  try {
    // This stub only satisfies local audit foreign keys; it is never exported.
    local
      .prepare(
        "INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
      )
      .run(
        actor.id,
        "local-actor@demo.local",
        "Quản trị mẫu",
        "unused",
        "admin",
        now(),
      );
    const policyColumns = local
      .prepare("PRAGMA table_info(policies)")
      .all()
      .map((c) => c.name);
    local
      .prepare(
        `INSERT INTO policies (${policyColumns.join(",")}) VALUES (${policyColumns.map(() => "?").join(",")})`,
      )
      .run(...policyColumns.map((c) => policy[c]));
    // Reuse the tested financial rules rather than manufacture ledger entries.
    const uid = createSandboxAccount(local);
    const statements = [];
    const tables = [
      ["users", "id=?"],
      ["clicks", "user_id=?"],
      ["orders", "user_id=?"],
      [
        "provider_events",
        "order_id IN (SELECT id FROM orders WHERE user_id=?)",
      ],
      ["journals", "user_id=?"],
      ["ledger", "user_id=?"],
      ["withdrawals", "user_id=?"],
      ["notifications", "user_id=?"],
      ["audit_logs", "actor_id=?"],
    ];
    for (const [table, where] of tables) {
      const rows = local
        .prepare(`SELECT * FROM ${table} WHERE ${where}`)
        .all(table === "audit_logs" ? actor.id : uid);
      for (const row of rows) {
        // Let the destination allocate ledger's global autoincrement IDs.
        const columns = local
          .prepare(`PRAGMA table_info(${table})`)
          .all()
          .map((c) => c.name)
          .filter((c) => table !== "ledger" || c !== "id");
        statements.push(
          `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map((c) => literal(row[c])).join(",")});`,
        );
      }
    }
    transaction(target, () => target.exec(statements.join("\n")));
    return uid;
  } finally {
    local.close();
  }
}
