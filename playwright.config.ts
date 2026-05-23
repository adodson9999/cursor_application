import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // Single worker prevents Electron process conflicts across parallel specs.
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["./harness/reporters/playwright-bug-reporter.ts"],
  ],
  projects: [
    {
      name: "electron",
      testMatch: "**/*.spec.ts",
    },
  ],
  use: {
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "reports/playwright-results",
});
