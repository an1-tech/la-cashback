import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

async function ready(page) {
  const login = await page.request.post("/api/auth/login", {
    data: { email: "ban@demo.local", password: "Demo@123456" },
  });
  expect(login.ok()).toBe(true);
  const { csrf } = await login.json();
  await page.route("**/api/assistant/status", (route) =>
    route.fulfill({
      json: { configured: true, authenticated: true, csrf },
    }),
  );
}

test("Lá AI: closed initially, auth/config states, Escape and keyboard focus", async ({
  page,
}) => {
  let requests = 0;
  page.on("request", (req) => {
    if (req.url().includes("/api/assistant/")) requests++;
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Mở trợ lý Lá AI" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Trò chuyện với Lá AI" }),
  ).toHaveCount(0);
  expect(requests).toBe(0);
  await page.getByRole("button", { name: "Mở trợ lý Lá AI" }).click();
  const dialog = page.getByRole("dialog", { name: "Trò chuyện với Lá AI" });
  await expect(dialog).toContainText("Lá AI chưa sẵn sàng");
  await expect(page.getByLabel("Câu hỏi cho Lá AI")).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Mở trợ lý Lá AI" }),
  ).toBeFocused();
  await page.route("**/api/assistant/status", (route) =>
    route.fulfill({
      json: { configured: true, authenticated: false, csrf: null },
    }),
  );
  await page.getByRole("button", { name: "Mở trợ lý Lá AI" }).click();
  await expect(dialog).toContainText("Đăng nhập tài khoản Lá");
  await dialog.getByRole("link", { name: /Mở ứng dụng và đăng nhập/ }).click();
  await expect(page).toHaveURL(/\/app#links/);
});

test("Lá AI: send, loading, plain text, retry, reset and session privacy", async ({
  page,
}) => {
  await ready(page);
  let calls = 0;
  await page.route("**/api/assistant/chat", async (route) => {
    const messages = route.request().postDataJSON().messages;
    expect(messages.at(-1).role).toBe("user");
    calls++;
    if (calls === 2)
      return route.fulfill({
        status: 429,
        json: {
          error: "Gemini đang giới hạn lượt hỏi. Vui lòng chờ rồi thử lại.",
        },
      });
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      json: { text: "Dán link vào Trang chủ.\n<img src=x onerror=alert(1)>" },
    });
  });
  await page.goto("/app");
  await page.getByRole("button", { name: "Mở trợ lý Lá AI" }).click();
  const dialog = page.getByRole("dialog", { name: "Trò chuyện với Lá AI" });
  const input = dialog.getByLabel("Câu hỏi cho Lá AI");
  await expect(input).toBeFocused();
  await input.fill("Cách tạo link?");
  await input.press("Enter");
  await expect(dialog.locator(".assistant-message.model")).toContainText(
    "Dán link vào Trang chủ",
  );
  await expect(dialog.locator(".assistant-message img")).toHaveCount(0);
  await input.fill("Câu hỏi thứ hai");
  await input.press("Shift+Enter");
  expect(await input.inputValue()).toBe("Câu hỏi thứ hai\n");
  await dialog.getByRole("button", { name: "Gửi câu hỏi" }).click();
  await expect(dialog.getByRole("alert")).toContainText("giới hạn lượt hỏi");
  await expect(input).toHaveValue("Câu hỏi thứ hai");
  await expect(dialog.locator(".assistant-message.user")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Gửi câu hỏi" }).click();
  await expect(dialog.locator(".assistant-message.model")).toHaveCount(2);
  await dialog
    .getByRole("button", { name: "Bắt đầu cuộc trò chuyện mới" })
    .click();
  await expect(dialog.locator(".assistant-message")).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Cách tạo link hoàn tiền", exact: true })
    .click();
  await expect(dialog.locator(".assistant-message.model")).toHaveCount(1);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("la:session-changed", {
        detail: { authenticated: false },
      }),
    ),
  );
  await expect(dialog.locator(".assistant-message")).toHaveCount(0);
  await expect(input).toBeDisabled();
});

test("Lá AI: desktop/mobile, light/dark, no overlap with bottom nav or overflow", async ({
  page,
}) => {
  await ready(page);
  await page.route("**/api/assistant/chat", (route) =>
    route.fulfill({
      json: {
        text: "Bạn dán link sản phẩm Shopee ở Trang chủ, rồi nhấn Kiểm tra hoàn tiền. Thao tác mua và tiền hoàn trong Lá đều là mô phỏng.",
      },
    }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  mkdirSync("artifacts/assistant", { recursive: true });
  for (const path of ["/", "/app"]) {
    await page.goto(path);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const button = page.getByRole("button", { name: "Mở trợ lý Lá AI" });
      if (width < 761 && path === "/app") {
        const launch = await button.boundingBox(),
          nav = await page
            .getByRole("navigation", { name: "Điều hướng điện thoại" })
            .boundingBox();
        expect(launch.y + launch.height).toBeLessThanOrEqual(nav.y);
      }
      await button.click();
      const dialog = page.getByRole("dialog", { name: "Trò chuyện với Lá AI" });
      await expect(dialog.getByLabel("Câu hỏi cho Lá AI")).toBeEnabled();
      for (const theme of ["light", "dark"]) {
        await page.evaluate((theme) => {
          document.documentElement.dataset.theme = theme;
        }, theme);
        const bounds = await dialog.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if ([1440, 390].includes(width))
          await page.screenshot({
            path: `artifacts/assistant/${path === "/" ? "landing" : "app"}-${width}-${theme}.png`,
          });
      }
      await dialog
        .getByRole("button", { name: "Thu gọn Lá AI", exact: true })
        .click();
    }
  }
});
