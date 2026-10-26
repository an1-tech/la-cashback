# Lá Cashback — MVP React

Ứng dụng Affiliate + Cashback tiếng Việt, ưu tiên điện thoại. **Bản này chỉ chạy demo cục bộ. Chưa kết nối Shopee hoặc ngân hàng. Không có tiền thật.** Không có API Shopee, tỷ lệ hoa hồng Shopee hoặc thời gian ghi nhận nào được giả định.

## Chạy nhanh

Cần Node.js 24 trở lên và npm. Không cần cài riêng SQLite.

```powershell
cd D:\Projects\la-cashback
npm ci
Copy-Item .env.example .env
npm run build
npm start
```

Mở <http://127.0.0.1:3080>. Bản ZIP bàn giao đã có `dist/`, có thể dùng ngay `npm start` với Node.js 24. Nếu clone từ GitHub, cần chạy `npm ci` và `npm run build` theo hướng dẫn trên vì `dist/` không được lưu trong Git. Cơ sở dữ liệu mặc định `data/cashback.sqlite`, được tạo và migration tự động khi khởi động. Seed chỉ chạy khi chưa có người dùng; không ghi đè dữ liệu cũ.

Phát triển giao diện React với Vite:

```powershell
npm run dev
```

Mở <http://127.0.0.1:5173>. Vite proxy `/api` sang backend cổng 3080. Dừng bằng Ctrl+C. Không chạy `npm start` và `npm run dev` đồng thời trên cùng cổng backend.

## Tài khoản demo

| Vai trò                  | Email              | Mật khẩu      |
| ------------------------ | ------------------ | ------------- |
| Người mua có dữ liệu mẫu | `ban@demo.local`   | `Demo@123456` |
| Quản trị                 | `admin@demo.local` | `Demo@123456` |
| Người mua chưa có đơn    | `khac@demo.local`  | `Demo@123456` |

Đăng nhập có nút chọn Người mua / Quản trị để điền nhanh tài khoản thử. Cũng có thể đăng ký tài khoản mới bằng email giả. Ngân hàng duy nhất là “Ngân hàng mô phỏng”; tài khoản phải theo mẫu `DEMO-00001234`. Không nhập dữ liệu thật. Mật khẩu mẫu là thông tin công khai phục vụ demo.

## Thử toàn bộ hành trình

1. Đăng nhập người mua; dán `https://shopee.vn/demo-i.123.456`, bấm **Kiểm tra hoàn tiền**. Tên, ảnh và tiền dự kiến đều chưa xác định do chưa có nguồn sản phẩm được xác minh.
2. Bấm **Mua hàng nhận hoàn tiền**. Backend lưu lượt bấm và phiên bản chính sách, mở cửa hàng mô phỏng nội bộ. Không tạo link affiliate thật, không gọi Shopee và không cộng tiền vì lượt bấm.
3. Bấm **Mô phỏng mua & ghi nhận đơn chờ duyệt**. Kịch bản dùng đơn giả 450.000 đ, hoa hồng giả 25.000 đ; đây không phải tỷ lệ Shopee. Chính sách mẫu chia 70% hoa hồng, nên chờ duyệt là 17.500 đ. Gửi lại cùng lượt bấm không ghi nhận trùng.
4. Đăng nhập quản trị ở trình duyệt hoặc profile khác; mở **Quản trị → Đơn & đối soát**. Chọn đơn và ghi nhận hoa hồng hợp lệ hoặc từ chối với lý do. Có thể nhập báo cáo JSON và xem kết quả từng dòng.
5. Người mua vào **Số dư**. Sau khi chính sách cho phép khả dụng, thêm ngân hàng giả ở **Cá nhân**, xác nhận bằng mật khẩu, rồi yêu cầu rút. Chính sách mẫu rút tối thiểu 50.000 đ, chờ khả dụng 0 ngày để dễ thử; tài khoản mẫu ban đầu có 76.000 đ khả dụng.
6. Quản trị vào **Rút tiền**, duyệt yêu cầu. Bước này chưa ghi nhận thanh toán. Mở lại yêu cầu, ghi nhận thanh toán mô phỏng với mã duy nhất như `DEMO-TRANSFER-0001`, hoặc chọn thất bại để giải phóng tiền giữ.
7. Người mua tải lại ví để xem kết quả, thông báo và sổ giao dịch. Mỗi phiên chỉ cập nhật sau thao tác/tải lại; chưa có push thời gian thực.

