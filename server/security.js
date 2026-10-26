import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export const token = () => randomBytes(32).toString("hex");
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export function passwordHash(value) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(value, salt, 64).toString("hex")}`;
}
export function passwordMatches(value, stored) {
  try {
    const [salt, key] = stored.split(":");
    const a = Buffer.from(key, "hex");
    const b = scryptSync(String(value), salt, 64);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function ensure(value, message, status = 400) {
  if (!value) throw new AppError(message, status);
}
export function textInput(value, label, max = 500, min = 1) {
  ensure(
    typeof value === "string" &&
      value.trim().length >= min &&
      value.trim().length <= max,
    `${label}: cần từ ${min} đến ${max} ký tự.`,
  );
  return value.trim();
}
export function integer(value, label, min = 0, max = 1_000_000_000_000) {
  ensure(
    Number.isSafeInteger(value) && value >= min && value <= max,
    `${label} phải là số nguyên từ ${min} đến ${max}.`,
  );
  return value;
}
export function isoDate(value, label) {
  ensure(
    typeof value === "string" &&
      /^\d{4}-\d\d-\d\dT/.test(value) &&
      Number.isFinite(Date.parse(value)),
    `${label} không hợp lệ.`,
  );
  return new Date(value).toISOString();
}
export function shopeeUrl(value) {
  ensure(
    typeof value === "string" && value.length <= 2048,
    "Link không hợp lệ.",
  );
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new AppError(
      "Hãy dán đường dẫn Shopee đầy đủ, bắt đầu bằng https://.",
    );
  }
  ensure(
    url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      ["shopee.vn", "www.shopee.vn", "s.shopee.vn", "shp.ee"].includes(
        url.hostname,
      ),
    "Chỉ hỗ trợ link HTTPS từ shopee.vn, s.shopee.vn hoặc shp.ee.",
  );
  ensure(url.pathname !== "/", "Hãy dùng link sản phẩm cụ thể.");
  url.hash = "";
  return url.toString();
}
export function rateLimit(db, key, limit, seconds) {
  const time = Date.now();
  const row = db.prepare("SELECT * FROM rate_limits WHERE key=?").get(key);
  if (row && row.expires_at > time) {
    ensure(
      row.count < limit,
      "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
      429,
    );
    db.prepare("UPDATE rate_limits SET count=count+1 WHERE key=?").run(key);
  } else
    db.prepare(
      "INSERT INTO rate_limits VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count, expires_at=excluded.expires_at",
    ).run(key, 1, time + seconds * 1000);
  db.prepare("DELETE FROM rate_limits WHERE expires_at < ?").run(
    time - 86400000,
  );
}
