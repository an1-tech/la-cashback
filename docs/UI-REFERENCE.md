# Giao diện Lá theo ảnh tham chiếu

Bản tháng 11/2026 dùng cấu trúc từ các ảnh người dùng cung cấp: landing ngang, menu trái 240px, cột 690px cho trang chủ/bảng tin/hồ sơ, khung 1140px cho quản trị và 1000px cho hỏi đáp/liên hệ. Nhận diện vẫn là chiếc lá, xanh rừng và xanh non; có sáng/tối và menu điện thoại.

Các trang mới dùng dữ liệu hiện có: Blog đọc bài trong bảng tin; đọc bài mở đúng bài được chọn; Liên hệ/Góp ý lưu ticket và theo dõi phản hồi trong tài khoản. Hỏi đáp có danh mục, tìm kiếm và accordion. Hồ sơ dẫn tới đúng bộ lọc đơn, sổ giao dịch, ngân hàng demo và các tiện ích thành viên. Banner có nút chuyển bằng chuột hoặc bàn phím, không tự chạy.

Nội dung được điều chỉnh đúng phạm vi đề án: không quảng cáo hoàn tiền thật, không sao chép pháp nhân/số điện thoại/tin báo chí của Monback, không gắn nút tải ứng dụng chưa phát hành. Sản phẩm/ưu đãi hiện có là minh họa; giá và tỷ lệ hoàn chưa xác minh không được bịa thêm. Bảng xếp hạng chỉ hiển thị tài khoản đã chủ động tham gia.

## Kiểm tra

`npm run test:ui` kiểm tra luồng mua thử, quản trị, ví, thành viên, đăng xuất, bài viết, hỏi đáp, liên hệ và menu điện thoại. `node scripts/review-ui.mjs` chụp từng trang ở 2560/1440/390/320px với hai giao diện, phát hiện lỗi JavaScript và tràn ngang. Có thể đặt `QA_BROWSER_PATH` để dùng Edge cài sẵn. Ảnh và kết quả ở `artifacts/reference/` (không commit).

## Minh họa

Hai tài sản tạo bằng công cụ ImageGen tích hợp, được mã hóa WebP để sử dụng trong dự án:

- `public/images/la-mascot.webp`: sóc nâu 3D, túi xanh hình chiếc lá, ngồi trên đồng xu, nền trong suốt. Prompt: “Premium cute auburn 3D squirrel with cream belly, forest green crossbody pouch and lime leaf emblem, sitting on gold coins and tossing one coin, isolated transparent background, no words or watermark.”
- `public/images/la-steps.webp`: banner 3D ba bước với liên kết, tài liệu/chiếc lá và túi mua sắm, bảng màu xanh rừng/xanh non. Prompt: “Wide 2:1 premium shopping instructional banner, three glossy cream rounded panels with 3D link/shopping bag, papers/green leaf, tapping hand/shopping bag; numbered lime badges 1, 2, 3; forest green and lime background, empty top for HTML heading and lower label slots; no words, logos or watermark.”

Tiêu đề, chú thích và điều khiển vẫn là HTML truy cập được bằng bàn phím. Hình minh họa không phải bằng chứng doanh thu hay giao dịch thật.
