# Đưa Lá Cashback lên Render để trình diễn đề án

Đây là website React + Node.js có cơ sở dữ liệu và các thao tác demo hoạt động online. Không kết nối Shopee hoặc chuyển tiền thật. Không nhập dữ liệu cá nhân thật. Chủ đề án giữ mật khẩu admin riêng; người xem có thể đăng ký hoặc dùng tài khoản người mua mẫu. Mọi người dùng chung dữ liệu mẫu nếu dùng cùng tài khoản.

## Tạo dịch vụ miễn phí

1. Đăng ký tại https://dashboard.render.com/ bằng GitHub.
2. Cho Render quyền truy cập đúng repository `an1-tech/la-cashback` (nếu private, chọn repository này khi cài GitHub integration).
3. Chọn **New → Blueprint**, chọn repository và nhánh `main`. Render đọc `render.yaml` ở thư mục gốc.
4. Kiểm tra service dùng **Free**, không gắn disk hay dịch vụ trả phí. Bấm **Deploy Blueprint**. Nếu giao diện hỏi tên Blueprint, đặt `la-cashback-demo`.
5. Chờ build và deploy chuyển **Live**, mở URL `https://<tên-dịch-vụ>.onrender.com` do Render cấp. Tên có thể được thêm hậu tố; dùng URL thực tế trong dashboard.
6. Trong service → **Environment**, lấy giá trị `DEMO_ADMIN_PASSWORD` được Render tự tạo. Lưu riêng để đăng nhập `admin@demo.local`. Không đưa mật khẩu lên GitHub/báo cáo công khai. Trường mật khẩu admin trên web cố ý để trống.

Nếu không dùng Blueprint: **New → Web Service → chọn repository → Docker → Free**. Thêm các biến trong `render.yaml`, nhập mật khẩu admin riêng dài ít nhất 16 ký tự, đặt health check `/healthz`, rồi deploy. Không cần chạy `npm start` ở máy cá nhân.

## Kiểm tra sau deploy

- Mở `/healthz`: phải trả `{"ok":true,"mode":"demo"}`.
- Đăng ký bằng email thử, đăng nhập; dán `https://shopee.vn/demo-i.123.456` → kiểm tra → mua → ghi nhận đơn demo.
- Mở cửa sổ ẩn danh và đăng nhập admin để đối soát đơn.
- Với đơn mới, nhập hoa hồng demo 100.000đ để chia 70.000đ, đủ mức rút mẫu 50.000đ. Người mua khai báo ngân hàng `DEMO-00001234` và xác nhận bằng mật khẩu của họ.
- Yêu cầu rút 50.000đ; admin duyệt rồi xác nhận thanh toán bằng mã duy nhất `DEMO-TRANSFER-...`; kiểm tra lịch sử ví.
- Kiểm tra điện thoại, ảnh ưu đãi, đăng xuất; tài khoản thường không truy cập được API quản trị.
- Quên mật khẩu online thông báo chưa hỗ trợ email, không trả reset token cho khách.

## Giới hạn của gói Free

Theo tài liệu Render, dịch vụ Free có thể ngủ khi không hoạt động; lần truy cập đầu cần thời gian khởi động. File local không bền vững, SQLite có thể mất khi restart/redeploy. Khi DB mới, ứng dụng tự tạo lại dữ liệu mẫu; thanh thông báo trong ứng dụng ghi rõ dữ liệu có từ thời điểm nào, và phiên đăng nhập cũ sẽ tự chuyển về trạng thái chưa đăng nhập. Đây là bản trình diễn có thể khởi tạo lại, không dùng giữ dữ liệu quan trọng hoặc tiền thật.

Muốn lần mở đầu không phải chờ máy chủ thức dậy: dùng dịch vụ giám sát miễn phí (ví dụ UptimeRobot) gọi `/healthz` khoảng 10 phút một lần. Việc này giữ máy chủ chạy nhưng không làm dữ liệu bền vững khi redeploy.

Muốn giữ dữ liệu dài hạn: chọn máy chủ có volume bền vững, ví dụ Render trả phí có disk gắn vào `/app/data` (cần tự duyệt chi phí trước khi bật). Không chạy nhiều instance cùng SQLite. Không sao chép DB đang ghi mà bỏ qua WAL. Không tắt `DEMO_MODE` để giả lập vận hành thật.

Tài liệu nền tảng: https://render.com/docs/free, https://render.com/docs/blueprint-spec, https://render.com/docs/disks.
