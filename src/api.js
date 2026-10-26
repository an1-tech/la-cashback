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
  if (!response.ok)
    throw new Error(result.error || "Không thể kết nối. Vui lòng thử lại.");
  return result;
}
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
