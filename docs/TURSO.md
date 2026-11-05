# Lưu dữ liệu demo miễn phí trên Turso

Phạm vi Lá là demo đề án: sản phẩm, đơn, hoa hồng, ngân hàng và thanh toán đều mô phỏng. Kết nối affiliate thật và chi tiền thật nằm ngoài phạm vi. Turso chỉ thay nơi lưu dữ liệu, không thay đổi quy tắc mô phỏng.

## Cấu hình

1. Tạo tài khoản Free và database **libSQL** ở Turso. Không bật Overages hoặc nâng cấp gói.
2. Database Overview → Create Token → quyền đọc/ghi. Giữ token riêng, không gửi chat hoặc commit Git.
3. Render → Web Service `la-cashback-demo` → Environment → Edit → Add Environment Variable.
4. Key `TURSO_DATABASE_URL`, Value là URL `libsql://...turso.io` của database.
5. Key `TURSO_AUTH_TOKEN`, Value là token vừa tạo. Không dùng tiền tố `VITE_`.
6. Giữ nguyên `DEMO_MODE=true`, `PUBLIC_DEMO=true`, `COOKIE_SECURE=true` và mật khẩu quản trị riêng hiện có. Lưu và deploy sau khi CI đạt.

Backend ưu tiên Turso khi có đủ hai biến. Thiếu một biến hoặc kết nối/migration lỗi sẽ dừng khởi động, không tự tạo SQLite khác. Khi không cấu hình cả hai, backend dùng SQLite như cũ. Chỉ chạy một instance app cho bản demo.

Lần đầu kết nối một database trống, ứng dụng tự chạy migration và tạo tài khoản mẫu. Lần sau không seed lại hoặc ghi đè người dùng. Đây là database demo mới; dữ liệu từng lưu trên filesystem tạm của Render không tự chuyển sang Turso. Giữ nguyên `DEMO_ADMIN_PASSWORD` qua mỗi lần cập nhật vì mật khẩu đã băm nằm trong DB lâu dài.

## Kiểm tra

- `/api/bootstrap` trả `storage: "turso"`, `ephemeralData: false`.
- Đăng ký người dùng thử, tạo đơn và đối soát; ghi lại số dư.
- Redeploy rồi đăng nhập lại: tài khoản, đơn và số dư còn nguyên.
- CI chạy bộ nghiệp vụ bằng cả Node SQLite và driver libSQL. Docker smoke dùng libSQL server riêng, xóa/tạo lại container ứng dụng và kiểm tra dữ liệu, phiên cùng yêu cầu rút không ghi trùng.
- Tạo tài khoản dùng thử trên Turso chạy ở worker riêng. Worker tạo dữ liệu bằng các quy tắc nghiệp vụ trong SQLite bộ nhớ, rồi chèn gộp vào Turso trong một transaction, giảm số lượt gọi mạng và không chặn HTTP/health check. Không sao chép dữ liệu của người mua khác.
- Token hết hạn hoặc bị thu hồi: tạo token mới rồi cập nhật biến Render. Tài khoản và dữ liệu vẫn nằm trong database Turso.

## Sao lưu khi trình diễn

Turso Overview → Export Database → Download SQLite File. Lưu riêng, không đưa file vào repository công khai. Gói Free có hạn mức; theo dõi Usage trước buổi báo cáo. Đây là lưu trữ dữ liệu demo, không phải cam kết vận hành thương mại.

Tài liệu: [Turso Free](https://turso.tech/pricing), [Quickstart](https://docs.turso.tech/quickstart), [driver libSQL](https://github.com/tursodatabase/libsql-js).
