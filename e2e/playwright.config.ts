import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import type { Backend } from './fixtures/test';

// E2E of the web app (sibling repo ../spin-trainer-web) with two backends and the same specs:
//   mock       build:mock, no backend: fast and deterministic (data from the web's mock)
//   fullstack  build in http mode against the API of env/docker-compose.yml (npm run env:up), injected session
// The reference data is the same in both (btn_open at 25 BB), so the oracles are too.
const web = fileURLToPath(new URL('../../spin-trainer-web', import.meta.url));
const out = (name: string) => fileURLToPath(new URL(`../build/web/${name}`, import.meta.url));
const apiUrl = process.env.QA_API_URL ?? 'http://localhost:8081/api/v1';
// The QA "Supabase" (WireMock): the web only uses it to read the session and to log out.
const supabaseUrl = process.env.QA_SUPABASE_URL ?? 'http://localhost:8089';

const allureResults = fileURLToPath(new URL('../build/allure-results/e2e', import.meta.url));
// Allure results from this run only (workers also load this file: only the main process cleans up).
if (!process.env.TEST_WORKER_INDEX) rmSync(allureResults, { recursive: true, force: true });

// Builds the web app into this repo's build/ (keeps the web repo clean) and serves it with vite preview.
const serve = (name: string, port: number, buildArgs: string) =>
  `npm run ${buildArgs} -- --outDir "${out(name)}" --emptyOutDir && npx vite preview --outDir "${out(name)}" --port ${port} --strictPort`;

export default defineConfig<{ backend: Backend }>({
  testDir: './tests',
  outputDir: '../build/e2e/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: '../build/e2e/report', open: 'never' }],
    ['allure-playwright', { resultsDir: allureResults }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mock', use: { baseURL: 'http://localhost:4173', backend: 'mock' } },
    { name: 'api-ready', testDir: './fixtures', testMatch: /api\.setup\.ts/, use: { backend: 'api' } },
    {
      name: 'fullstack',
      dependencies: ['api-ready'],
      grepInvert: /@solo-mock/,
      use: { baseURL: 'http://localhost:4174', backend: 'api' },
    },
  ],
  webServer: [
    { command: serve('mock', 4173, 'build:mock'), cwd: web, url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
    {
      command: serve('http', 4174, 'build'),
      cwd: web,
      url: 'http://localhost:4174',
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_MODE: 'http',
        VITE_API_BASE_URL: apiUrl,
        VITE_SUPABASE_URL: supabaseUrl,
        VITE_SUPABASE_ANON_KEY: 'qa-anon-key',
      },
    },
  ],
});
