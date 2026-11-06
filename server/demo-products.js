import { ensure } from "./security.js";
import { transaction } from "./db.js";
import { cashback } from "./finance.js";
import { productIdentity, productImage } from "./providers/addlivetag.js";

const amount = (value) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1e12
    ? Math.floor(value)
    : null;

// Only save the server provider's lookup, never a browser-submitted price/title.
// The snapshot is per click, so another lookup or an upstream price update cannot
// silently change an existing purchase scenario.
export function saveClickProduct(db, click, lookup) {
  const product = lookup?.product;
  if (!product?.title || !product.itemId) return;
  const identity = productIdentity(click.url);
  ensure(
    identity.itemId === String(product.itemId),
    "Thông tin sản phẩm không khớp link đã tạo.",
    502,
  );
  transaction(db, () => {
    db.prepare(
      "INSERT INTO click_products(click_id,item_id,title,shop_name,image_url,price,commission,source,fetched_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(click_id) DO NOTHING",
    ).run(
      click.id,
      identity.itemId,
      product.title.trim().slice(0, 200),
      product.shopName || null,
      productImage(product.image),
      amount(product.price),
      amount(product.commission),
      product.dataSource || "unknown",
      lookup.fetchedAt || new Date().toISOString(),
    );
    db.prepare(
      "UPDATE clicks SET product_name=(SELECT title FROM click_products WHERE click_id=?) WHERE id=? AND product_name IS NULL",
    ).run(click.id, click.id);
  });
}
export function demoCheckout(db, userId, clickId) {
  const click = db
    .prepare(
      "SELECT c.*,p.version,p.share_bps FROM clicks c JOIN policies p ON p.id=c.policy_id WHERE c.id=? AND c.user_id=?",
    )
    .get(clickId, userId);
  ensure(click, "Không tìm thấy lượt theo dõi của bạn.", 404);
  const row = db
    .prepare("SELECT * FROM click_products WHERE click_id=?")
    .get(click.id);
  const event = db
    .prepare("SELECT payload FROM provider_events WHERE event_id=?")
    .get(`demo-order-${click.id}`);
  const original = event ? JSON.parse(event.payload) : null;
  const orderValue = original?.orderValue ?? row?.price ?? 450000;
  const commission =
    original?.commission ?? Math.min(row?.commission ?? 25000, orderValue);
  const payload = original || {
    eventId: `demo-order-${click.id}`,
    externalId: `DEMO-${click.id}`,
    itemId: row?.item_id || "1",
    clickId: click.id,
    title:
      row?.title || click.product_name || "Sản phẩm mô phỏng từ lượt mua thử",
    orderValue,
    commission,
    status: "pending",
  };
  return {
    click: { id: click.id, url: click.url, policyVersion: click.version },
    product: row
      ? {
          itemId: row.item_id,
          title: row.title,
          shopName: row.shop_name,
          image: productImage(row.image_url),
          price: row.price,
          commission: row.commission,
          dataSource: row.source,
          fetchedAt: row.fetched_at,
        }
      : null,
    scenario: {
      title: payload.title,
      orderValue,
      commission,
      cashback: cashback(commission, click.share_bps),
      usesReference: !!row,
      alreadyRecorded: !!original,
    },
    payload,
  };
}
