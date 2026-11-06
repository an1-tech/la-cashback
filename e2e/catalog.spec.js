import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Fixtures verify UI states without spending a third-party quota or needing secrets in CI.
const product = {
  itemId: "123",
  title: "Tai nghe kiểm thử tích hợp",
  shopName: "Cửa hàng kiểm thử",
  price: 175000,
  commission: 8750,
  ratePercent: 5,
  image: null,
  url: "https://shopee.vn/product/45/123",
  dataSource: "db",
};
const metadata = {
  source: "addlivetag",
  referenceOnly: true,
  commissionBasis: "proxy",
  fetchedAt: "2026-11-05T10:00:00.000Z",
  cached: true,
  stale: true,
  warning:
    "Dữ liệu có thể đã cũ hoặc chưa đầy đủ; hãy kiểm tra lại trên Shopee.",
};
async function mockCatalog(page) {
  await page.route("**/api/bootstrap", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: {
        ...(await response.json()),
        catalog: {
          configured: true,
          source: "addlivetag",
          affiliateLinks: false,
        },
      },
    });
  });
  await page.route("**/api/catalog/**", async (route) => {
    const url = new URL(route.request().url());
    let data;
    if (url.pathname.endsWith("/offers")) {
      const query = url.searchParams.get("keyword");
      data = {
        ...metadata,
        page: Number(url.searchParams.get("page")),
        hasNextPage: url.searchParams.get("page") === "1",
        products:
          query === "không có"
            ? []
            : [
                product,
                {
                  ...product,
                  itemId: "124",
                  title: "Bình nước kiểm thử",
                  price: null,
                  ratePercent: null,
                },
              ],
      };
    } else if (url.pathname.endsWith("/product"))
      data = { ...metadata, product };
    else
      data = {
        ...metadata,
        items: [
          {
            status: "success",
            price: {
              stats: { min: 150000, max: 175000 },
              points: [
                { date: "2026-10-01", price: 150000 },
                { date: "2026-10-15", price: 175000 },
              ],
            },
          },
        ],
      };
    await route.fulfill({ json: data });
  });
  await page.route("**/api/links/inspect", (route) =>
    route.fulfill({
      json: {
        ...metadata,
        product,
        estimate: null,
        url: product.url,
        message:
          "Giá và hoa hồng tham khảo, không phải tiền hoàn được xác nhận.",
      },
    }),
  );
}
async function login(page) {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Đăng nhập", exact: true })
    .click();
  await page.getByRole("dialog").locator("button[type=submit]").click();
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 15000 });
}

test("Catalog: optional configuration, product/history, keyboard and demo separation", async ({
  page,
}) => {
  await mockCatalog(page);
  await page.goto("/app");
  await login(page);
  await page
    .getByRole("textbox", { name: "Link sản phẩm Shopee", exact: true })
    .fill(product.url);
  await page
    .getByRole("button", { name: "Kiểm tra hoàn tiền", exact: true })
    .click();
  const reference = page.getByRole("region", {
    name: "Thông tin sản phẩm tham khảo",
    exact: true,
  });
  await expect(reference).toContainText("8.750");
  await expect(reference).toContainText("Không phải tiền hoàn của bạn");
  await expect(page.locator(".created-link")).toContainText(
    "Đã tạo link theo dõi demo",
  );
  await expect(page.locator(".created-link a")).toHaveAttribute(
    "href",
    /\/demo-shop\?click=/,
  );
  await expect(
    reference.getByRole("link", { name: "Xem giá trên Shopee" }),
  ).toHaveAttribute("href", product.url);
  await reference.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(
    reference.getByRole("columnheader", { name: "Giá (VNĐ)" }),
  ).toBeVisible();
  await expect(reference).toContainText("150.000 đ");
  await reference.getByLabel("Khoảng thời gian").selectOption("30");
  await expect(reference).toContainText("2026-10-15");
  await expect(page.getByText("76.000 đ", { exact: true })).toBeVisible();
});

