import { test, expect } from "@playwright/test";

test("Public demo UI: admin password stays private", async ({ page }) => {
  await page.route("**/api/bootstrap", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({ response, json: { ...data, publicDemo: true } });
  });
  await page.goto("/app");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Đăng nhập", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Quản trị", exact: true }).click();
  await expect(dialog.getByLabel("Mật khẩu (ít nhất 10 ký tự)")).toHaveValue(
    "",
  );
  await expect(
    dialog.getByText("Mật khẩu quản trị do chủ đề án cung cấp riêng."),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Quên mật khẩu", exact: true })
    .click();
  await expect(
    dialog.getByText(/Bản demo online chưa có dịch vụ email/),
  ).toBeVisible();
});
