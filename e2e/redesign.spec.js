import { test, expect } from "@playwright/test";

test("Home: responsive layout, keyboard focus and category shortcut", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#shopping-title")).toBeVisible();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => Array.from(document.querySelectorAll("body *")).filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => e.className)), "overflow at " + width).toEqual([]);
    await expect(page.getByRole("button", { name: "Kiểm tra hoàn tiền", exact: true })).toBeVisible();
  }
  await page.getByLabel("Link sản phẩm Shopee").focus();
  await expect(page.getByLabel("Link sản phẩm Shopee")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Dán link từ bộ nhớ tạm" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Kiểm tra hoàn tiền", exact: true })).toBeFocused();
  await page.getByRole("button", { name: /Tai nghe minh họa/ }).click();
  await expect(page.getByRole("button", { name: "Công nghệ", exact: true })).toHaveClass("active");
  await expect(page.locator(".deal-card")).toHaveCount(1);
});
