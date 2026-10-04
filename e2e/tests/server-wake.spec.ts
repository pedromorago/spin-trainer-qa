import { pathToFileURL } from 'node:url';
import type { Page } from '@playwright/test';
import { allowErrors, expect, test } from '../fixtures/test';

const SITUATIONS = /\/api\/v1\/situations$/;
const WEB_ORIGIN = 'http://localhost:4174';

/**
 * Fault injection for the free API instance (ADR-0018): after a while idle it takes up to a minute to wake up, and the
 * first requests meet a slow answer or a gateway error. The app waits with a visible notice and retries by itself.
 */
test.describe('Servidor gratuito despertando', () => {
  test.skip(({ backend }) => backend !== 'api', 'solo tiene sentido contra la API real');

  test('una carga lenta muestra el aviso y desaparece al responder', async ({ page, shell, explorer }) => {
    await page.route(SITUATIONS, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 6000));
      await route.continue();
    });

    await explorer.open('btn_open', 25);

    await expect(shell.serverWaking).toContainText('Waking up the server');
    await expect(explorer.heading).toBeVisible({ timeout: 15_000 });
    await expect(shell.serverWaking).toBeEmpty();
  });

  test('un 503 del host mientras arranca se reintenta solo, sin mostrar error', async ({ page, explorer, consoleErrors }) => {
    let failures = 2;
    await page.route(SITUATIONS, (route) =>
      failures-- > 0
        ? route.fulfill({ status: 503, body: 'waking up', headers: { 'Access-Control-Allow-Origin': WEB_ORIGIN } })
        : route.continue(),
    );

    // The bundled catalog shows the page at once (the heading says nothing about the API): wait for the API's answer.
    const answered = page.waitForResponse((r) => SITUATIONS.test(r.url()) && r.status() === 200, { timeout: 15_000 });
    await explorer.open('btn_open', 25);

    await answered;
    await expect(explorer.heading).toBeVisible();
    await expect(page.getByTestId('error')).toHaveCount(0);
    // Expected: exactly the two injected 503s of /situations, and the browser's console line for each.
    expect(allowErrors(consoleErrors, /^HTTP 503 GET \S+\/api\/v1\/situations$/)).toBe(2);
    expect(allowErrors(consoleErrors, /^console: Failed to load resource: the server responded with a status of 503\b/)).toBe(2);
  });
});

/** A server still asleep: every request to the API waits until `release` is called. */
async function holdApi(page: Page): Promise<() => void> {
  let release = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(/\/api\/v1\//, async (route) => {
    await held;
    await route.continue();
  });
  return release;
}

test.describe('While the free server wakes up (ADR-0018)', () => {
  test.skip(({ backend }) => backend !== 'api', 'only meaningful against the real API');

  test('the Explorer shows the selector and the example range at once, read-only, until the API answers', async ({ page, shell, explorer }) => {
    const release = await holdApi(page);

    await explorer.open('btn_open', 25);

    await expect(shell.situation).toHaveValue('btn_open');
    await expect(explorer.grid.cell('AA')).toHaveAttribute('data-action', 'MR_4B_C');
    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-action', 'FOLD');
    await expect(page.getByTestId('explorer-waiting')).toHaveText('Showing the example range while your ranges load…');
    await expect(explorer.edit, 'nothing to edit until the API says what is saved').toBeDisabled();

    release();

    await expect(explorer.edit).toBeEnabled();
    await expect(page.getByTestId('explorer-waiting')).toHaveCount(0);
    await expect(explorer.referenceBadge).toBeVisible();
  });

  test('once the API answers, the player\'s custom range takes the example one\'s place', async ({ page, explorer }) => {
    await explorer.open('btn_open', 25);
    await explorer.paint('ALLIN', '72o');
    await explorer.save.click();
    await expect(explorer.customBadge).toBeVisible();
    const release = await holdApi(page);

    await page.reload();

    await expect(explorer.grid.cell('72o'), 'the example range meanwhile').toHaveAttribute('data-action', 'FOLD');
    release();
    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-action', 'ALLIN');
    await expect(explorer.customBadge).toBeVisible();
  });

  test('the catalog the web shows meanwhile is the one the API serves', async ({ request, player }) => {
    const bundled = new URL('../../../spin-trainer-web/src/shared/api/mock/situations.js', import.meta.url);
    const { SITUATIONS } = (await import(pathToFileURL(bundled.pathname).href)) as { SITUATIONS: Record<string, unknown>[] };
    const apiUrl = process.env.QA_API_URL ?? 'http://localhost:8081/api/v1';

    const response = await request.get(`${apiUrl}/situations`, { headers: { Authorization: `Bearer ${player.accessToken}` } });

    expect(response.status()).toBe(200);
    const fields = ({ key, label, format, hero, priorActions, stacks, actions, notes }: Record<string, unknown>) =>
      ({ key, label, format, hero, priorActions, stacks, actions, notes: notes ?? null });
    expect(SITUATIONS.map(fields)).toEqual(((await response.json()) as Record<string, unknown>[]).map(fields));
  });
});
