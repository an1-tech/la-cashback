let csrf = "";
export function setCsrf(value) {
  csrf = value || "";
}
export async function api(path, { method = "GET", body } = {}) {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers:
      method === "GET"
        ? {}
        : { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  // Phiên hết hạn hoặc máy chủ demo vừa tạo lại dữ liệu: báo cho App để đăng xuất giao diện.
  // Các 401 khác, như sai mật khẩu xác nhận ngân hàng, chỉ hiện lỗi tại form.
  if (response.status === 401 && result.reason === "auth_required")
    window.dispatchEvent(new Event("la:unauthorized"));
  if (!response.ok)
    throw new Error(result.error || "Không thể kết nối. Vui lòng thử lại.");
  return result;
}
export const pageTitles = {
  home: "Trang chủ",
  orders: "Đơn hàng của bạn",
  deals: "Ưu đãi",
  wallet: "Số dư & rút tiền",
  profile: "Tài khoản của bạn",
  admin: "Không gian quản trị",
  demo: "Cửa hàng mô phỏng",
  feed: "Bảng tin Lá",
  links: "Tạo link hoàn tiền",
  settings: "Cài đặt tài khoản",
  help: "Hỏi đáp & hỗ trợ",
  checkin: "Điểm danh mỗi ngày",
  membership: "Hạng thành viên",
  referrals: "Giới thiệu bạn bè",
  ranking: "Bảng xếp hạng",
  gifts: "Mã quà tặng",
  rewards: "Phần thưởng của tôi",
  try: "Dùng thử",
};
// "#admin/orders?x=1" → "admin"; phần sau dấu "/" là tab con của trang.
export function currentPage() {
  if (location.pathname === "/demo-shop") return "demo";
  return location.hash.slice(1).split(/[?/]/)[0] || "home";
}
const allowedHosts = ["shopee.vn", "www.shopee.vn", "s.shopee.vn", "shp.ee"];
// Kiểm tra sớm ở trình duyệt; máy chủ vẫn kiểm tra lại bằng shopeeUrl().
export function shopeeLinkError(value) {
  const text = value.trim();
  if (!text) return "Hãy dán link sản phẩm Shopee.";
  let url;
  try {
    url = new URL(text);
  } catch {
    return "Hãy dán đường dẫn Shopee đầy đủ, bắt đầu bằng https://.";
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !allowedHosts.includes(url.hostname)
  )
    return "Chỉ hỗ trợ link HTTPS từ shopee.vn, s.shopee.vn hoặc shp.ee.";
  if (url.pathname === "/") return "Hãy dùng link sản phẩm cụ thể.";
  return "";
}
export const digits = (value) => String(value).replace(/\D/g, "");
export const money = (n) =>
  new Intl.NumberFormat("vi-VN").format(n ?? 0) + " đ";
export const date = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export const statusLabels = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
  requested: "Đã gửi yêu cầu",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
  open: "Đang xử lý",
  closed: "Đã phản hồi",
};