## Đã hoạt động

- React SPA tiếng Việt: Trang chủ, Đơn hàng, Ưu đãi, Số dư, Cá nhân; thanh điều hướng dưới trên điện thoại; sáng/tối được lưu trên trình duyệt.
- Đăng ký, đăng nhập, đăng xuất, hồ sơ, đặt lại mật khẩu demo, đổi ngân hàng giả có xác nhận mật khẩu, khóa tài khoản và thu hồi phiên.
- Kiểm tra URL whitelist, lưu lượt bấm và chính sách, cửa hàng mô phỏng, đối soát từng sản phẩm trong đơn, báo cáo trùng không ghi sổ trùng.
- Đơn chờ duyệt / duyệt / từ chối, tiền dự kiến và tiền cuối cùng, lý do, lọc ngày/trạng thái, yêu cầu hỗ trợ.
- Ví tách chờ duyệt / đã duyệt chưa khả dụng / có thể rút / đang rút / đã thanh toán; lịch sử bút toán, giữ tiền rút, duyệt, từ chối, thất bại, thanh toán.
- Quản trị: chỉ số tổng quan, người dùng, đơn, báo cáo JSON, dòng lỗi, báo cáo chưa gán, gán có bằng chứng, chính sách mới có hiệu lực theo thời gian, điều chỉnh số dư, hỗ trợ, banner, hướng dẫn, deal/voucher và nhật ký.
- Tìm kiếm, lọc danh mục, lưu/bỏ lưu ưu đãi, xem điều kiện, sao chép mã giả; thông báo trong ứng dụng.

## Cấu trúc

```text
src/                        React + CSS responsive
  main.jsx                  Shell, điều hướng và màn hình người mua
  pages/Admin.jsx           Màn hình quản trị
  components.jsx            Form, Modal, dữ liệu loading/error, icon, minh họa SVG
  context.jsx               Trạng thái phiên và hành động dùng chung
  api.js                    Client API và định dạng VND/ngày
server/
  app.js                    HTTP API, session, CSRF, phân quyền, nội dung tĩnh
  finance.js                Nghiệp vụ đối soát, sổ kép, rút và chính sách
  security.js               Scrypt, validation, rate limit và whitelist URL
  db.js                     SQLite, migration và BEGIN IMMEDIATE
  providers/demo.js         Adapter demo; không gọi mạng ngoài
  migrations/               Migration SQL có đánh số
  seed.js                   Dữ liệu mẫu, chỉ khởi tạo khi DB trống
scripts/                    Lệnh migrate / seed / dev
tests/                      Kiểm thử nghiệp vụ và API bằng node:test
e2e/                        Kiểm thử trình duyệt bằng Playwright
examples/                   Mẫu báo cáo chuẩn hóa nội bộ
docs/                       Kiến trúc, hợp đồng dữ liệu, vận hành thật và QA
```

## Quy tắc tiền

