import React, { useEffect, useState } from "react";
import { api, money } from "../api";
import "./landing.css";
import LandingView from "./LandingView";

// Kịch bản ví dụ cố định; tỷ lệ chia, thời gian chờ và mức rút lấy từ chính sách hiện hành.
const exampleOrder = 450000,
  exampleCommission = 25000;
function faqFor(policy, unavailable) {
  return [
    [
      "Lá có phải Shopee không?",
      "Không. Đây là bản demo học tập, chưa kết nối Shopee. Cửa hàng và đơn hàng đều là mô phỏng.",
    ],
    [
      "Khi nào tiền hoàn được rút?",
      policy
        ? (policy.hold_days
            ? `Sau khi quản trị viên duyệt hoa hồng, khoản hoàn chờ thêm ${policy.hold_days} ngày rồi chuyển sang Có thể rút.`
            : "Sau khi quản trị viên duyệt hoa hồng, khoản hoàn chuyển ngay sang Có thể rút.") +
          ` Mức rút tối thiểu hiện là ${money(policy.minimum_withdrawal)}.`
        : unavailable
          ? "Chưa tải được chính sách rút tiền. Vui lòng thử lại để xem mức rút tối thiểu và thời gian chờ đang áp dụng."
          : "Đang tải mức rút tối thiểu và thời gian chờ đang áp dụng.",
    ],
    [
      "Có dùng tiền thật không?",
      "Không. Ngân hàng, voucher và thanh toán đều là dữ liệu thử nghiệm. Không nhập thông tin thật.",
    ],
  ];
}

export function Landing() {
  const [policy, setPolicy] = useState(null);
  const [policyState, setPolicyState] = useState("loading");
  const loadPolicy = async () => {
    setPolicyState("loading");
    try {
      const data = await api("/bootstrap");
      if (!data.policy) throw new Error("Chưa có chính sách");
      setPolicy(data.policy);
      setPolicyState("ready");
    } catch {
      setPolicy(null);
      setPolicyState("error");
    }
  };
  useEffect(() => {
    loadPolicy();
  }, []);
  // Cùng công thức với máy chủ: làm tròn xuống đến 1 đồng.
  const cashback = policy
    ? Math.floor((exampleCommission * policy.share_bps) / 10000)
    : null;
  const example = [
    ["Giá trị đơn", money(exampleOrder)],
    ["Hoa hồng nguồn báo về", money(exampleCommission)],
    [
      "Lá chia cho bạn",
      policy ? policy.share_bps / 100 + "%" : "Chưa xác định",
    ],
  ];
  const faq = faqFor(policy, policyState === "error");
  return (
    <LandingView
      policyState={policyState}
      loadPolicy={loadPolicy}
      example={example}
      cashbackLabel={cashback === null ? "Chưa xác định" : money(cashback)}
      faq={faq}
    />
  );
}
