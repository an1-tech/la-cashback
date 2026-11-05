# Hiệu năng demo

## Điểm nghẽn và thay đổi

Khi đọc trực tiếp qua Turso bằng driver đồng bộ, mỗi truy vấn SQL là một lượt đi mạng. Bootstrap, phiên đăng nhập và các trang có nhiều truy vấn cộng dồn độ trễ và giữ luồng HTTP trong lúc chờ.

Máy chủ ứng dụng dùng embedded replica của `libsql`: dữ liệu vẫn lưu ở Turso; file `data/replica-*.sqlite` chỉ là bản đọc có thể tái tạo. Mỗi yêu cầu API đồng bộ trước khi kiểm tra phiên/quyền; truy vấn đọc tiếp theo dùng trang cục bộ. Ghi và transaction ghi vẫn do primary xử lý, bật `readYourWrites`. Worker tạo tài khoản riêng dùng kết nối khác, nên máy chủ đồng bộ lại trước khi mở phiên cho tài khoản mới. Đồng bộ lỗi sẽ trả lỗi; không âm thầm dùng dữ liệu cũ để cấp quyền hay xác nhận giao dịch. Xem [API libSQL](https://github.com/tursodatabase/libsql-js/blob/main/docs/api.md).

Các GET bootstrap/ví không mở transaction ghi nếu không có khoản đến hạn. Migration 004 thêm chỉ mục cho đơn đến hạn, thông báo chưa đọc, rút tiền, lượt bấm và báo cáo. JSON không xuất trường nội bộ `_metadata` của driver. Header `Server-Timing` giúp tách thời gian xử lý máy chủ khỏi tải mạng/trình duyệt.

Frontend tách landing và ứng dụng bằng React.lazy, không tải quản trị/ví/thành viên khi chỉ xem trang giới thiệu. Request dữ liệu được hủy khi rời trang; lịch sử link chỉ tải khi mở. Bảng quản trị vẫn tải lại khi đổi tab để nhận thao tác vừa phát sinh từ tài khoản khác.

## Kiểm tra tính đúng đắn

CI chạy nghiệp vụ với cả SQLite gốc và libSQL, trình duyệt, image Docker và libSQL server riêng không cần token thật. Smoke Turso kiểm tra thay mới container vẫn giữ dữ liệu/phiên, hai replica rút đồng thời không giữ tiền vượt số dư và khóa tài khoản có hiệu lực trên replica khác. Không đổi nguồn lưu trữ chính hoặc làm yếu kiểm tra sổ tiền để tăng tốc.

## Mốc đo

Trước tối ưu, một lần đo trên Render đã khởi động: bootstrap công khai khoảng 1,6 giây; browser đăng nhập người mua 5,58 giây, trang chủ sẵn sàng 21,53 giây, ví 3,39 giây. Đây là mẫu đo, không phải SLA. Bundle cũ 334,98KB JavaScript (gzip 98,42KB); bản tách tải landing dùng khoảng 249,8KB JavaScript (gzip 78,9KB), ứng dụng tải thêm chunk riêng. Ảnh mới dùng WebP, cache tĩnh; ảnh bên dưới tải lười.

Đo lại trên bản triển khai sau CI để đối chiếu. Thời gian khởi động máy chủ miễn phí và khoảng cách mạng vẫn cần được phân biệt với thời gian xử lý API.
