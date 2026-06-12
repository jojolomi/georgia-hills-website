import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["admin-v3-auth.spec.js"],
  timeout: 45000,
  expect: { timeout: 10000 },
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4273",
    trace: "on-first-retry"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } }
  ],
  webServer: {
    command: "npx http-server astro-site/dist -p 4273",
    url: "http://127.0.0.1:4273/admin-v3/",
    reuseExistingServer: true,
    timeout: 120000
  }
});
