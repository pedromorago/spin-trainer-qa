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

    await expect(shell.serverWaking).toContainText('Despertando el servidor');
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

    await explorer.open('btn_open', 25);

    await expect(explorer.heading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('error')).toHaveCount(0);
    // Expected: exactly the two injected 503s of /situations, and the browser's console line for each.
    expect(allowErrors(consoleErrors, /^HTTP 503 GET \S+\/api\/v1\/situations$/)).toBe(2);
    expect(allowErrors(consoleErrors, /^console: Failed to load resource: the server responded with a status of 503\b/)).toBe(2);
  });
});
