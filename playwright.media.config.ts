import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /media\.spec\.ts/,
  timeout: 90000,
  use: {
    baseURL: "http://127.0.0.1:43123",
    video: "on",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npx next dev --hostname 127.0.0.1 --port 43123",
    url: "http://127.0.0.1:43123",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
