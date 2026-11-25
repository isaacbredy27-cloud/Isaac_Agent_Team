// Example config for the app repo (reference; the runnable example above uses the library API).
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:8888", trace: "on-first-retry", timezoneId: "America/New_York" },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 13"] } },
    { name: "pixel", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
