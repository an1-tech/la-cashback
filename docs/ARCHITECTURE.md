# Kiến trúc và hợp đồng nghiệp vụ

React (trình duyệt) → HTTP JSON cùng origin → kiểm tra session/CSRF/quyền → nghiệp vụ → SQLite transaction. Module provider chỉ chuyển đổi dữ liệu bên ngoài thành hợp đồng nội bộ. Adapter hiện tại là demo và không có gọi mạng.

## Trạng thái và tài khoản

Đơn: `pending → approved/rejected`; báo cáo không được đưa đơn đã đối soát về `pending`. Báo cáo cuối có thể điều chỉnh `approved ↔ rejected` hoặc thay số hoa hồng, tạo bút toán chênh lệch. Adapter thật phải kiểm tra thứ tự/phiên bản sự kiện của nhà cung cấp trước khi gọi nghiệp vụ; demo không có giao thức webhook thật.

Sổ tiền: `clearing ↔ pending → locked → available → held → paid`. `clearing` là tài khoản đối ứng của nguồn hoàn tiền demo, không phải số dư người dùng và không phải mô hình kế toán đầy đủ doanh nghiệp. Doanh thu trước chi phí có thể tính từ tổng hoa hồng đã duyệt trừ tiền hoàn đã duyệt; chi phí hoạt động, thuế và kế toán tài chính chưa triển khai.

Yêu cầu rút: `requested → approved → paid/failed` hoặc `requested → rejected`. `approved` chỉ là phê duyệt nội bộ. Mã thanh toán duy nhất bắt buộc ở bước `paid`. Trạng thái kết thúc không thể xử lý lần hai để trả/giải phóng trùng.

## Nhập báo cáo demo

POST `/api/admin/reports`, chỉ admin, body `{ "rows": [...] }`, tối đa 200 dòng / 512 KB. Đây là định dạng **nội bộ**, không có tuyên bố tương thích dữ liệu Shopee.

| Trường     | Quy tắc                                                                             |
| ---------- | ----------------------------------------------------------------------------------- |
| eventId    | Chuỗi 1–100 ký tự, duy nhất theo lần đối soát; gửi lại phải cùng nội dung chuẩn hóa |
| externalId | Mã đơn nguồn 1–100 ký tự                                                            |
| itemId     | Mã dòng sản phẩm 1–100 ký tự; unique cùng externalId                                |
| clickId    | Mã lượt theo dõi nội bộ; không tìm thấy thì lưu `unmatched`, không ghi tiền         |
| title      | 1–200 ký tự, luôn render qua React text, không dùng HTML người dùng                 |
| orderValue | VND nguyên, 0–10^12                                                                 |
| commission | Hoa hồng VND nguyên, 0–10^12; không tính từ giá đơn                                 |
| status     | pending / approved / rejected                                                       |
| reason     | Lý do tối đa 500 ký tự, bắt buộc khi rejected                                       |

Kết quả từng dòng: `line`, `state`, `orderId`, `duplicate` hoặc `error`. Dòng lỗi không rollback dòng hợp lệ khác. Cùng `eventId` khác nội dung bị lỗi; cùng đơn/sản phẩm nhưng `clickId` khác bị từ chối. Mã sự kiện khác cho cùng đơn/sản phẩm tạo đối soát chênh lệch, không thêm đơn mới. Báo cáo gốc và hash vẫn được giữ khi admin đối chiếu lại lượt bấm.

Gán báo cáo chưa xác định qua `/api/admin/resolve` cần clickId đang tồn tại và bằng chứng/lý do ít nhất 10 ký tự. Nhật ký lưu người thực hiện, sự kiện, mã bấm và lý do. Việc gán không dựa vào email, tên người mua hoặc giá trị đơn tự khai.

## URL và redirect

Chỉ HTTPS, hostname khớp chính xác `shopee.vn`, `www.shopee.vn`, `s.shopee.vn`, `shp.ee`, không userinfo hoặc port ngoài chuẩn, không URL trang chủ. Không fetch URL đầu vào, không resolve DNS/shortlink nên demo không có đường SSRF tới mạng nội bộ. Redirect chỉ tới route nội bộ do backend tự tạo, không dùng URL chuyển hướng người dùng cung cấp.

Adapter thật cần xác minh host sau **mỗi redirect**, chặn IP riêng/loopback/link-local ở cả DNS và kết nối, chặn DNS rebinding, giới hạn hop, timeout, kích thước phản hồi, và chỉ tạo link theo tài liệu đã được cấp quyền. Việc whitelist đầu vào hiện tại không đủ cho một tính năng fetch URL thật.

## Phiên và dữ liệu

Mật khẩu scrypt với salt ngẫu nhiên; token phiên/reset lưu hash SHA-256; phiên 8 giờ, reset 15 phút dùng một lần và thu hồi mọi phiên khi đổi mật khẩu. Cookie HttpOnly, SameSite=Strict; CSRF token riêng và kiểm tra Origin/Host cho mutation. `COOKIE_SECURE=true` dùng khi có HTTPS. Demo reset trả token cho client là cơ chế thử, không được giữ khi làm thật.

Mọi query người mua lọc `user_id` từ phiên server, không từ body/query. Admin được kiểm tra role tại API. Rate limit lưu SQLite theo IP và tài khoản cho auth, theo user cho link/rút/bank/hỗ trợ. Không tin X-Forwarded-For, nên qua proxy mọi người có thể cùng quota IP; cần cấu hình proxy tin cậy trước production. Đây là giới hạn demo, không phải chống DDoS.

Ngân hàng chỉ nhận mẫu giả; audit ghi mask. Không log payload chứa mật khẩu/cookie. Khi sử dụng dữ liệu thật phải có mã hóa trường dữ liệu, quản lý khóa, MFA/step-up, cooldown thay người nhận và quy trình phân quyền thanh toán.
