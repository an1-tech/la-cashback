import test from "node:test";
import assert from "node:assert/strict";
import {
  createAddLiveTag,
  productIdentity,
  productImage,
  buildAffiliateLink,
} from "../server/providers/addlivetag.js";
import { openDb } from "../server/db.js";
import { seed } from "../server/seed.js";
import { createApp } from "../server/app.js";

const key = "a".repeat(48);
const sample = {
  status: "success",
  productInfo: {
    itemId: "123",
    productName: "Tai nghe kiểm thử",
    shopName: "Cửa hàng kiểm thử",
    productLink: "https://shopee.vn/product/45/123?utm_source=bad",
    imageUrl: "https://down-vn.img.susercontent.com/file/test",
    price: 100000,
    commission: 5000,
    totalRatePercent: 5,
    dataSource: "db",
  },
};
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

test("Catalog: canonical links, exact host allowlist, IDs and safe affiliate encoding", () => {
  assert.deepEqual(
    productIdentity("https://shopee.vn/ten-i.45.123?utm_source=x#fragment"),
    { itemId: "123", shopId: "45", url: "https://shopee.vn/product/45/123" },
  );
  assert.deepEqual(productIdentity("123"), { itemId: "123" });
  for (const url of [
    "https://shopee.vn.evil.test/product/1/2",
    "https://shopee.vn@localhost/product/1/2",
    "https://127.0.0.1/product/1/2",
    "https://shopee.vn:8000/product/1/2",
    "https://s.shopee.vn/abc",
    "https://vn.shp.ee/abc",
    "https://shopee.vn/no-product",
    "0",
    9007199254740992,
  ])
    assert.throws(() => productIdentity(url));
  assert.equal(productImage("https://evil.test/test.svg"), null);
  assert.equal(
    productImage("https://bad.susercontent.com.evil.test/test.png"),
    null,
  );
  const link = new URL(
    buildAffiliateLink(
      "https://shopee.vn/product/45/123?utm_source=x",
      "123456",
      ["la", "", "demo", "opaque123"],
    ),
  );
  assert.equal(link.origin, "https://s.shopee.vn");
  assert.equal(
    link.searchParams.get("origin_link"),
    "https://shopee.vn/product/45/123",
  );
  assert.equal(link.searchParams.get("sub_id"), "la--demo-opaque123");
  assert.throws(() =>
    buildAffiliateLink("https://shopee.vn/product/45/123", "123", [
      "user-email",
    ]),
  );
});

test("Catalog: key stays server-side, tier forwarding, canonical item_id and concurrent cache", async () => {
  let calls = 0;
  const service = createAddLiveTag({
    apiKey: key,
    baseRate: "8",
    cap: "20000",
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url.hostname, "data.addlivetag.com");
      assert.equal(url.searchParams.get("item_id"), "123");
      assert.equal(url.searchParams.get("base_rate"), "8");
      assert.equal(url.searchParams.get("cap"), "20000");
      assert.equal(options.headers["X-API-Key"], key);
      assert.equal(url.href.includes(key), false);
      assert.equal(options.redirect, "error");
      return json(sample);
    },
  });
  const [a, b] = await Promise.all([
    service.inspect("https://shopee.vn/product/45/123"),
    service.inspect("https://shopee.vn/product/45/123"),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(a, b);
  assert.equal(a.product.url, "https://shopee.vn/product/45/123");
  assert.equal(a.product.commission, 5000);
  assert.equal(a.commissionBasis, "configured_tier");
  assert.equal(a.referenceOnly, true);
  assert.equal(JSON.stringify(a).includes(key), false);
  assert.equal((await service.inspect("123")).cached, true);
  assert.equal(calls, 1);
});

test("Catalog: optional config does not call network; invalid tier/key fails clearly", async () => {
  const service = createAddLiveTag({
    apiKey: "",
    fetchImpl: () => assert.fail("Network must not be called"),
  });
  assert.equal(service.capabilities.configured, false);
  await assert.rejects(service.inspect("123"), { status: 503 });
  for (const options of [
    { apiKey: "secret\nheader" },
    { baseRate: "NaN" },
    { cap: "-1" },
  ])
    assert.throws(() => createAddLiveTag(options));
});

test("Catalog: 429 Retry-After prevents subsequent upstream requests", async () => {
  let at = 1000,
    calls = 0;
  const service = createAddLiveTag({
    apiKey: key,
    clock: () => at,
    fetchImpl: async () => {
      calls++;
      return json({}, 429, { "Retry-After": "180" });
    },
  });
  await assert.rejects(service.inspect("123"), {
    status: 429,
    retryAfter: 180,
  });
  at += 10000;
  await assert.rejects(service.inspect("124"), {
    status: 429,
    retryAfter: 170,
  });
  assert.equal(calls, 1);
  at += 180000;
  await assert.rejects(service.inspect("124"), { status: 429 });
  assert.equal(calls, 2);
});

