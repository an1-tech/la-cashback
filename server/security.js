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
  // `reason` là mã máy đọc được, giúp client phân biệt các lỗi cùng mã HTTP.
  constructor(message, status = 400, reason) {
    super(message);
    this.status = status;
    this.reason = reason;
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
export function idInput(value, label = "Mã") {
  ensure(
    typeof value === "string" && value.length >= 1 && value.length <= 100,
    `${label} không hợp lệ.`,
  );
  return value;
}
export function optionalText(value, label, max = 500) {
  if (value === undefined || value === null || value === "") return "";
  return textInput(value, label, max);
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
      [
        "shopee.vn",
        "www.shopee.vn",
        "s.shopee.vn",
        "shp.ee",
        "vn.shp.ee",
      ].includes(url.hostname),
    "Chỉ hỗ trợ link HTTPS từ shopee.vn, s.shopee.vn hoặc shp.ee.",
  );
  ensure(url.pathname !== "/", "Hãy dùng link sản phẩm cụ thể.");
  url.hash = "";
  return url.toString();
}
export function rateCheck(db, key, limit) {
  const row = db.prepare("SELECT * FROM rate_limits WHERE key=?").get(key);
  ensure(
    !row || row.expires_at <= Date.now() || row.count < limit,
    "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
    429,
  );
}
export function rateHit(db, key, seconds) {
  const time = Date.now();
  db.prepare(
    "INSERT INTO rate_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at>? THEN count+1 ELSE 1 END, expires_at=CASE WHEN expires_at>? THEN expires_at ELSE excluded.expires_at END",
  ).run(key, time + seconds * 1000, time, time);
  db.prepare("DELETE FROM rate_limits WHERE expires_at < ?").run(
    time - 86400000,
  );
}
export function rateClear(db, key) {
  db.prepare("DELETE FROM rate_limits WHERE key=?").run(key);
}
export function rateLimit(db, key, limit, seconds) {
  rateCheck(db, key, limit);
  rateHit(db, key, seconds);
}
