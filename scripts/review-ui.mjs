import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout } from "node:timers/promises";
const base = "http://127.0.0.1:3085";
const server = spawn(process.execPath, ["server/index.js"], {
  env: {
    ...process.env,
    PORT: "3085",
    DATABASE_PATH: ":memory:",
    DEMO_MODE: "true",
    TURSO_DATABASE_URL: "",
    TURSO_AUTH_TOKEN: "",
  },
  stdio: "ignore",
  windowsHide: true,
});
let browser;
try {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(base + "/healthz")).ok) break;
    } catch {}
    await setTimeout(250);
  }
  browser = await chromium.launch({
    executablePath: process.env.QA_BROWSER_PATH,
    headless: true,
  });
  mkdirSync("artifacts/reference", { recursive: true });
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const login = await context.request.post(base + "/api/auth/login", {
    data: { email: "ban@demo.local", password: "Demo@123456" },
  });
  if (!login.ok()) throw new Error("Review login failed");
  const page = await context.newPage();
  const issues = [];
  page.on("pageerror", (e) => issues.push(e.message));
  for (const theme of ["light", "dark"]) {
    await page.goto(base);
    await page.evaluate(
      (value) => localStorage.setItem("la-theme", value),
      theme,
    );
    for (const width of [2560, 1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of [
        "",
        "app",
        "app#feed",
        "app#links",
        "app#profile",
        "app#faq",
        "app#contact",
        "app#wallet",
        "app#settings",
      ]) {
        await page.goto(base + "/" + route);
        await page.locator("main h1, #landing-title").first().waitFor();
        await page.locator(".loading").waitFor({ state: "hidden" });
        await page.evaluate(() =>
          Promise.all(
            [...document.images].map((im) => im.decode().catch(() => {})),
          ),
        );
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        if (overflow)
          issues.push(`${theme} ${width} ${route}: horizontal overflow`);
        if ([2560, 390].includes(width))
          await page.screenshot({
            path: `artifacts/reference/${theme}-${width}-${route.replace(/[##]/g, "-") || "landing"}.png`,
            fullPage: true,
          });
      }
    }
  }
  writeFileSync(
    "artifacts/reference/issues.json",
    JSON.stringify(issues, null, 2),
  );
  console.log(JSON.stringify({ issues, folder: "artifacts/reference" }));
  if (issues.length) process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
