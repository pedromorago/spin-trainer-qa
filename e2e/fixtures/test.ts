import { randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';
import { AppShell } from '../pages/AppShell';
import { BuilderPage } from '../pages/BuilderPage';
import { ExplorerPage } from '../pages/ExplorerPage';
import { LoginPage } from '../pages/LoginPage';
import { QuizPage } from '../pages/QuizPage';
import { StatsPage } from '../pages/StatsPage';
import { supabaseSession } from './session';

/** mock: la web con su adaptador en memoria; api: la web en modo http contra la API de QA. */
export type Backend = 'mock' | 'api';

export interface Player {
  id: string;
  /** Token de la sesión inyectada (solo con backend api). */
  accessToken: string | null;
}

interface Fixtures {
  player: Player;
  consoleErrors: string[];
  shell: AppShell;
  login: LoginPage;
  explorer: ExplorerPage;
  quiz: QuizPage;
  builder: BuilderPage;
  stats: StatsPage;
}

export const test = base.extend<Fixtures, { backend: Backend }>({
  backend: ['mock', { option: true, scope: 'worker' }],

  // Un jugador nuevo por test. Con la API, su sesión se inyecta antes de cargar la página; con el mock, cada test
  // tiene su propio contexto (y su localStorage), así que ya empieza sin datos.
  player: [
    async ({ backend, context }, use) => {
      const id = randomUUID();
      let accessToken: string | null = null;
      if (backend === 'api') {
        const session = supabaseSession(id, process.env.QA_SUPABASE_URL ?? 'http://localhost:8089');
        accessToken = session.accessToken;
        await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [session.storageKey, session.value]);
      }
      await use({ id, accessToken });
    },
    { auto: true },
  ],

  // Cualquier error de consola, excepción o respuesta HTTP ≥ 400 no prevista hace fallar el test.
  consoleErrors: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
      });
      page.on('response', (response) => {
        if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.request().method()} ${response.url()}`);
      });
      await use(errors);
      if (testInfo.status === testInfo.expectedStatus) {
        expect(errors, 'errores de consola, excepciones o HTTP ≥ 400').toEqual([]);
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
});

export { expect };
