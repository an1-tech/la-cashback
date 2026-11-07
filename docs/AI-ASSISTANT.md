# Lá AI với Gemini

Khung chat ở góc phải trên landing, ứng dụng và cửa hàng demo. Điện thoại đặt nút trên thanh điều hướng. Chỉ tải trạng thái khi mở chat; không gọi Gemini khi tải trang. Không thêm SDK hoặc thư viện hiệu ứng.

## Cấu hình Render

Trong service Lá → Environment, thêm `GEMINI_API_KEY` bằng key riêng từ Google AI Studio. Không gửi key trong chat, không commit và không dùng tiền tố `VITE_`. Thêm `GEMINI_MODEL` nếu muốn chọn model khác mà tài khoản có quyền dùng; mặc định `gemini-3.5-flash-lite`, dòng Flash-Lite ổn định trong tài liệu Google được kiểm tra ngày 07/11/2026. Lưu và triển khai lại service. Code không tự tạo API key hay bật thanh toán Google.

Local dùng cùng biến trong `.env`. Chưa cấu hình thì hiện trạng thái chưa sẵn sàng, không giả lập câu trả lời AI. Key, lỗi gốc của Google và thought parts không được chuyển xuống frontend.

## Phạm vi

AI hướng dẫn tạo link, xem đơn, ví và luồng mô phỏng; chính sách hiện hành lấy từ backend. Không được quyền gọi API quản trị, thay đổi sổ tiền, duyệt đơn hoặc mua hàng. Không tự đọc số dư, email, ngân hàng hay đơn của người dùng. Chỉ câu hỏi, lịch sử ngắn do người dùng gửi và chính sách công khai được chuyển đến Gemini. Chat không lưu vào database/localStorage; thay tài khoản/đăng xuất sẽ xóa lịch sử trong bộ nhớ.

Phải đăng nhập và có CSRF để gửi câu hỏi. Giới hạn 8 lượt/phút và 50 lượt/24 giờ mỗi tài khoản, 200 lượt/24 giờ toàn website; tối đa 2 request Gemini đồng thời trên tiến trình. Các mốc là cửa sổ 24 giờ từ lần đầu, không phải ngày lịch. Mỗi tin tối đa 1.500 ký tự, tối đa 10.000 ký tự đầu vào, 1.024 output tokens, timeout 20 giây. HTTP 429 của Google kích hoạt nghỉ một phút, không tự retry. Quota và chi phí thực tế phụ thuộc tài khoản Google.

## API và kiểm tra

`GET /api/assistant/status`: cấu hình, trạng thái đăng nhập và CSRF của chính phiên hiện tại. `POST /api/assistant/chat`: `{ messages: [{role:"user",text:"..."},{role:"model",text:"..."},{role:"user",text:"..."}] }`. Chỉ nhận chuỗi user/model luân phiên, bắt đầu và kết thúc bằng user. Trả `{text}`; browser render văn bản, không chạy HTML của AI.

Test dùng fixture, không tiêu quota thật. Kiểm tra mạng thật sau khi chủ website đã lưu key vào Render; không khẳng định kết nối Gemini thành công chỉ dựa trên fixture hoặc một key đã được cấu hình.

Nguồn: [danh sách model Google](https://ai.google.dev/gemini-api/docs/models), [generateContent REST](https://ai.google.dev/api/generate-content), [API key](https://ai.google.dev/gemini-api/docs/api-key).
