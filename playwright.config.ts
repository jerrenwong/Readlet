import { defineConfig, devices } from "@playwright/test";

// E2E runs in CI against a local Supabase (`supabase start`) and a production build of the app.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "desktop", use: { viewport: { width: 1280, height: 900 }, browserName: "chromium" } },
  ],
  webServer: { command: "npm run start", url: "http://localhost:3000/welcome", reuseExistingServer: !process.env.CI },
});
