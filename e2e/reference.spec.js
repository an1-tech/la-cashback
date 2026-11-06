import { test, expect } from "@playwright/test";

test("Blog đã gỡ, hỏi đáp theo danh mục và liên hệ lưu vào hỗ trợ", async ({
  page,
}) => {
  await page.goto("/app#blog");
  await expect(
    page.getByRole("heading", { name: "Tạo link hoàn tiền", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Blog", exact: true }),
  ).toHaveCount(0);
  await page.goto("/app#faq");
  await page
    .getByRole("navigation", { name: "Danh mục hỏi đáp" })
    .getByRole("button", { name: /^Tài khoản/ })
    .click();
  await page.getByText("Đăng xuất tài khoản ở đâu?", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("details[open]")).toContainText("Đăng xuất nằm");
  await page.goto("/app#contact");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Đăng nhập", exact: true })
    .click();
  await page.getByRole("dialog").locator("button[type=submit]").click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Kiểm tra liên hệ giao diện mới");
  await page
    .getByLabel("Nội dung", { exact: true })
    .fill("Gửi ý kiến thử từ trang liên hệ của Lá Cashback");
  await page.getByRole("button", { name: "Gửi ý kiến", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Thao tác thành công" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xem yêu cầu đã gửi", exact: true })
    .click();
  await expect(page.locator("main")).toContainText(
    "Kiểm tra liên hệ giao diện mới",
  );
});

test("Menu điện thoại, banner và chuyển thẳng từ hồ sơ đến bộ lọc đơn/sổ giao dịch", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app");
  const menu = page.getByRole("button", { name: "Mở menu điều hướng" });
  await menu.click();
  const drawer = page.getByRole("dialog", { name: "Menu điều hướng" });
  await expect(drawer.getByRole("link")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    drawer.getByRole("button", { name: "Phản hồi và góp ý", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(drawer.getByRole("link")).toBeFocused();
  await page
    .getByRole("navigation", { name: "Khám phá Lá" })
    .getByRole("button", { name: "Hỏi đáp", exact: true })
    .click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hỏi đáp");
  await menu.click();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await page.goto("/app");
  await page.getByRole("button", { name: "Banner sau", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Đã mua nhưng chưa thấy đơn?" }),
  ).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Đăng nhập", exact: true })
    .click();
  await page.getByRole("dialog").locator("button[type=submit]").click();
  await page.getByRole("button", { name: "Mở tài khoản", exact: true }).click();
  await page
    .getByRole("button", { name: "Chờ hoàn tiền", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Chờ duyệt", exact: true }),
  ).toHaveClass("active");
  await page.getByRole("button", { name: "Mở tài khoản", exact: true }).click();
  await page
    .getByRole("button", { name: "Lịch sử giao dịch", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sổ giao dịch", exact: true }),
  ).toHaveClass("active");
  await expect(
    page.getByRole("columnheader", { name: "Biến động" }),
  ).toBeVisible();
});
