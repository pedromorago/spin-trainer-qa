import { randomUUID } from 'node:crypto';
import { test as base, expect, type Request } from '@playwright/test';
import { AppShell } from '../pages/AppShell';
import { BuilderPage } from '../pages/BuilderPage';
import { ExplorerPage } from '../pages/ExplorerPage';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { QuizPage } from '../pages/QuizPage';
import { RouteErrorScreen } from '../pages/RouteErrorScreen';
import { StatsPage } from '../pages/StatsPage';
import { Tour } from '../pages/Tour';
import { supabaseSession } from './session';

/** mock: the web with its in-memory adapter; api: the web in http mode against the QA API. */
export type Backend = 'mock' | 'api';

export interface Player {
  id: string;
  /** Token of the injected session (api backend only). */
  accessToken: string | null;
}

interface Fixtures {
  /** Whether the first-visit tour counts as already seen on this device (option; true by default). */
  onboarded: boolean;
  onboarding: void;
  player: Player;
  consoleErrors: string[];
  shell: AppShell;
  login: LoginPage;
  explorer: ExplorerPage;
  quiz: QuizPage;
  builder: BuilderPage;
  stats: StatsPage;
  routeError: RouteErrorScreen;
  landing: LandingPage;
  tour: Tour;
}

export const test = base.extend<Fixtures, { backend: Backend }>({
  backend: ['mock', { option: true, scope: 'worker' }],

  // The first-visit tour (ADR-0022) would cover the Explorer in every spec: this device has already seen it, unless a
  // test asks for a first visit with test.use({ onboarded: false }).
  onboarded: [true, { option: true }],
  onboarding: [
    async ({ onboarded, context }, use) => {
      if (onboarded) {
        // Only in the web's documents: a blank page (a new tab, axe's) has no storage and would throw.
        await context.addInitScript(() => {
          if (location.protocol.startsWith('http')) localStorage.setItem('spin-trainer.tour', 'done');
        });
      }
      await use();
    },
    { auto: true },
  ],

  // A new player per test. With the API, their session is injected before the page loads; with the mock, each test
  // has its own context (and its own localStorage), so it already starts with no data.
  player: [
    async ({ backend, context }, use) => {
      const id = randomUUID();
      let accessToken: string | null = null;
      if (backend === 'api') {
        const session = supabaseSession(id, process.env.QA_SUPABASE_URL ?? 'http://localhost:8089');
        accessToken = session.accessToken;
        // Only in the web's documents: a blank page (a new tab, axe's) has no storage and would throw.
        await context.addInitScript(([key, value]) => {
          if (location.protocol.startsWith('http')) localStorage.setItem(key, value);
        }, [session.storageKey, session.value]);
      }
      await use({ id, accessToken });
    },
    { auto: true },
  ],

  // Any unexpected console error, exception, failed request or HTTP response ≥ 400 fails the test. On the whole
  // context, so a second tab is watched too; and after waiting for the requests still in flight (the Quiz records the
  // last answer in the background: its response may arrive after the test's last step).
  consoleErrors: [
    async ({ page, context }, use, testInfo) => {
      const errors: string[] = [];
      const inFlight = new Set<Request>();
      context.on('weberror', (error) => errors.push(`pageerror: ${error.error().message}`));
      context.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
      });
      context.on('request', (request) => inFlight.add(request));
      context.on('requestfinished', (request) => inFlight.delete(request));
      context.on('requestfailed', (request) => {
        inFlight.delete(request);
        // Aborted by a navigation (the browser's own cancellation) is not a failure of the system under test.
        const reason = request.failure()?.errorText ?? '';
        if (reason !== 'net::ERR_ABORTED') errors.push(`requestfailed ${request.method()} ${request.url()} ${reason}`);
      });
      context.on('response', (response) => {
        if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.request().method()} ${response.url()}`);
      });
      await use(errors);
      const deadline = Date.now() + 5_000;
      while (inFlight.size > 0 && !page.isClosed() && Date.now() < deadline) await page.waitForTimeout(50);
      if (testInfo.status === testInfo.expectedStatus) {
        expect(errors, 'errores de consola, excepciones, peticiones fallidas o HTTP ≥ 400').toEqual([]);
      }
    },
    { auto: true },
  ],

  shell: async ({ page }, use) => use(new AppShell(page)),
  login: async ({ page }, use) => use(new LoginPage(page)),
  explorer: async ({ page }, use) => use(new ExplorerPage(page)),
  quiz: async ({ page }, use) => use(new QuizPage(page)),
  builder: async ({ page }, use) => use(new BuilderPage(page)),
  stats: async ({ page }, use) => use(new StatsPage(page)),
  routeError: async ({ page }, use) => use(new RouteErrorScreen(page)),
  landing: async ({ page }, use) => use(new LandingPage(page)),
  tour: async ({ page }, use) => use(new Tour(page)),
});

/**
 * Removes from the console guard the errors a test provokes on purpose and returns how many there were, so the test
 * can require them. Any other error still fails the test.
 */
export function allowErrors(errors: string[], expected: RegExp): number {
  const unexpected = errors.filter((error) => !expected.test(error));
  const allowed = errors.length - unexpected.length;
  errors.splice(0, errors.length, ...unexpected);
  return allowed;
}

export { expect };
