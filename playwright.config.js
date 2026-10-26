import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: "list",
  outputDir: "artifacts/playwright",
  use: {
    baseURL: "http://127.0.0.1:3081",
    headless: true,
    launchOptions: process.env.QA_BROWSER_PATH
      ? { executablePath: process.env.QA_BROWSER_PATH }
      : {},
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node server/index.js",
    url: "http://127.0.0.1:3081/api/bootstrap",
    env: { PORT: "3081", DATABASE_PATH: ":memory:", DEMO_MODE: "true" },
    reuseExistingServer: false,
    timeout: 15000,
  },
});
