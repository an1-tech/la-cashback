import { transaction, now } from "./db.js";
import { passwordHash } from "./security.js";
import {
  id,
  ingestReport,
  processWithdrawal,
  requestWithdrawal,
} from "./finance.js";
export const DEMO_PASSWORD = "Demo@123456";
export function seed(db) {
  if (db.prepare("SELECT 1 FROM users LIMIT 1").get()) return false;
  const at = now(),
    userId = id(),
    adminId = id(),
    otherId = id(),
    policyId = id();
  transaction(db, () => {
    for (const [uid, email, name, role] of [
      [userId, "ban@demo.local", "Minh Anh", "user"],
      [adminId, "admin@demo.local", "Quản trị Lá", "admin"],
      [otherId, "khac@demo.local", "Khách Demo", "user"],
    ]) {
      db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(
        uid,
        email,
        name,
        passwordHash(DEMO_PASSWORD),
        role,
        "active",
        "Ngân hàng mô phỏng",
        "DEMO-00001234",
        "NGUOI DUNG DEMO",
        at,
        at,
      );
    }
    db.prepare("INSERT INTO policies VALUES (?,?,?,?,?,?,?,?)").run(
      policyId,
      1,
      7000,
      0,
      50000,
      "2026-01-01T00:00:00.000Z",
      "shopee",
      at,
    );
    db.prepare("INSERT INTO content VALUES (?,?)").run(
      "banner",
      "Mua món bạn thích. Nhận lại một chút vui.",
    );
    db.prepare("INSERT INTO content VALUES (?,?)").run(
      "guide",
      "Dán link sản phẩm, tạo lượt theo dõi rồi mua qua link đó. Tiền hoàn chỉ được ghi nhận khi có dữ liệu đối soát hợp lệ.",
    );
    const expires = new Date(Date.now() + 30 * 86400000).toISOString();
    for (const deal of [
      [
        "deal-1",
        "Góc làm việc, thêm cảm hứng",
        "Nhà cửa",
        "Một góc nhỏ gọn gàng cho ngày làm việc dễ chịu.",
        "GOCXINH",
        "mint",
      ],
      [
        "deal-2",
        "Chăm mình mỗi ngày",
        "Làm đẹp",
        "Khám phá món chăm sóc da phù hợp với bạn.",
        "CHAMMINH",
        "peach",
      ],
      [
        "deal-3",
        "Nâng cấp âm thanh",
        "Công nghệ",
        "Tai nghe và phụ kiện cho những giờ tập trung.",
        "NGHEHAY",
        "lavender",
      ],
      [
        "deal-4",
        "Mặc đẹp theo cách bạn",
        "Thời trang",
        "Những món cơ bản cho tủ đồ mỗi ngày.",
        "MACDEP",
        "blue",
      ],
    ])
      db.prepare("INSERT INTO deals VALUES (?,?,?,?,?,?,?,?,?,1)").run(
        deal[0],
        deal[1],
        deal[2],
        deal[3],
        deal[4],
        expires,
        "https://shopee.vn/demo-i.123.456",
        "Ưu đãi minh họa. Mã không có giá trị sử dụng tại Shopee.",
        deal[5],
      );
  });
  const examples = [
    ["Bàn phím cơ • đơn mẫu", 1290000, 180000, "approved"],
    ["Tai nghe không dây • đơn mẫu", 649000, 42000, "pending"],
    ["Đèn bàn tối giản • đơn mẫu", 320000, 18000, "pending"],
    ["Túi vải canvas • đơn mẫu", 159000, 12000, "rejected"],
  ];
  for (const [
    index,
    [title, orderValue, commission, status],
  ] of examples.entries()) {
    const click = id();
    db.prepare("INSERT INTO clicks VALUES (?,?,?,?,?,?,?)").run(
      click,
      userId,
      policyId,
      "demo",
      "https://shopee.vn/demo-i.123.456",
      title,
      at,
    );
    ingestReport(
      db,
      {
        eventId: `seed-${index}`,
        externalId: `DEMO-102${index}`,
        itemId: "1",
        clickId: click,
        title,
        orderValue,
        commission,
        status,
        reason:
          status === "rejected"
            ? "Hoa hồng bị từ chối trong kịch bản demo."
            : "",
      },
      adminId,
    );
  }
  const w = requestWithdrawal(db, userId, 50000, "seed-withdrawal");
  processWithdrawal(db, w.id, "approved", "", "", adminId);
  processWithdrawal(db, w.id, "paid", "", "DEMO-SEED-TRANSFER", adminId);
  return true;
}
