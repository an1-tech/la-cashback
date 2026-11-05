# Dữ liệu sản phẩm AddLiveTag cho demo Lá

Tích hợp theo [repository bcat95/shopee-aff](https://github.com/bcat95/shopee-aff), [Data API](https://data.addlivetag.com/shopee/) và [API Key](https://github.com/bcat95/shopee-aff/blob/main/docs/api-key.md), kiểm tra ngày 06/11/2026.

Đây là Data API bên thứ ba, khác Shopee Open API dùng app_id/secret_key. Nhà cung cấp chỉ cho học tập, nghiên cứu và công cụ nội bộ phi thương mại. Không chuyển tích hợp này sang vận hành cashback thương mại khi chưa có nguồn và quyền phù hợp. Giá, tỷ lệ và hoa hồng là tham khảo; mặc định theo tài khoản proxy, không phải quyền lợi của tài khoản Lá.

## Thiết lập

1. Đăng nhập [addlivetag.com](https://addlivetag.com/) → API Key → Tạo Key. Tài liệu hiện yêu cầu key gồm 48 ký tự hex.
2. Render → service la-cashback-demo → Environment → Add Environment Variable. Name: `ADDLIVETAG_API_KEY`; Value: key riêng của bạn. Lưu và triển khai phiên bản code này.
3. Local: sao chép `.env.example` thành `.env` nếu chưa có, thêm cùng biến. `.env` đã bị Git bỏ qua. Không dùng tiền tố `VITE_`, không gửi key vào chat, không commit key hoặc log request header.
4. Chỉ khi đã biết tier chính xác mới đặt thêm `ADDLIVETAG_BASE_RATE` và `ADDLIVETAG_CAP`. Không mặc định coi 8%/20.000đ là tier của người dùng. Lịch sử hoa hồng yêu cầu base rate; lịch sử giá không cần.
5. Kiểm tra thật tại local với `node --env-file-if-exists=.env scripts/check-catalog.mjs`. Script chỉ in trạng thái, không in key. Chưa có key hợp lệ thì chỉ chạy được kiểm thử bằng fixture, chưa xác nhận truy cập nguồn thật.

API Key là của AddLiveTag, không phải Shopee Affiliate ID hoặc Shopee App Secret. Không yêu cầu cookie hay mật khẩu Shopee.

## Sử dụng trên giao diện

- Đăng nhập → dán **link sản phẩm đầy đủ** → Kiểm tra hoàn tiền: giữ link demo, bổ sung ảnh/tên/giá/hoa hồng tham khảo khi dữ liệu tải được.
- Ưu đãi → **Dữ liệu Shopee tham khảo**: tìm theo từ khóa, phân trang, xem chi tiết và mở lịch sử giá theo các mốc thay đổi. Lịch sử tải khi mở, không gọi sẵn cho toàn bộ sản phẩm.
- Link “Xem giá trên Shopee” là link gốc, không ghi nhận affiliate hoặc đơn hàng trong Lá. Nút mua demo vẫn mở `/demo-shop`.
- Link rút gọn vẫn dùng được cho demo nhưng tra cứu dữ liệu yêu cầu mở Shopee và sao chép link đầy đủ. Không tự fetch URL do người dùng gửi để resolve redirect.
- Thiếu key: tab tham khảo hiện trạng thái chưa kết nối. Nguồn lỗi: báo lỗi ở vùng liên quan, vẫn dùng được các chức năng demo.

## Hợp đồng backend

Tất cả endpoint dưới đây cần phiên đăng nhập. POST còn cần CSRF theo cơ chế hiện hành. Response chỉ trả trường cần thiết, không chuyển toàn bộ payload hoặc thông tin API Key của nhà cung cấp xuống trình duyệt.

| Route Lá                                                                                         | Công dụng                                                        |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `GET /api/catalog/product?itemId=123` hoặc `?url=<full_product_url>`                             | Chi tiết sản phẩm                                                |
| `GET /api/catalog/offers?kind=products&keyword=tai%20nghe&page=1&limit=20`                       | Tìm sản phẩm                                                     |
| `GET /api/catalog/offers?kind=campaigns`                                                         | Thông tin chiến dịch tham khảo                                   |
| `GET /api/catalog/offers?kind=shops`                                                             | Thông tin shop tham khảo                                         |
| `GET /api/catalog/offers?kind=shopProducts&shopId=123`                                           | Sản phẩm của shop                                                |
| `GET /api/catalog/history?itemIds=123,456&type=price&days=90`                                    | Lịch sử, tối đa 50 ID; `commission`/`both` cần tier              |
| `POST /api/catalog/products/batch` với `{"itemIds":["123","456"],"maxApi":10,"cacheOnly":false}` | Batch tối đa 100 ID/link gốc; giữ thứ tự và trạng thái từng dòng |

Batch chủ động giới hạn maxApi ≤50, mặc định 10. Không mở tùy chọn clear_cache trên web, không có tác vụ quét hàng nghìn sản phẩm tự động. `stale`/`skipped`/`not_found` được giữ riêng; không coi chúng là thành công hoặc tự retry liên tục.

## Hiệu năng và an toàn

- API Key chỉ đi trong header `X-API-Key` của backend đến origin cố định `https://data.addlivetag.com`. Không đi trong URL, browser, bootstrap hay Git.
- Timeout 8 giây, giới hạn 2 MB mỗi response, tối đa 3 request nguồn đồng thời, ngân sách bảo thủ 60 đơn vị/phút mỗi tiến trình (batch/history tính theo quy mô).
- Cache bộ nhớ tối đa 200 request và 20 MB payload: sản phẩm/batch/offers 10 phút, lịch sử 1 giờ; gộp request trùng đang chạy. Khi nguồn lỗi, bản lưu dưới 24 giờ có thể trả lại với `stale` và cảnh báo. Đây là thời điểm backend tra cứu, không khẳng định thời điểm Shopee cập nhật.
- HTTP 429 và `limits.sourceRateLimited`/`sourceCooldownSeconds` kích hoạt nghỉ tối thiểu 120 giây, tôn trọng Retry-After tới 1 giờ. Không tự lặp request. Cần chia sẻ quota/cache nếu sau này chạy nhiều instance.
- Validate ID, whitelist host, loại tracking khỏi landing. Ảnh chỉ HTTPS thuộc CDN `*.susercontent.com`/`cf.shopee.vn`; CSP vẫn chặn script và kết nối ngoài origin từ trình duyệt.
- Không nhập báo cáo đơn hoặc ghi tiền vào ledger từ Data API. Bootstrap vẫn trả `provider: demo`. Không cần migration.

## Liên kết affiliate

`buildAffiliateLink()` là helper thuần được kiểm thử theo [cấu trúc an_redir do AddLiveTag mô tả](https://data.addlivetag.com/shopee/aff-link.html): canonical landing, affiliate_id do chủ tài khoản cung cấp, tối đa 5 sub chỉ chữ/số/gạch dưới. Không có ID mẫu hoạt động, không bật endpoint mua hàng thật.

Chưa có Affiliate ID được duyệt và bằng chứng đối soát, nên không thể xác nhận ghi nhận hoa hồng. Muốn triển khai thật cần xác minh quyền quảng bá/cashback, tạo link bằng nguồn được phép và kiểm tra báo cáo đơn gắn tracking của từng người mua. Tài liệu bên thứ ba về an_redir không thay thế xác nhận của Shopee.

## Kiểm thử

`tests/catalog.test.js`: chuẩn hóa URL, chặn URL lạ/short-link resolver, tier/key, cache và request trùng, 429/cooldown, batch từng dòng, stale/401, zero khác unknown, lịch sử và giới hạn đầu vào, timeout/JSON hỏng, HTTP auth/CSRF và bất biến số dư.

`e2e/catalog.spec.js`: các trạng thái chưa cấu hình/chưa đăng nhập, product/history, tìm kiếm/phân trang, lỗi/thử lại, phân biệt mua demo/link gốc, keyboard, không tràn ngang ở 1440/768/390/320px, hai theme. Test dùng fixture rõ ràng, không gọi API thật và không cần secret trong CI.
