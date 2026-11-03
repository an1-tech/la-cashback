CREATE TABLE member_profiles (
 user_id TEXT PRIMARY KEY REFERENCES users(id), referral_code TEXT NOT NULL UNIQUE,
 ranking_visible INTEGER NOT NULL DEFAULT 0 CHECK(ranking_visible IN (0,1)),
 alias TEXT NOT NULL DEFAULT 'Thành viên Lá'
);
CREATE TABLE referrals (
 invitee_id TEXT PRIMARY KEY REFERENCES users(id), inviter_id TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL, CHECK(invitee_id <> inviter_id)
);
CREATE TABLE reward_events (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
 source TEXT NOT NULL, points INTEGER NOT NULL CHECK(points > 0), label TEXT NOT NULL,
 created_at TEXT NOT NULL, UNIQUE(user_id,source)
);
CREATE TABLE gift_codes (
 code TEXT PRIMARY KEY, points INTEGER NOT NULL CHECK(points > 0), expires_at TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
INSERT INTO gift_codes VALUES ('LACHAMBAO',100,'2099-01-01T00:00:00.000Z',1);
CREATE TABLE posts (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, category TEXT NOT NULL,
 pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0,1)),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at TEXT NOT NULL
);
CREATE TABLE post_likes (
 post_id TEXT NOT NULL REFERENCES posts(id), user_id TEXT NOT NULL REFERENCES users(id),
 PRIMARY KEY(post_id,user_id)
);
INSERT INTO posts VALUES
 ('la-start','Một đường link, một hành trình rõ ràng','Sao chép link sản phẩm Shopee, dán vào Lá và tạo link theo dõi. Trong bản trải nghiệm, nút mua hàng mở cửa hàng mô phỏng. Đơn hàng chỉ xuất hiện sau khi báo cáo được ghi nhận; tạo link không tự cộng tiền.','Hướng dẫn',1,1,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 ('la-wallet','Hiểu từng khoản trong ví của bạn','Chờ duyệt là khoản hoàn chưa được xác nhận. Có thể rút là số tiền đã qua đối soát và thời gian chờ. Yêu cầu rút được giữ riêng để tránh chi hai lần. Tất cả thanh toán ở bản demo đều là mô phỏng.','Ví & đơn hàng',1,1,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 ('la-community','Ghé Lá mỗi ngày, góp thêm một mầm xanh','Điểm danh nhận 10 điểm trải nghiệm mỗi ngày theo giờ Việt Nam. Dùng mã LACHAMBAO để thử nhận 100 điểm. Điểm giúp khám phá hạng thành viên và không có giá trị tiền tệ.','Cộng đồng',0,1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE INDEX reward_user_date ON reward_events(user_id,created_at);
