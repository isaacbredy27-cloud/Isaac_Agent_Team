// Owner: qa-engineer. Runs against scripts/serve-local.mjs (port 8888) with stub auth, fake Claude and a mock GitHub.
import { defineConfig, devices } from "@playwright/test";

const stubEnv = {
  CONTEXT: "test",
  E2E_AUTH_STUB: "1",
  E2E_FAKE_CLAUDE: "1",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  GITHUB_API_BASE: "http://127.0.0.1:8899",
  GITHUB_TOKEN: "test",
  GITHUB_REPO: "test/repo",
};
const chromium = process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : { launchOptions: { executablePath: "/opt/pw-browsers/chromium" } };
const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:8888", trace: "off", timezoneId: "America/New_York", ...chromium },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...chromium } },
    { name: "iphone", use: { ...iphone, browserName: "chromium", ...chromium } },
  ],
  webServer: [
    { command: "node tests/e2e/mock-github.mjs", url: "http://127.0.0.1:8899/__calls", reuseExistingServer: false, timeout: 20_000 },
    {
      // Stub build (client) then the local server. The stub only works in MODE=test.
      command:
        "npm run build:manifest && VITE_E2E_AUTH_STUB=1 npx vite build --config apps/web/vite.config.ts --mode test && node scripts/serve-local.mjs",
      url: "http://localhost:8888/api/jobs",
      reuseExistingServer: false,
      timeout: 180_000,
      env: stubEnv,
    },
    {
      // Build without stub or Supabase config: the app reports "not available" for /agents (no role).
      command:
        "npx vite build --config apps/web/vite.config.ts --mode test --outDir ../../.netlify/e2e-nostub-dist && npx vite preview --config apps/web/vite.config.ts --outDir ../../.netlify/e2e-nostub-dist --port 8890 --strictPort",
      url: "http://localhost:8890/",
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
