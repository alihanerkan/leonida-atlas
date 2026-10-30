import { defineConfig, devices } from '@playwright/test';

// Run against a running app: `php artisan serve` then `npm run test:e2e` (override with E2E_BASE_URL).
export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 60_000,
    fullyParallel: true,
    workers: 4,
    reporter: [['list']],
    use: { baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8000', trace: 'retain-on-failure' },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
