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
  await expect(page.getByRole("dialog")).not.toBeVisible();
}

test("Catalog: optional configuration, product/history, keyboard and demo separation", async ({
  page,
}) => {
  await page.goto("/app#deals");
  await page
    .getByRole("button", { name: "Dữ liệu Shopee tham khảo", exact: true })
    .click();
  await expect(
    page.getByText("Chưa kết nối nguồn dữ liệu sản phẩm", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ưu đãi minh họa", exact: true })
    .click();
  await expect(page.locator(".deal-card").first()).toBeVisible();
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

test("Catalog: source switch, search, paging, detail and mobile/dark layout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockCatalog(page);
  await page.goto("/app#deals");
  await page
    .getByRole("button", { name: "Dữ liệu Shopee tham khảo", exact: true })
    .click();
  await expect(
    page.getByText("Đăng nhập để tra cứu sản phẩm và lịch sử giá.", {
      exact: true,
    }),
  ).toBeVisible();
  await login(page);
  await expect(page.locator(".catalog-card")).toHaveCount(2);
  await page.getByLabel("Tên sản phẩm", { exact: true }).fill("tai nghe");
  await page.getByRole("button", { name: "Tìm sản phẩm", exact: true }).click();
  await expect(page.locator(".catalog-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.getByText("Trang 2", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Trang sau", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Xem chi tiết", exact: true })
    .first()
    .click();
  await expect(page.locator(".catalog-detail")).toContainText(
    "Tỷ lệ của tài khoản nguồn",
  );
  await page.locator(".catalog-detail summary").click();
  await expect(page.locator(".price-history-table")).toBeVisible();
  mkdirSync("artifacts/catalog", { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    if (width < 761)
      await expect
        .poll(() =>
          page
            .locator(".sidebar")
            .evaluate((element) => element.getBoundingClientRect().right),
        )
        .toBeLessThanOrEqual(0);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      const priceCell = await page
        .getByRole("columnheader", { name: "Giá (VNĐ)" })
        .boundingBox();
      expect(priceCell.x + priceCell.width).toBeLessThanOrEqual(width);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `artifacts/catalog/offers-${width}-${theme}.png`,
        fullPage: true,
      });
    }
  }
  await page.getByLabel("Tên sản phẩm", { exact: true }).fill("không có");
  await page.getByRole("button", { name: "Tìm sản phẩm", exact: true }).click();
  await expect(
    page.getByText("Chưa tìm thấy sản phẩm phù hợp", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Catalog: upstream error stays inside its panel, retry and demo remain usable", async ({
  page,
}) => {
  await mockCatalog(page);
  await page.route("**/api/catalog/offers?**", (route) =>
    route.fulfill({
      status: 429,
      json: { error: "Nguồn đang nghỉ, hãy thử lại sau." },
    }),
  );
  await page.goto("/app#deals");
  await login(page);
  await page
    .getByRole("button", { name: "Dữ liệu Shopee tham khảo", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Nguồn đang nghỉ");
  await expect(
    page.getByRole("button", { name: "Thử tải lại sản phẩm", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ưu đãi minh họa", exact: true })
    .click();
  await expect(page.locator(".deal-card").first()).toBeVisible();
});