test("Catalog: batch preserves duplicates and partial rows, honors source cooldown", async () => {
  let calls = 0;
  const service = createAddLiveTag({
    apiKey: key,
    fetchImpl: async (url) => {
      calls++;
      assert.equal(url.searchParams.get("max_api"), "10");
      return json({
        status: "success",
        summary: { fromCache: 1, stale: 1, skipped: 1 },
        limits: { sourceRateLimited: true, sourceCooldownSeconds: 120 },
        products: [
          {
            status: "success",
            dataSource: "db",
            productInfo: sample.productInfo,
          },
          {
            status: "stale",
            dataSource: "db",
            productInfo: sample.productInfo,
          },
          { status: "skipped", reason: "source_cooldown" },
        ],
      });
    },
  });
  const result = await service.batch(["123", "123", "124"]);
  assert.deepEqual(
    result.products.map((p) => p.status),
    ["success", "stale", "skipped"],
  );
  assert.deepEqual(
    result.products.map((p) => p.itemId),
    ["123", "123", "124"],
  );
  await assert.rejects(service.inspect("125"), { status: 429 });
  assert.equal(calls, 1);
  await assert.rejects(service.batch(Array(101).fill("123")), { status: 400 });
});

test("Catalog: stale fallback is explicit and does not mask invalid credentials", async () => {
  let at = 1000,
    code = 200;
  const service = createAddLiveTag({
    apiKey: key,
    clock: () => at,
    fetchImpl: async () => json(sample, code),
  });
  await service.inspect("123");
  at += 600001;
  code = 500;
  const stale = await service.inspect("123");
  assert.equal(stale.stale, true);
  assert.ok(stale.warning);
  code = 401;
  await assert.rejects(service.inspect("123"), { status: 503 });
  at += 86400000;
  code = 500;
  await assert.rejects(service.inspect("123"), { status: 502 });
});

test("Catalog: fallback, zero commission and unknown amounts stay distinct", async () => {
  let mode = "fallback";
  const service = createAddLiveTag({
    apiKey: key,
    fetchImpl: async (url) =>
      json({
        ...sample,
        productInfo: {
          ...sample.productInfo,
          itemId: url.searchParams.get("item_id"),
          price: mode === "fallback" ? null : 0,
          commission: 0,
          totalRatePercent: 0,
          dataSource: mode,
        },
      }),
  });
  const a = await service.inspect("123");
  assert.equal(a.product.commission, null);
  assert.equal(a.product.price, null);
  mode = "db";
  const b = await service.inspect("124");
  assert.equal(b.product.commission, 0);
  assert.equal(b.product.price, 0);
});

test("Catalog: history uses compact changes, explicit tier for commissions and input caps", async () => {
  const service = createAddLiveTag({
    apiKey: key,
    fetchImpl: async (url) => {
      assert.equal(url.searchParams.get("changes_only"), "1");
      assert.equal(url.searchParams.get("no_product"), "1");
      return json({
        status: "success",
        items: [{ status: "no_data" }],
        limits: { truncated: true },
      });
    },
  });
  assert.equal((await service.history(["123"])).truncated, true);
  await assert.rejects(service.history(["123"], { type: "commission" }), {
    status: 400,
  });
  await assert.rejects(service.history(["123"], { days: 731 }), {
    status: 400,
  });
  await assert.rejects(service.history(Array(51).fill("123")), { status: 400 });
  await assert.rejects(service.offers({ kind: "evil" }), { status: 400 });
  await assert.rejects(service.offers({ kind: "shopProducts" }), {
    status: 400,
  });
});

test("Catalog: request timeout, malformed JSON and redirects never expose upstream secrets", async () => {
  const slow = createAddLiveTag({
    apiKey: key,
    timeoutMs: 10,
    fetchImpl: async (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error(key))),
      ),
  });
  await assert.rejects(
    slow.inspect("123"),
    (err) => err.status === 502 && !err.message.includes(key),
  );
  const malformed = createAddLiveTag({
    apiKey: key,
    fetchImpl: async () => new Response("not-json"),
  });
  await assert.rejects(malformed.inspect("123"), { status: 502 });
  const redirect = createAddLiveTag({
    apiKey: key,
    fetchImpl: async () => {
      throw new Error(key);
    },
  });
  await assert.rejects(
    redirect.inspect("123"),
    (err) => !err.message.includes(key),
  );
});

