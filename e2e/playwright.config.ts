import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import type { Backend } from './fixtures/test';

// E2E of the web app (sibling repo ../spin-trainer-web) with two backends and the same specs:
//   mock       build:mock, no backend: fast and deterministic (data from the web's mock)
//   fullstack  build in http mode against the API of env/docker-compose.yml (npm run env:up), injected session
// The reference data is the same in both (btn_open at 25 BB), so the oracles are too. A third build, the public demo
// (build:demo, ADR-0022: the mock's data without sign-in), runs only its own spec (demo.spec.ts).
const web = fileURLToPath(new URL('../../spin-trainer-web', import.meta.url));
const out = (name: string) => fileURLToPath(new URL(`../build/web/${name}`, import.meta.url));
const apiUrl = process.env.QA_API_URL ?? 'http://localhost:8081/api/v1';
// The QA "Supabase" (WireMock): the web only uses it to read the session and to log out.
const supabaseUrl = process.env.QA_SUPABASE_URL ?? 'http://localhost:8089';

const allureResults = fileURLToPath(new URL('../build/allure-results/e2e', import.meta.url));
// Allure results from this run only (workers also load this file: only the main process cleans up).
if (!process.env.TEST_WORKER_INDEX) rmSync(allureResults, { recursive: true, force: true });

// Builds the web app into this repo's build/ (keeps the web repo clean) and serves it as Vercel would, with the
// production headers of its vercel.json (scripts/serve-web.mjs); `origins` are added to the CSP's connect-src.
const server = fileURLToPath(new URL('../scripts/serve-web.mjs', import.meta.url));
const serve = (name: string, port: number, buildArgs: string, origins = '') =>
  `npm run ${buildArgs} -- --outDir "${out(name)}" --emptyOutDir && node "${server}" "${out(name)}" ${port} "${origins}"`;

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
    { name: 'mock', testIgnore: /demo\.spec\.ts/, use: { baseURL: 'http://localhost:4173', backend: 'mock' } },
    { name: 'api-ready', testDir: './fixtures', testMatch: /api\.setup\.ts/, use: { backend: 'api' } },
    {
      name: 'fullstack',
      dependencies: ['api-ready'],
      testIgnore: /demo\.spec\.ts/,
      grepInvert: /@solo-mock/,
      use: { baseURL: 'http://localhost:4174', backend: 'api' },
    },
    { name: 'demo', testMatch: /demo\.spec\.ts/, use: { baseURL: 'http://localhost:4175', backend: 'mock' } },
  ],
  webServer: [
    { command: serve('mock', 4173, 'build:mock'), cwd: web, url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
    {
      command: serve('http', 4174, 'build', `${new URL(apiUrl).origin} ${new URL(supabaseUrl).origin}`),
      cwd: web,
      url: 'http://localhost:4174',
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_MODE: 'http',
        VITE_API_BASE_URL: apiUrl,
        VITE_SUPABASE_URL: supabaseUrl,
        VITE_SUPABASE_ANON_KEY: 'qa-anon-key',
        // Google itself is played by the tests (google-sign-in.spec.ts): this client ID only has to be recognizable.
        VITE_GOOGLE_CLIENT_ID: 'qa-client.apps.googleusercontent.com',
      },
    },
    {
      command: serve('demo', 4175, 'build:demo'),
      cwd: web,
      url: 'http://localhost:4175',
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_MODE: 'demo' },
    },
  ],
});