- VND nguyên; tỷ lệ chia bằng basis points (10.000 = 100%). Tính bằng `BigInt`, làm tròn xuống 1 VND. Mỗi giá trị đầu vào không vượt 10^12 VND.
- Tỷ lệ mẫu 7.000 bps là **chính sách chia hoa hồng của nền tảng demo**, không phải hoa hồng Shopee. Hoa hồng luôn do báo cáo cung cấp.
- Chính sách được gắn tại **lượt bấm**. Phiên bản cũ không thể UPDATE/DELETE. Cấu hình mới không thay quyền lợi của lượt bấm cũ; mức rút tối thiểu áp dụng theo chính sách hiện hành lúc yêu cầu rút.
- Mỗi journal có tham chiếu duy nhất và các dòng ledger tổng bằng 0, có tài khoản đối ứng `clearing`. Số dư được tính từ ledger; không có trường số dư để sửa trực tiếp. Ledger/journal/audit có trigger chặn sửa/xóa.
- `BEGIN IMMEDIATE` và ràng buộc UNIQUE bảo vệ đối soát, chống xử lý lại và rút tiền đồng thời. Mỗi dòng báo cáo là một transaction độc lập.
- Yêu cầu rút có idempotency key, giữ `available → held`. Duyệt không chuyển tiền. Chỉ `paid` mới chuyển `held → paid`; từ chối/thất bại trả `held → available`.
- Đối soát bổ sung ghi bút toán chênh lệch. Thu hồi sau đã trả có thể làm số dư khả dụng âm; giao diện hiển thị nợ và chặn rút mới, không sửa lịch sử thanh toán.
- Nếu thu hồi xảy ra lúc tiền đang giữ để rút, backend chặn tiếp tục duyệt/thanh toán khi khả dụng âm. Quản trị cần đối soát hoặc từ chối/ghi nhận thất bại để giải phóng tiền; tài khoản bị khóa cũng không thể tiếp tục được thanh toán.
- Số tiền khả dụng được chuyển khi người mua mở bootstrap/ví, gửi rút, hoặc quản trị mở dữ liệu. Chưa có scheduler, nhưng mọi yêu cầu rút đều kiểm tra lại trong transaction.

## Kiểm thử

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:ui
```

Kiểm thử UI tự khởi động cổng **3081**, DB `:memory:` riêng; không sửa DB demo đang dùng. Có thể đặt `QA_BROWSER_PATH` để dùng Chromium có sẵn. Ảnh chụp và trace nằm trong `artifacts/` (được gitignore). Xem `docs/QA.md` cho kết quả thực tế.

## Triển khai môi trường thử nghiệm

Chỉ hướng dẫn, **chưa triển khai công khai**. Có thể build ở CI (`npm ci && npm test && npm run build`), chuyển `dist/`, `server/`, `package.json` và cấu hình tới máy có Node.js 24; chạy `node server/index.js` dưới tài khoản riêng với volume dữ liệu bền vững. Backend không cần thư viện npm ngoài Node nếu đã có `dist/`.

Dockerfile đa giai đoạn đi kèm; chưa chạy Docker trong phiên bàn giao:

```powershell
docker build -t la-cashback-demo .
docker run --rm -p 127.0.0.1:3080:3080 -v la-demo-data:/app/data la-cashback-demo
```

DB SQLite WAL dùng cho một máy/volume local; không đặt trên ổ mạng hoặc chạy nhiều replica. Sao lưu bằng SQLite backup API (hoặc dừng server rồi sao chép DB nhất quán), giữ quyền truy cập thư mục data. Không copy riêng file `.sqlite` trong lúc ghi mà bỏ qua WAL. Muốn nhiều máy ghi, cần migration sang PostgreSQL và giữ các ràng buộc/transaction tương đương.

`DEMO_MODE=false` cố ý làm server từ chối khởi động. Chuyển sang thật cần triển khai các điều kiện trong `docs/PRODUCTION.md`, không chỉ đổi một biến môi trường. Không xuất bản bản demo với tài khoản mẫu lên Internet.

## Giới hạn rõ ràng

Không đọc tên/ảnh/giá sản phẩm thật; không resolve link rút gọn; không tạo affiliate URL; không API/webhook Shopee; không email/SMS/OTP; không chuyển khoản; không cam kết hoa hồng/thời gian ghi nhận. Deal/voucher, ngân hàng, reset token hiển thị trong UI và mọi thanh toán đều là mô phỏng.

MVP giới hạn 500 đơn/500 dòng sổ/200 yêu cầu ở mỗi màn hình, chưa phân trang; chưa có search toàn bộ báo cáo lớn, chống bot chuyên dụng, MFA quản trị, mã hóa ngân hàng thật, dịch vụ thông báo ngoài ứng dụng, giám sát hay kiểm toán an ninh độc lập. Không có điểm danh, nhiệm vụ, cấp bậc, giới thiệu, cộng đồng hoặc đổi quà.

Không có ảnh tham chiếu kèm trong đầu vào, nên giao diện và minh họa SVG được tạo riêng cho “Lá Cashback”. Không tải hình hoặc sao chép logo/tài sản từ website khác.