test("Checkout: saved product, reload, keyboard and mobile/dark layout", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockCatalog(page);
  await page.route("**/api/demo/checkout?**", (route) =>
    route.fulfill({
      json: {
        click: { id: "fixture-click", url: product.url, policyVersion: 1 },
        product: {
          ...product,
          image: "https://down-vn.img.susercontent.com/file/checkout-fixture",
          fetchedAt: metadata.fetchedAt,
        },
        scenario: {
          title: product.title,
          orderValue: product.price,
          commission: product.commission,
          cashback: 6125,
          usesReference: true,
          alreadyRecorded: false,
        },
      },
    }),
  );
  // A local image fixture checks successful rendering without external CDN access in CI.
  await page.route(
    "https://down-vn.img.susercontent.com/file/checkout-fixture",
    (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#f0f4e8"/><path d="M100 230V180a100 100 0 0 1 200 0v50" fill="none" stroke="#557c30" stroke-width="28"/><rect x="75" y="210" width="65" height="100" rx="20" fill="#203027"/><rect x="260" y="210" width="65" height="100" rx="20" fill="#203027"/></svg>',
      }),
  );
  await page.goto("/app");
  await login(page);
  await page
    .getByLabel("Link sản phẩm Shopee", { exact: true })
    .fill(product.url);
  await page
    .getByRole("button", { name: "Kiểm tra hoàn tiền", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mua hàng nhận hoàn tiền", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mua thử sản phẩm", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".checkout-product-name")).toHaveText(
    product.title,
  );
  await expect(page.locator(".checkout-price")).toContainText("175.000");
  await expect(page.locator(".checkout-summary")).toContainText("6.125");
  await expect(page.locator(".checkout-image img")).toHaveJSProperty(
    "naturalWidth",
    400,
  );
  await expect(
    page.getByRole("link", { name: "Xem sản phẩm trên Shopee" }),
  ).toHaveAttribute("href", product.url);
  await page.getByRole("link", { name: "Xem sản phẩm trên Shopee" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Mô phỏng mua & ghi nhận đơn chờ duyệt" }),
  ).toBeFocused();
  mkdirSync("artifacts/checkout", { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(() => {
        document.activeElement?.blur();
        window.scrollTo(0, 0);
      });
      await page.screenshot({
        path: `artifacts/checkout/product-${width}-${theme}.png`,
        fullPage: true,
      });
    }
  }
  expect(errors).toEqual([]);
});

test("Checkout: missing click, ownership error and explicit fallback", async ({
  page,
}) => {
  await page.goto("/app");
  await login(page);
  await page.goto("/demo-shop");
  await expect(
    page.getByText("Chưa có sản phẩm để mua thử", { exact: true }),
  ).toBeVisible();
  await page.route("**/api/demo/checkout?**", (route) =>
    route.fulfill({
      status: 404,
      json: { error: "Không tìm thấy lượt theo dõi của bạn." },
    }),
  );
  await page.goto("/demo-shop?click=unknown");
  await expect(page.getByRole("alert")).toHaveText(
    "Không tìm thấy lượt theo dõi của bạn.",
  );
  await expect(
    page.getByRole("button", { name: "Mô phỏng mua & ghi nhận đơn chờ duyệt" }),
  ).toHaveCount(0);
  await page.unroute("**/api/demo/checkout?**");
  await page.route("**/api/demo/checkout?**", (route) =>
    route.fulfill({
      json: {
        click: { id: "no-data", url: product.url, policyVersion: 1 },
        product: null,
        scenario: {
          title: "Sản phẩm mô phỏng từ lượt mua thử",
          orderValue: 450000,
          commission: 25000,
          cashback: 17500,
          usesReference: false,
          alreadyRecorded: false,
        },
      },
    }),
  );
  await page.reload();
  await expect(page.locator(".checkout-notice").first()).toContainText(
    "Chưa tải được ảnh",
  );
  await expect(page.locator(".checkout-image")).toContainText("Chưa có ảnh");
  await expect(page.locator(".checkout-summary")).toContainText("450.000");
});
