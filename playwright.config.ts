import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.KAIZEN_E2E_PORT ?? 5180);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('KAIZEN_E2E_PORT must be a valid port');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  testIgnore: 'cloud-isolation.spec.ts',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm dev --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    env: { VITE_KAIZEN_MODE: 'device', VITE_ENABLE_BUNDLED_IMPORTS: 'false' },
    timeout: 120_000,
  },
});
