import { test, expect } from "@playwright/test";

test("Đối soát đơn cuối trang tự quay về trang còn dữ liệu", async ({
  page,
}) => {
  const auth = await page.request.post("/api/auth/login", {
    data: { email: "admin@demo.local", password: "Demo@123456" },
  });
  expect(auth.ok()).toBeTruthy();
  const { csrf } = await auth.json();
  const headers = { "X-CSRF-Token": csrf };
  const click = await page.request.post("/api/clicks", {
    headers,
    data: { url: "https://shopee.vn/demo-i.123.456" },
  });
  const { trackingId } = await click.json();
  const tag = "PAGING-" + Date.now();
  const imported = await page.request.post("/api/admin/reports", {
    headers,
    data: {
      rows: Array.from({ length: 51 }, (_, i) => ({
        eventId: `${tag}-${i}`,
        externalId: `${tag}-${i}`,
        itemId: "1",
        clickId: trackingId,
        title: `${tag} sản phẩm ${i}`,
        orderValue: 100000,
        commission: 1000,
        status: "pending",
      })),
    },
  });
  expect((await imported.json()).results.every((r) => !r.error)).toBeTruthy();
  await page.goto("/app#admin/orders");
  await page.getByLabel("Tìm đơn theo tên, email hoặc mã đơn").fill(tag);
  await page.getByRole("button", { name: /^Chờ duyệt/ }).click();
  await expect(
    page.getByText("Trang 1/2 · 51 đơn", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  const reconcile = page.getByRole("button", { name: "Đối soát", exact: true });
  await expect(reconcile).toHaveCount(1);
  await reconcile.click();
  await page.getByRole("button", { name: "Ghi nhận kết quả đối soát" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(reconcile).toHaveCount(50);
  await expect(
    page.getByText("Không có đơn khớp bộ lọc", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Phân trang đơn hàng" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "artifacts/regressions/admin-page-after-reconcile.png",
    fullPage: true,
  });
});

test("Landing không hiển thị chính sách mẫu khi lỗi; có thể thử lại bằng bàn phím", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/bootstrap", async (route) => {
    if (fail)
      return route.fulfill({
        status: 503,
        json: { error: "Tạm thời không tải được" },
      });
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({
      response,
      json: {
        ...data,
        policy: {
          ...data.policy,
          share_bps: 6000,
          hold_days: 3,
          minimum_withdrawal: 100000,
        },
      },
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText(
    "Chưa tải được chính sách hoàn tiền",
  );
  const calculation = page.locator(".landing-calc");
  await expect(calculation).not.toContainText("70%");
  await expect(calculation).not.toContainText("17.500 đ");
  await expect(
    calculation.getByText("Chưa xác định", { exact: true }),
  ).toHaveCount(2);
  await page.getByText("Khi nào tiền hoàn được rút?", { exact: true }).click();
  await expect(page.locator(".landing-faq")).toContainText(
    "Chưa tải được chính sách rút tiền",
  );
  await expect(page.locator(".landing-faq")).not.toContainText("50.000 đ");
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `artifacts/regressions/landing-policy-error-${width}.png`,
      fullPage: true,
    });
  }
  fail = false;
  await page.getByRole("button", { name: "Thử tải lại chính sách" }).focus();
  await page.keyboard.press("Enter");
  await expect(calculation).toContainText("60%");
  await expect(calculation).toContainText("15.000 đ");
  await expect(page.locator(".landing-faq")).toContainText("chờ thêm 3 ngày");
  await expect(page.locator(".landing-faq")).toContainText("100.000 đ");
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("Landing đang tải hoặc chưa có chính sách không công bố mức rút mẫu", async ({
  page,
}) => {
  let release;
  const held = new Promise((r) => {
    release = r;
  });
  await page.route("**/api/bootstrap", async (route) => {
    await held;
    await route.fulfill({ json: { policy: null } });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("status")).toContainText(
    "Đang tải chính sách hoàn tiền",
  );
  await expect(page.locator(".landing-calc")).not.toContainText("70%");
  release();
  await expect(page.getByRole("status")).toContainText(
    "Chưa tải được chính sách hoàn tiền",
  );
});
