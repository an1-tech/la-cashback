import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

test("Community flows and wide-screen/mobile layouts", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto("/app");
  await page
    .getByRole("button", { name: "Đăng nhập", exact: true })
    .first()
    .click();
  await page.getByRole("dialog").locator("button[type=submit]").click();
  await expect(page.locator(".avatar")).toBeVisible();
  mkdirSync("artifacts/community", { recursive: true });
  await page.locator(".toast").waitFor({ state: "hidden" });
  await page.screenshot({
    path: "artifacts/community/home-2560.png",
    fullPage: true,
  });
  await page.goto("/#checkin");
  await page
    .getByRole("button", { name: "Điểm danh +10 điểm", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Đã điểm danh hôm nay" }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Đã điểm danh hôm nay" }),
  ).toBeDisabled();
  await page.goto("/#gifts");
  await page.getByLabel("Mã quà tặng", { exact: true }).fill("LACHAMBAO");
  await page.getByRole("button", { name: "Nhận quà", exact: true }).click();
  await expect(page.getByText("Thao tác thành công.")).toBeVisible();
  await page.goto("/#rewards");
  await expect(page.locator(".reward-list")).toContainText("+100 điểm");
  await page.goto("/#membership");
  await page
    .getByLabel("Biệt danh trên bảng xếp hạng")
    .fill("Vườn Lá thử nghiệm");
  await page.getByLabel("Cho phép hiển thị biệt danh").check();
  await page.getByRole("button", { name: "Lưu hiển thị xếp hạng" }).click();
  await page.goto("/#ranking");
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();
  await expect(page.locator(".ranking-list")).toContainText(
    "Vườn Lá thử nghiệm",
  );
  await page.goto("/#feed");
  const like = page
    .locator(".feed-post")
    .first()
    .getByRole("button", { name: /lượt thích/ });
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Tìm bài viết").fill("Một đường link");
  await expect(page.locator(".feed-post")).toHaveCount(1);
  await page.getByLabel("Tìm bài viết").fill("");
  for (const width of [2560, 1920, 1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width > 1500 ? 1080 : 900 });
    for (const route of [
      "home",
      "feed",
      "profile",
      "links",
      "checkin",
      "referrals",
      "membership",
      "ranking",
      "help",
    ]) {
      await page.goto("/#" + route);
      await expect(page.locator("main h1").first()).toBeVisible();
      await expect(page.locator(".loading")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route + " overflow " + width,
      ).toBe(true);
      if (
        [2560, 1440, 390].includes(width) &&
        ["home", "feed", "profile"].includes(route)
      )
        await page.screenshot({
          path: `artifacts/community/${route}-${width}.png`,
          fullPage: true,
        });
    }
  }
  await page.goto("/#links");
  await page
    .getByLabel("Link sản phẩm Shopee")
    .fill("https://shopee.vn/product/123/456");
  await page
    .getByRole("button", { name: "Kiểm tra hoàn tiền", exact: true })
    .click();
  await expect(page.locator(".created-link")).toContainText(
    "Đã tạo link theo dõi demo",
  );
  await page.getByText("Link đã tạo gần đây", { exact: true }).click();
  await expect(page.locator(".link-history li").first()).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#help");
  await page.getByText("Vì sao chưa thấy đơn hàng?", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("details[open]")).toContainText(
    "Tạo link không tự sinh đơn",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole("switch", { name: "Đổi chế độ sáng tối" }).click();
  await page.goto("/#profile");
  await page.screenshot({
    path: "artifacts/community/profile-light-1920.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("Logout is visible in the account overview and ends the session", async ({
  page,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/app");
    await page
      .getByRole("button", { name: "Đăng nhập", exact: true })
      .first()
      .click();
    await page.getByRole("dialog").locator('button[type="submit"]').click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.getByRole("button", { name: "Mở tài khoản" }).click();
    const logout = page.getByRole("button", { name: "Đăng xuất", exact: true });
    await expect(logout).toBeInViewport();
    await page.screenshot({
      path: `artifacts/account-logout-${width}.png`,
      fullPage: true,
    });
    await logout.click();
    await expect(page).toHaveURL(/#home$/);
    await expect(
      page.getByRole("button", { name: "Mở tài khoản" }),
    ).toHaveCount(0);
    await page.reload();
    expect(
      (await (await page.request.get("/api/bootstrap")).json()).user,
    ).toBeNull();
    await page.goto("/app#profile");
    await expect(
      page.getByRole("heading", { name: "Một tài khoản, mọi khoản hoàn" }),
    ).toBeVisible();
  }
});
