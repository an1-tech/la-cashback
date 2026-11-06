import test from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../server/db.js";
import { seed } from "../server/seed.js";
import { createApp } from "../server/app.js";
import { createAddLiveTag } from "../server/providers/addlivetag.js";
import { demoCheckout, saveClickProduct } from "../server/demo-products.js";

const url = "https://shopee.vn/product/45/123";
const product = {
  itemId: "123",
  productName: "Đồng hồ kiểm thử 43mm",
  shopName: "Cửa hàng đồng hồ",
  imageUrl: "https://down-vn.img.susercontent.com/file/watch",
  price: 3285000,
  commission: 138550,
  dataSource: "db",
};

async function fixture() {
  const db = openDb(":memory:");
  seed(db);
  let calls = 0,
    offline = false;
  const catalog = createAddLiveTag({
    apiKey: "a".repeat(48),
    fetchImpl: async () => {
      calls++;
      if (offline) throw new Error("offline");
      return new Response(
        JSON.stringify({ status: "success", productInfo: product }),
      );
    },
  });
  const server = createApp(db, { catalog });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(path, auth = {}, body) {
    const response = await fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }
  async function login(email = "ban@demo.local") {
    const result = await request(
      "/auth/login",
      {},
      { email, password: "Demo@123456" },
    );
    assert.equal(result.status, 200);
    return { Cookie: result.cookie, "X-CSRF-Token": result.data.csrf };
  }
  return {
    db,
    request,
    login,
    calls: () => calls,
    offline: () => {
      offline = true;
    },
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      db.close();
    },
  };
}

test("Demo checkout: server snapshot, ownership, exact order and duplicate protection", async () => {
  const f = await fixture();
  try {
    const auth = await f.login(),
      other = await f.login("khac@demo.local");
    const before = f.db.prepare("SELECT COUNT(*) n FROM ledger").get().n;
    await f.request("/links/inspect", auth, { url });
    const created = await f.request("/clicks", auth, {
      url,
      product: { title: "Giả mạo", price: 1 },
      commission: 999999,
    });
    assert.equal(created.status, 200);
    const clickId = new URL(
      created.data.redirectUrl,
      "http://localhost",
    ).searchParams.get("click");
    assert.equal(f.calls(), 1, "inspect and creation share the provider cache");
    assert.equal(
      (await f.request(`/demo/checkout?clickId=${clickId}`)).status,
      401,
    );
    assert.equal(
      (await f.request(`/demo/checkout?clickId=${clickId}`, other)).status,
      404,
    );
    assert.equal(
      (await f.request("/demo/order", other, { clickId })).status,
      404,
    );
    const checkout = await f.request(`/demo/checkout?clickId=${clickId}`, auth);
    assert.equal(checkout.data.product.title, product.productName);
    assert.equal(checkout.data.product.image, product.imageUrl);
    assert.equal(checkout.data.product.price, product.price);
    assert.equal(checkout.data.scenario.cashback, 96985);
    assert.equal("payload" in checkout.data, false);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM ledger").get().n, before);
    f.offline();
    for (let i = 0; i < 2; i++)
      assert.deepEqual(
        (await f.request(`/demo/checkout?clickId=${clickId}`, auth)).data,
        checkout.data,
      );
    assert.equal(
      f.calls(),
      1,
      "saved products require no new provider request",
    );
    const purchase = await f.request("/demo/order", auth, {
      clickId,
      orderValue: 1,
      commission: 1,
      title: "Giả mạo",
    });
    assert.equal(purchase.status, 200);
    const order = f.db
      .prepare("SELECT * FROM orders WHERE id=?")
      .get(purchase.data.orderId);
    assert.equal(order.title, product.productName);
    assert.equal(order.item_id, "123");
    assert.equal(order.order_value, product.price);
    assert.equal(order.commission, product.commission);
    assert.equal(order.cashback, 96985);
    const ledgerCount = f.db.prepare("SELECT COUNT(*) n FROM ledger").get().n;
    const duplicate = await f.request("/demo/order", auth, { clickId });
    assert.equal(duplicate.data.duplicate, true);
    assert.equal(duplicate.data.orderId, order.id);
    assert.equal(
      f.db.prepare("SELECT COUNT(*) n FROM ledger").get().n,
      ledgerCount,
    );
    assert.equal(
      (await f.request(`/demo/checkout?clickId=${clickId}`, auth)).data.scenario
        .alreadyRecorded,
      true,
    );
  } finally {
    await f.close();
  }
});

test("Demo checkout: old links gain product metadata without changing recorded financial events", async () => {
  const f = await fixture();
  try {
    const auth = await f.login();
    const owner = f.db
      .prepare("SELECT id FROM users WHERE email='ban@demo.local'")
      .get().id;
    const policy = f.db
      .prepare("SELECT id FROM policies ORDER BY version DESC LIMIT 1")
      .get().id;
    const clickId = "old-product-click";
    f.db
      .prepare("INSERT INTO clicks VALUES (?,?,?,?,?,?,?)")
      .run(clickId, owner, policy, "demo", url, null, new Date().toISOString());
    const original = await f.request("/demo/order", auth, { clickId });
    assert.equal(original.status, 200);
    const before = f.db
      .prepare("SELECT payload FROM provider_events WHERE event_id=?")
      .get(`demo-order-${clickId}`).payload;
    const checkout = await f.request(`/demo/checkout?clickId=${clickId}`, auth);
    assert.equal(checkout.data.product.title, product.productName);
    assert.equal(checkout.data.scenario.orderValue, 450000);
    assert.equal(checkout.data.scenario.commission, 25000);
    assert.equal(
      (await f.request("/demo/order", auth, { clickId })).data.duplicate,
      true,
    );
    assert.equal(
      f.db
        .prepare("SELECT payload FROM provider_events WHERE event_id=?")
        .get(`demo-order-${clickId}`).payload,
      before,
    );
    saveClickProduct(
      f.db,
      { id: clickId, url },
      {
        product: {
          itemId: "123",
          title: "Giá mới",
          price: 999,
          commission: 10,
        },
      },
    );
    assert.equal(
      demoCheckout(f.db, owner, clickId).product.price,
      product.price,
    );
  } finally {
    await f.close();
  }
});

test("Demo checkout: provider outage fallback and zero amounts stay explicit", async () => {
  const f = await fixture();
  try {
    const auth = await f.login();
    f.offline();
    const created = await f.request("/clicks", auth, { url });
    assert.equal(created.status, 200);
    const clickId = new URL(
      created.data.redirectUrl,
      "http://localhost",
    ).searchParams.get("click");
    const fallback = await f.request(`/demo/checkout?clickId=${clickId}`, auth);
    assert.equal(fallback.data.product, null);
    assert.equal(fallback.data.scenario.orderValue, 450000);
    assert.equal(fallback.data.scenario.usesReference, false);
    saveClickProduct(
      f.db,
      { id: clickId, url },
      {
        product: {
          itemId: "123",
          title: "Sản phẩm giá 0",
          price: 0,
          commission: 0,
          image: "https://evil.test/x",
        },
      },
    );
    const zero = await f.request(`/demo/checkout?clickId=${clickId}`, auth);
    assert.equal(zero.data.product.image, null);
    assert.equal(zero.data.scenario.orderValue, 0);
    assert.equal(zero.data.scenario.commission, 0);
    assert.equal(
      (await f.request("/demo/order", auth, { clickId })).status,
      200,
    );
  } finally {
    await f.close();
  }
});
