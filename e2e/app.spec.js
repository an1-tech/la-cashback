import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
test("Desktop: mở React, đăng nhập, ví và giao diện sáng/tối", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  const response = await page.goto("/");
  expect(response.status()).toBe(200);
  await expect(page.getByRole("heading", { name: /Xin chào/ })).toBeVisible();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByRole("dialog").locator('button[type="submit"]').click();
  await expect(
    page.getByRole("heading", { name: "Xin chào, Minh Anh." }),
  ).toBeVisible();
  await expect(page.getByText("76.000 đ", { exact: true })).toBeVisible();
  mkdirSync("artifacts/screenshots", { recursive: true });
  await expect(page.locator(".toast")).not.toBeVisible();
  await page.screenshot({
    path: "artifacts/screenshots/desktop-dark.png",
    fullPage: true,
  });
  await page.getByRole("switch", { name: "Đổi chế độ sáng tối" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({
    path: "artifacts/screenshots/desktop-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Xem chi tiết", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tạo yêu cầu rút tiền" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sổ giao dịch", exact: true }).click();
  await expect(
    page.getByRole("columnheader", { name: "Biến động" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("Điện thoại 390px: điều hướng, lọc ưu đãi, lưu deal và không tràn ngang", async ({
  page,
}) => {
  mkdirSync("artifacts/screenshots", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "Điều hướng điện thoại" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /Xin chào/ })).toBeVisible();
  await page.screenshot({
    path: "artifacts/screenshots/mobile-home.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Đổi chế độ sáng tối", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", { name: "Đổi chế độ sáng tối", exact: true })
    .click();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByRole("dialog").locator('button[type="submit"]').click();
  await expect(
    page.getByRole("heading", { name: /Xin chào, Minh Anh/ }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Điều hướng điện thoại" })
    .getByRole("button", { name: "Ưu đãi", exact: true })
    .click();
  await page.getByRole("button", { name: "Công nghệ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nâng cấp âm thanh" }),
  ).toBeVisible();
  await expect(page.locator(".deal-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Lưu ưu đãi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Bỏ lưu ưu đãi" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Điều hướng điện thoại" })
    .getByRole("button", { name: "Đơn hàng", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Đơn hàng của bạn" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/screenshots/mobile-orders.png",
    fullPage: true,
  });
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("Luồng React: đăng ký → link → đơn demo → quản trị duyệt → rút → thanh toán", async ({
  page,
  browser,
}) => {
  const email = "ui-" + Date.now() + "@demo.local";
  await page.goto("/");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const auth = page.getByRole("dialog");
  await auth.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await auth.getByLabel("Tên của bạn").fill("Người thử UI");
  await auth.getByLabel("Email", { exact: true }).fill(email);
  await auth.getByLabel("Mật khẩu (ít nhất 10 ký tự)").fill("Demo@123456");
  await auth.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(auth).not.toBeVisible();
  await page
    .getByLabel("Link sản phẩm Shopee")
    .fill("https://shopee.vn/demo-i.123.456");
  await page
    .getByRole("button", { name: "Kiểm tra hoàn tiền", exact: true })
    .click();
  await expect(
    page.getByText("Thông tin sản phẩm: Chưa xác định"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mua hàng nhận hoàn tiền", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Thử một lần mua/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mô phỏng mua & ghi nhận đơn chờ duyệt" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Đơn hàng của bạn" }),
  ).toBeVisible();
  await expect(
    page.locator("summary").getByText("17.500 đ", { exact: true }),
  ).toBeVisible();
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await admin.goto("http://127.0.0.1:3081/");
  await admin.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await admin
    .getByRole("dialog")
    .getByRole("button", { name: "Quản trị", exact: true })
    .click();
  await admin.getByRole("dialog").locator('button[type="submit"]').click();
  await admin
    .getByRole("navigation", { name: "Điều hướng chính" })
    .getByRole("button", { name: "Quản trị", exact: true })
    .click();
  await admin
    .getByRole("button", { name: "Đơn & đối soát", exact: true })
    .click();
  const row = admin.getByRole("row").filter({ hasText: email });
  await row.getByRole("button", { name: "Đối soát", exact: true }).click();
  await admin
    .getByRole("dialog")
    .getByLabel("Hoa hồng do nguồn xác nhận (VND)")
    .fill("100000");
  await admin
    .getByRole("button", { name: "Ghi nhận kết quả đối soát" })
    .click();
  await expect(admin.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("navigation", { name: "Điều hướng chính" })
    .getByRole("button", { name: "Cá nhân", exact: true })
    .click();
  await page.getByLabel("Số tài khoản demo").fill("DEMO-00009999");
  await page.getByLabel("Mật khẩu hiện tại").fill("Demo@123456");
  await page
    .getByRole("button", { name: "Xác nhận & lưu ngân hàng demo" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Thao tác thành công." }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Điều hướng chính" })
    .getByRole("button", { name: "Số dư", exact: true })
    .click();
  await page.getByLabel("Số tiền (VND)").fill("50000");
  await page.getByRole("button", { name: "Gửi yêu cầu rút mô phỏng" }).click();
  await expect(page.getByText("Đã gửi yêu cầu", { exact: true })).toBeVisible();
  await admin.getByRole("button", { name: "Rút tiền", exact: true }).click();
  const withdrawalRow = admin.getByRole("row").filter({ hasText: email });
  await withdrawalRow.getByRole("button", { name: "Xử lý" }).click();
  await admin.getByRole("button", { name: "Cập nhật yêu cầu" }).click();
  await expect(admin.getByRole("dialog")).not.toBeVisible();
  await withdrawalRow.getByRole("button", { name: "Xử lý" }).click();
  await admin
    .getByLabel("Mã thanh toán (bắt đầu bằng DEMO-)")
    .fill("DEMO-UI-" + Date.now());
  await admin.getByRole("button", { name: "Cập nhật yêu cầu" }).click();
  await expect(admin.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("cell").filter({ hasText: "Đã thanh toán" }),
  ).toBeVisible();
  await admin.screenshot({
    path: "artifacts/screenshots/admin-withdrawals.png",
    fullPage: true,
  });
  await adminContext.close();
});
test("Quản trị: nhập JSON có lỗi từng dòng, trùng sự kiện và đơn chưa gán", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Quản trị", exact: true })
    .click();
  await page.getByRole("dialog").locator('button[type="submit"]').click();
  await page
    .getByRole("navigation", { name: "Điều hướng chính" })
    .getByRole("button", { name: "Quản trị", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Đơn & đối soát", exact: true })
    .click();
  const field = page.getByLabel("Mảng JSON");
  await expect(field).toBeVisible();
  const rows = JSON.parse(await field.inputValue());
  rows.push({ ...rows[0], eventId: "UI-BAD-" + Date.now(), commission: 1.25 });
  rows.push({
    ...rows[0],
    eventId: "UI-UNMATCHED-" + Date.now(),
    externalId: "UI-UNKNOWN",
    clickId: "unknown",
  });
  rows.push(rows[0]);
  await field.fill(JSON.stringify(rows));
  await page.getByRole("button", { name: "Kiểm tra & nhập báo cáo" }).click();
  await expect(page.locator(".import-results")).toContainText("Dòng 1");
  await expect(page.locator(".import-results")).toContainText("số nguyên");
  await expect(page.locator(".import-results")).toContainText(
    "Chưa gán người dùng",
  );
  await expect(page.locator(".import-results")).toContainText(
    "không cộng trùng",
  );
  await expect(page.locator(".unmatched-row")).toContainText("UI-UNKNOWN");
});
