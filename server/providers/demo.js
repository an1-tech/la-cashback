import { shopeeUrl } from "../security.js";
// Contract nội bộ, không phải API/field chính thức của Shopee. Không gọi mạng, không resolve short URL.
export const demoProvider = {
  id: "demo",
  inspect(url) {
    return {
      url: shopeeUrl(url),
      title: null,
      image: null,
      estimate: null,
      message:
        "Chưa xác định. Demo không đọc dữ liệu sản phẩm hoặc tạo link affiliate thật.",
    };
  },
  createLink(clickId) {
    return {
      trackingId: clickId,
      redirectUrl: `/demo-shop?click=${encodeURIComponent(clickId)}`,
      simulated: true,
    };
  },
};