test("Catalog: all offer lists and cache-only batch use bounded provider parameters", async () => {
  const paths = [];
  const service = createAddLiveTag({
    apiKey: key,
    fetchImpl: async (url) => {
      paths.push(url.pathname);
      if (url.pathname.includes("batch")) {
        assert.equal(url.searchParams.get("cache_only"), "1");
        assert.equal(url.searchParams.get("max_api"), "0");
        return json({
          status: "success",
          products: [{ status: "skipped", reason: "not_cached" }],
        });
      }
      if (url.pathname.includes("shopee-offer"))
        return json({
          status: "success",
          offers: [{ name: "Chiến dịch kiểm thử", commissionRate: "0.05" }],
        });
      if (url.pathname.includes("shop-offer"))
        return json({
          status: "success",
          shops: [{ name: "Shop kiểm thử", shopId: 45, commissionRate: "0" }],
        });
      if (url.pathname.includes("shop-products"))
        assert.equal(url.searchParams.get("shopId"), "45");
      return json({
        status: "success",
        dataSource: "db",
        hasNextPage: true,
        products: [
          {
            ...sample.productInfo,
            name: "Ưu đãi kiểm thử",
            commissionRate: "0.05",
            link: "https://evil.test/buy",
            image: "javascript:alert(1)",
          },
        ],
      });
    },
  });
  assert.equal((await service.offers()).products.length, 1);
  assert.equal(
    (await service.offers({ kind: "campaigns" })).offers[0].ratePercent,
    5,
  );
  assert.equal(
    (await service.offers({ kind: "shops" })).shops[0].ratePercent,
    0,
  );
  assert.equal(
    (await service.offers({ kind: "shopProducts", shopId: "45" })).hasNextPage,
    true,
  );
  assert.equal(
    (await service.batch(["123"], { cacheOnly: true })).products[0].status,
    "skipped",
  );
  assert.equal(new Set(paths).size, 5);
  await assert.rejects(service.offers({ limit: 51 }), { status: 400 });
});

test("Catalog: oversized responses and mismatched item IDs are rejected", async () => {
  const oversized = createAddLiveTag({
    apiKey: key,
    fetchImpl: async () => new Response("x".repeat(2000001)),
  });
  await assert.rejects(oversized.inspect("123"), { status: 502 });
  const mismatch = createAddLiveTag({
    apiKey: key,
    fetchImpl: async () => json(sample),
  });
  await assert.rejects(mismatch.inspect("999"), { status: 502 });
});

test("Catalog HTTP: auth/CSRF, optional data, secret redaction and no ledger side effects", async () => {
  const db = openDb(":memory:");
  seed(db);
  let calls = 0;
  const service = createAddLiveTag({
    apiKey: key,
    fetchImpl: async () => {
      calls++;
      return json(sample);
    },
  });
  const server = createApp(db, { catalog: service });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    assert.equal(
      (await fetch(base + "/catalog/product?itemId=123")).status,
      401,
    );
    const login = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "ban@demo.local",
        password: "Demo@123456",
      }),
    });
    const cookie = login.headers.get("set-cookie").split(";")[0],
      { csrf } = await login.json();
    const headers = {
      Cookie: cookie,
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf,
    };
    const before = await (await fetch(base + "/wallet", { headers })).json();
    const bootstrap = await (
      await fetch(base + "/bootstrap", { headers })
    ).json();
    assert.equal(bootstrap.provider, "demo");
    assert.equal(bootstrap.catalog.configured, true);
    assert.equal(JSON.stringify(bootstrap).includes(key), false);
    const inspect = await fetch(base + "/links/inspect", {
      method: "POST",
      headers,
      body: JSON.stringify({ url: "https://shopee.vn/product/45/123" }),
    });
    const data = await inspect.json();
    assert.equal(inspect.status, 200);
    assert.equal(data.estimate, null);
    assert.equal(data.product.title, "Tai nghe kiểm thử");
    assert.equal(
      (
        await fetch(base + "/catalog/products/batch", {
          method: "POST",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
      403,
    );
    const click = await (
      await fetch(base + "/clicks", {
        method: "POST",
        headers,
        body: JSON.stringify({ url: data.url }),
      })
    ).json();
    assert.equal(click.simulated, true);
    assert.ok(click.redirectUrl.startsWith("/demo-shop?"));
    const short = await (
      await fetch(base + "/links/inspect", {
        method: "POST",
        headers,
        body: JSON.stringify({ url: "https://vn.shp.ee/abc" }),
      })
    ).json();
    assert.ok(short.productError);
    assert.equal(calls, 1);
    const after = await (await fetch(base + "/wallet", { headers })).json();
    assert.deepEqual(after.balances, before.balances);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
