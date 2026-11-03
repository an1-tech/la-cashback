# Chức năng cộng đồng và bản mở rộng giao diện Lá

Nguồn yêu cầu: bốn ảnh người dùng gửi về trang chủ, kết quả tạo link, bảng tin và hồ sơ Monback. Chỉ tham khảo nhóm chức năng quan sát được; không sử dụng ảnh, nội dung bài viết hoặc dữ liệu tài khoản của Monback. Giữ React, CSS và nhận diện xanh của Lá.

## Dùng thử

1. Đăng nhập, mở Tạo link, dán URL Shopee và kiểm tra. Sao chép link mô phỏng hoặc mở cửa hàng demo. Mở “Link đã tạo gần đây” để xem lại. Link thuộc tài khoản đã tạo, không phải một link affiliate công khai dùng chung.
2. Mở Bảng tin: tìm một bài, lọc chuyên mục, thích rồi tải lại. Link chia sẻ mở cùng bài được đánh dấu. Với tài khoản quản trị, dùng “Đăng bài viết” ở cột bên và “Quản lý bài viết” để ẩn bài.
3. Điểm danh nhận 10 điểm/ngày theo UTC+7. Gửi lại không cộng thêm. Chuỗi liên tiếp kết thúc khi bỏ lỡ một ngày; trước khi điểm danh hôm nay vẫn hiển thị chuỗi tính đến hôm qua.
4. Cá nhân → Mã quà tặng: nhập LACHAMBAO nhận 100 điểm. Nhập lại báo đã nhận. Phần thưởng của tôi hiển thị lịch sử 100 sự kiện mới nhất và tổng điểm toàn bộ lịch sử.
5. Hạng thành viên: Mầm xanh từ 0, Lá non từ 100, Tán xanh từ 500 điểm. Đây là quy tắc riêng của demo Lá, không suy đoán quy tắc Monback.
6. Giới thiệu: sao chép link hoặc mã, dùng tài khoản khác nhập mã. Không tự giới thiệu; mỗi tài khoản chỉ liên kết một lần. Người mời thấy số lượt, không thấy email người được mời. Không cộng tiền hay điểm cho lượt giới thiệu.
7. Trong Hạng thành viên, đặt biệt danh và bật tham gia xếp hạng. Bảng tính tiền hoàn của đơn hiện đã duyệt theo thời gian cập nhật đối soát. Lọc tuần bắt đầu thứ Hai, tháng/năm theo Việt Nam. Mặc định không tham gia; tài khoản quản trị và bị khóa không xuất hiện. Nếu mọi người chưa tham gia, bảng trống là trạng thái đúng.
8. Cá nhân → Phương thức nhận tiền mở cài đặt ngân hàng giả. Số dư mở ví và sổ giao dịch hiện có. Báo thiếu đơn mở form hỗ trợ; phản hồi quản trị hiển thị trong cài đặt tài khoản.

## Dữ liệu và triển khai

Migration 003 bổ sung bảng thành viên, giới thiệu, sự kiện điểm, mã quà, bài viết và lượt thích. Migration không sửa số dư, đơn hàng hay sổ cái hiện có. Ba bài hướng dẫn nguyên bản và mã trải nghiệm được thêm khi áp dụng migration lần đầu. Các thao tác có xác thực và CSRF theo lớp bảo vệ hiện có.

Không có tích hợp affiliate thật, đọc giá sản phẩm, đa sàn, chuyển tiền ngân hàng hoặc gửi email thật. Không suy diễn quy tắc của những màn hình Monback chưa được cung cấp. Render free đang dùng SQLite trên ổ tạm; dữ liệu thử có thể mất khi instance bị thay thế hoặc deploy lại, theo giới hạn đã nêu ở RENDER.md.

## Kiểm tra bản giao

- 28 kiểm thử Node/API đạt: gồm ngày UTC+7, chống cộng điểm trùng, mã nhận một lần, giữ nguyên số dư tiền, giới thiệu một lần, quyền riêng tư xếp hạng và phân quyền đăng/ẩn bài.
- 7 kịch bản Playwright đạt: có luồng đăng ký → tạo link → đơn demo → đối soát → rút → thanh toán; kiểm tra cộng đồng, lưu sau tải lại và responsive 320/390/768/1440/1920/2560 px.
- Đã xem ảnh thực tế trang chủ, bảng tin, hồ sơ ở desktop/mobile và hồ sơ sáng; kiểm tra bàn phím cho link và FAQ, chế độ giảm chuyển động.
- Taste inspector: 0 FAIL tại 1440/768/390. Ngoại lệ `app-title-size` dành cho tiêu đề hai dòng đã được người dùng duyệt trong DESIGN.md. Hai cảnh báo còn lại là chiều cao khối khám phá/đơn trống khác nhau và tỷ lệ chữ phụ dưới 13px; chủ động giữ khối trống vừa nội dung và chữ phụ 11–12px, nội dung bài 16px.
- Đánh giá nội bộ: giữ nhận diện tốt; hành động chính dễ tìm; bố cục rộng tận dụng hơn bản tham khảo. Còn có thể rút gọn trang chủ điện thoại khi bổ sung dữ liệu sử dụng thực tế. Ảnh minh họa sản phẩm là tài sản ImageGen đã có của Lá, không có ảnh lấy từ Monback.
