# Kết quả xác minh — 26/10/2026

Môi trường thực tế: Windows, Node.js 24.21.0, React/React DOM 19.3.1, Vite 7.3.7, SQLite tích hợp Node, Playwright 1.64.1, Chromium có sẵn trên máy. Mọi giao dịch kiểm thử đều là dữ liệu giả, không có yêu cầu tới Shopee hoặc ngân hàng.

## Kết quả

| Lệnh              | Kết quả                                                                               |
| ----------------- | ------------------------------------------------------------------------------------- |
| `npm test`        | **22 passed, 0 failed**                                                               |
| `npm run test:ui` | **4 passed, 0 failed**                                                                |
| `npm run build`   | Thành công, 27 modules, JS ~294,53 KB (~87,56 KB gzip), CSS ~39,03 KB (~8,43 KB gzip) |
| `npm run migrate` | Áp dụng 001_initial.sql và 002_order_estimate.sql                                     |

Các phụ thuộc được khóa trong `package-lock.json`; `npm ci` tái tạo đúng phiên bản.

## Nghiệp vụ và API đã kiểm tra

1. VND nguyên, tính bằng BigInt và làm tròn xuống, từ chối số thập phân.
2. Tạo lượt bấm không tạo số dư; tiền chờ duyệt không rút được.
3. Gửi lại cùng sự kiện/cùng đơn không cộng trùng; mã sự kiện trùng khác nội dung bị từ chối.
4. Từ chối hoa hồng xóa nghĩa vụ tiền chờ bằng bút toán, giữ lịch sử và lý do.
5. Chính sách mới không thay chính sách giao dịch cũ; tiền chưa đủ ngày vẫn bị khóa.
6. Yêu cầu rút idempotent, giữ tiền đúng, duyệt chưa có nghĩa là thanh toán.
7. Thanh toán lặp không chi trùng; mã thanh toán dùng cho yêu cầu khác bị rollback toàn bộ.
8. Từ chối/thất bại giải phóng tiền đúng một lần.
9. Thu hồi sau đã trả tạo số dư khả dụng âm và chặn rút mới, không xóa khoản đã thanh toán.
10. Thiếu clickId không gán người mua, không ghi tiền; gán sau kiểm chứng chỉ ghi một lần.
11. Điều chỉnh số dư và hoa hồng chỉ tạo bút toán chênh lệch có tham chiếu.
12. Duyệt lại sau thu hồi tạo chu kỳ khả dụng mới, giữ tiền dự kiến trước đó để đối chiếu.
13. Thu hồi khi đang giữ tiền chặn tiếp tục thanh toán; thất bại giải phóng tiền.
14. **Hai worker với hai kết nối SQLite cùng rút 70.000 đ từ một số dư 70.000 đ: chỉ một thành công.**
15. Whitelist URL chặn localhost, IP nội bộ, host giả, URL userinfo, HTTP và port không phù hợp.
16. Backend chặn truy cập dữ liệu người dùng khác, gọi API admin từ user, gắn hỗ trợ vào đơn người khác.
17. CSRF và Origin sai bị chặn; đổi ngân hàng cần mật khẩu và chỉ nhận dữ liệu giả; audit che tài khoản.
18. API hoàn chỉnh từ inspect/click qua đối soát đến thanh toán.
19. Nhập báo cáo kết quả riêng từng dòng: đúng, sai định dạng, unmatched và duplicate.
20. Đăng ký, sửa hồ sơ, hỗ trợ, lưu deal, đọc thông báo, reset dùng một lần và thu hồi phiên.
21. Trang chủ `/`, route `/demo-shop`, tài sản JS và HEAD được phục vụ; tài sản không tồn tại trả 404.
22. Rate limit tạo link; khóa tài khoản vô hiệu hóa phiên cũ.

Kiểm thử kiểm tra tổng các bút toán bằng 0 và các journal cân bằng trong các kịch bản tiền.

## Trình duyệt đã kiểm tra

- Desktop 1440 px: render React, đăng nhập mẫu, số dư từ API, dark/light, ví và sổ tiền; không có `pageerror` trong kịch bản này.
- Điện thoại: thanh điều hướng dưới, sáng/tối, lọc danh mục, lưu deal, đơn hàng. Đo `scrollWidth <= innerWidth` ở 320/360/390 px.
- Hai phiên trình duyệt: đăng ký người mua mới → inspect không có dữ liệu giả → tạo click → cửa hàng mô phỏng → đơn chờ 17.500 đ → quản trị xác nhận hoa hồng mới → thêm ngân hàng giả có xác thực → giữ tiền rút → quản trị duyệt → ghi nhận đã thanh toán → người mua tải lại thấy kết quả.
- Quản trị nhập JSON với dòng đúng, dòng hoa hồng thập phân, dòng chưa gán và dòng trùng; kết quả từng dòng vẫn hiển thị sau khi tải dữ liệu mới.

Các test UI tự dùng DB `:memory:` và cổng 3081, tách khỏi DB demo cục bộ tại cổng 3080.

## Ảnh xem trước

- [Desktop nền tối](screenshots/desktop-dark.png)
- [Desktop nền sáng](screenshots/desktop-light.png)
- [Trang chủ điện thoại](screenshots/mobile-home.png)
- [Đơn hàng điện thoại](screenshots/mobile-orders.png)
- [Quản trị thanh toán mô phỏng](screenshots/admin-withdrawals.png)

## Phạm vi chưa xác minh

Chưa chạy trên thiết bị iOS/Android thật hoặc Safari/Firefox; chưa kiểm thử tải lớn, crash recovery cấp hạ tầng, Docker, dịch vụ email, Shopee, ngân hàng, HTTPS production hoặc đánh giá bảo mật độc lập. Native browser/computer-use của Codex lỗi khởi tạo sandbox; QA ở trên dùng Playwright với Chromium local để kiểm tra ứng dụng do dự án tạo.

Đây là MVP demo có kiểm thử, chưa phải bằng chứng đủ điều kiện dùng tiền thật. Điều kiện chuyển thật: [PRODUCTION.md](PRODUCTION.md).
