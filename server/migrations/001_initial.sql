CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
 password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked')),
 bank_label TEXT, bank_account TEXT, bank_holder TEXT, bank_changed_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reset_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL, used_at TEXT);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS policies (
 id TEXT PRIMARY KEY, version INTEGER NOT NULL UNIQUE, share_bps INTEGER NOT NULL CHECK(share_bps BETWEEN 0 AND 10000),
 hold_days INTEGER NOT NULL CHECK(hold_days BETWEEN 0 AND 365), minimum_withdrawal INTEGER NOT NULL CHECK(minimum_withdrawal > 0),
 effective_at TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'shopee' CHECK(scope='shopee'), created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS clicks (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), policy_id TEXT NOT NULL REFERENCES policies(id),
 provider TEXT NOT NULL DEFAULT 'demo', url TEXT NOT NULL, product_name TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY, external_id TEXT NOT NULL, item_id TEXT NOT NULL, click_id TEXT NOT NULL REFERENCES clicks(id),
 user_id TEXT NOT NULL REFERENCES users(id), policy_id TEXT NOT NULL REFERENCES policies(id), title TEXT NOT NULL,
 order_value INTEGER NOT NULL CHECK(order_value >= 0), commission INTEGER NOT NULL CHECK(commission >= 0), cashback INTEGER NOT NULL CHECK(cashback >= 0),
 status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')), reason TEXT,
 available_at TEXT, released INTEGER NOT NULL DEFAULT 0 CHECK(released IN (0,1)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(external_id,item_id)
);
CREATE TABLE IF NOT EXISTS provider_events (
 event_id TEXT PRIMARY KEY, payload_hash TEXT NOT NULL, payload TEXT NOT NULL, order_id TEXT REFERENCES orders(id),
 state TEXT NOT NULL CHECK(state IN ('processed','unmatched')), created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS journals (
 id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL REFERENCES users(id),
 description TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ledger (
 id INTEGER PRIMARY KEY AUTOINCREMENT, journal_id TEXT NOT NULL REFERENCES journals(id), user_id TEXT NOT NULL REFERENCES users(id),
 account TEXT NOT NULL CHECK(account IN ('pending','locked','available','held','paid','clearing')), amount INTEGER NOT NULL CHECK(typeof(amount)='integer' AND amount != 0), created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_user_account ON ledger(user_id,account);
CREATE TABLE IF NOT EXISTS withdrawals (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), amount INTEGER NOT NULL CHECK(amount > 0),
 status TEXT NOT NULL CHECK(status IN ('requested','approved','rejected','failed','paid')), request_key TEXT NOT NULL,
 bank_snapshot TEXT NOT NULL, reason TEXT, payment_reference TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(user_id,request_key)
);
CREATE TABLE IF NOT EXISTS deals (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, code TEXT,
 expires_at TEXT NOT NULL, url TEXT NOT NULL, conditions TEXT NOT NULL, accent TEXT NOT NULL DEFAULT 'mint', active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS saved_deals (user_id TEXT NOT NULL REFERENCES users(id), deal_id TEXT NOT NULL REFERENCES deals(id), PRIMARY KEY(user_id,deal_id));
CREATE TABLE IF NOT EXISTS content (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, body TEXT NOT NULL, read_at TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), order_id TEXT REFERENCES orders(id), subject TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')), response TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, reference TEXT NOT NULL, details TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS orders_user_date ON orders(user_id,created_at);
CREATE TRIGGER IF NOT EXISTS ledger_no_update BEFORE UPDATE ON ledger BEGIN SELECT RAISE(ABORT,'Ledger is append-only'); END;
CREATE TRIGGER IF NOT EXISTS ledger_no_delete BEFORE DELETE ON ledger BEGIN SELECT RAISE(ABORT,'Ledger is append-only'); END;
CREATE TRIGGER IF NOT EXISTS journals_no_update BEFORE UPDATE ON journals BEGIN SELECT RAISE(ABORT,'Journal is append-only'); END;
CREATE TRIGGER IF NOT EXISTS journals_no_delete BEFORE DELETE ON journals BEGIN SELECT RAISE(ABORT,'Journal is append-only'); END;
CREATE TRIGGER IF NOT EXISTS policies_no_update BEFORE UPDATE ON policies BEGIN SELECT RAISE(ABORT,'Policy is immutable'); END;
CREATE TRIGGER IF NOT EXISTS policies_no_delete BEFORE DELETE ON policies BEGIN SELECT RAISE(ABORT,'Policy is immutable'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_logs BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_logs BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;
