import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'cloud-isolation.spec.ts',
  use: { baseURL: 'http://localhost:5181', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 5181',
    url: 'http://localhost:5181',
    reuseExistingServer: false,
    env: { VITE_KAIZEN_MODE: 'cloud', VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_mock', VITE_SUPABASE_URL: 'https://account-isolation.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'mock-public-key', VITE_ENABLE_BUNDLED_IMPORTS: 'true' },
  },
});
