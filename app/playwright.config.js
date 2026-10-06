const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  workers: 1,
  timeout: 40000,
  expect: { timeout: 8000 },
  reporter: [['list'], ['junit', { outputFile: 'e2e/results/junit.xml' }]],
  use: { baseURL: 'http://localhost:8081', viewport: { width: 390, height: 844 }, screenshot: 'only-on-failure', launchOptions: { args: ['--no-sandbox'] } },
  outputDir: 'e2e/results/artifacts',
  webServer: [
    {
      command: 'node ../server/src/index.js',
      env: { PORT: '4000', DB_FILE: '/tmp/gedara-e2e.db', ALLOW_TEST_RESET: '1', HIDE_PAST_SLOTS: '0' },
      url: 'http://localhost:4000/api/health', reuseExistingServer: false, timeout: 30000
    },
    { command: 'node e2e/static.js', url: 'http://localhost:8081', reuseExistingServer: false, timeout: 30000 }
  ]
});
