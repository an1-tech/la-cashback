# Điều kiện chuyển sang vận hành thật

Phiên bàn giao **không tích hợp thật và không triển khai công khai**. Chưa có tài liệu/tài khoản affiliate để xác minh quyền hoặc mô hình cashback, vì vậy không thể tuyên bố Shopee hỗ trợ bất kỳ endpoint/cơ chế đối soát cụ thể nào.

## Thông tin cần chủ dự án cung cấp/xác minh

1. Chương trình cụ thể và hợp đồng với nhà cung cấp: Shopee trực tiếp hay một mạng affiliate trung gian; quốc gia, pháp nhân, quyền triển khai cashback, cơ chế khuyến khích người mua và cách truyền sub-ID có được cho phép không. Cần xác nhận bằng tài liệu/hợp đồng chính thức.
2. Tài khoản đã duyệt, tài liệu API hoặc báo cáo chính thức, phạm vi quyền, sandbox, cơ chế cấp/lưu/luân chuyển khóa. Không mặc định tài khoản affiliate có API.
3. Cách tạo deep link hợp lệ, định dạng mã theo dõi, giới hạn, cookie/attribution, theo dõi trên app/web, quy tắc mất tracking. Không tự hứa thời gian hoặc khả năng ghi nhận mọi đơn.
4. Hợp đồng dữ liệu báo cáo: cấp đơn hay cấp sản phẩm, tiền tệ, căn cứ tính hoa hồng ròng, thuế/điều chỉnh, timezone, trạng thái cuối, ID và phiên bản sự kiện, hoàn trả sau duyệt, chu kỳ đối soát.
5. Nếu có webhook: xác thực chữ ký trên raw bytes, timestamp/replay window, quản lý secret, retry; nếu polling: cursor, overlap, backoff và checkpoint. Chỉ chọn sau khi có tài liệu xác minh. Nếu chỉ có file: xây adapter định dạng thực và bảng lỗi theo dòng.
6. Quy tắc ghép mã bấm với user/lượt mua và xử lý unmatched có bằng chứng. Không suy đoán dữ liệu cá nhân từ tên/giá trị đơn.
7. Chính sách chia hoa hồng từng phạm vi, thời gian hiệu lực, thời điểm khóa quyền lợi, thời gian giữ tiền, điều kiện khả dụng dựa trên khoản thực thu, mức rút tối thiểu và xử lý nợ sau thu hồi.
8. Nhà cung cấp thanh toán/ngân hàng, quy trình xác thực người nhận, đối soát khoản thực trả và mã thanh toán, người duyệt/người chi tách biệt, khiếu nại và điều chỉnh.
9. Hạ tầng domain/HTTPS, dịch vụ gửi email xác minh và reset, quản lý tài khoản quản trị/MFA, backup có kiểm tra phục hồi, khóa mã hóa, lưu trữ dữ liệu cá nhân, monitoring/alerting.
10. Điều khoản sử dụng và hoàn tiền, thông báo quyền riêng tư, cơ sở xử lý/lưu dữ liệu, kế toán/thuế và yêu cầu pháp lý được rà soát bởi bên có chuyên môn tại thị trường triển khai.

## Thay đổi kỹ thuật bắt buộc

- Viết adapter thật cạnh `server/providers/demo.js`, có contract test từ fixture đã ẩn thông tin nhạy cảm. Namespace các khóa sự kiện/đơn theo provider khi thêm nền tảng khác; thêm migration thay vì đổi DB trực tiếp.
- Kiểm tra thứ tự và phiên bản sự kiện trước khi áp dụng, xử lý out-of-order và idempotency theo hợp đồng thật. Demo chỉ mô phỏng admin nhập nguồn đã chuẩn hóa.
- Tách chế độ seed: không tạo demo user, không hiển thị reset token, không trả credentials mẫu, không dùng ngân hàng giả trong production.
- Cấu hình HTTPS, cookie Secure, email delivery đã xác minh, reset qua kênh riêng, email verification, MFA quản trị, chống credential stuffing và audit cảnh báo.
- Mã hóa tài khoản ngân hàng, quản lý khóa bên server; step-up/MFA và cooldown khi đổi người nhận; ledger/audit cần quyền DB riêng, backup và kho lưu không thể sửa bởi ứng dụng. Trigger SQLite không bảo vệ trước quản trị viên có quyền sở hữu file DB.
- Phân trang, scheduler/polling nguồn, job chuyển khả dụng, retry queue, giám sát và kiểm tra tổng nghĩa vụ/đối ứng định kỳ. Cơ chế khả dụng hiện tại dựa vào số ngày từ lúc duyệt, chưa có bằng chứng nhà cung cấp đã trả hoa hồng.
- Với nhiều replica, chuyển sang PostgreSQL có khóa hàng, transaction và UNIQUE tương đương; kiểm thử rút đồng thời và crash/retry ở môi trường thực.
- Kiểm thử end-to-end sandbox nguồn và ngân hàng, kiểm toán bảo mật độc lập, diễn tập restore và đối soát trước khi có giao dịch thật.

Không có bước nào ở trên được coi là hoàn thành chỉ vì đổi `DEMO_MODE`. Server hiện cố ý chặn `DEMO_MODE=false`.
