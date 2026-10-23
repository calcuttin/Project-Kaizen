import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.KAIZEN_CLOUD_E2E_PORT ?? 5181);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('KAIZEN_CLOUD_E2E_PORT must be a valid port');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: 'cloud-isolation.spec.ts',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm dev --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    env: { VITE_KAIZEN_MODE: 'cloud', VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_mock', VITE_SUPABASE_URL: 'https://account-isolation.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'mock-public-key', VITE_ENABLE_BUNDLED_IMPORTS: 'true' },
  },
});
