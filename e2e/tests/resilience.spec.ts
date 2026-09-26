import { expectAccessible } from '../fixtures/a11y';
import { allowErrors, expect, test } from '../fixtures/test';

// Quiz chunk of the web build (vite): assets/QuizPage-<hash>.js, downloaded when entering the tab.
const QUIZ_CHUNK = /\/assets\/QuizPage-[\w-]+\.js$/;

/**
 * Fault injection: the Quiz chunk cannot be downloaded (a deploy replaced it, or the connection dropped). The error
 * replaces only the page (the header still works), is accessible and can be recovered by reloading.
 */
test.describe('Resiliencia: una pantalla que no se puede descargar', () => {
  test('muestra un error recuperable sin perder la cabecera', async ({ page, shell, explorer, quiz, routeError, consoleErrors }, testInfo) => {
    await explorer.open('btn_open', 25);
    await expect(explorer.heading).toBeVisible();
    await page.route(QUIZ_CHUNK, (route) => route.abort());

    await shell.goTo('Quiz');

    await expect(routeError.heading).toBeVisible();
    await expect(routeError.message).toContainText('No se pudo descargar');
    await expect(routeError.homeLink).toHaveAttribute('href', '/');
    await expect(shell.tab('Explorer')).toBeVisible();
    await expectAccessible(page, testInfo, 'error-de-ruta');

    await page.unroute(QUIZ_CHUNK);
    await routeError.reload();

    await expect(quiz.hand).toBeVisible();
    await expect(routeError.heading).toBeHidden();
    await expect(page).toHaveURL(/\/quiz\?s=btn_open&stack=25$/);
    // Expected: the aborted download and the error the screen logs for developers.
    expect(allowErrors(consoleErrors, /Failed to load resource|dynamically imported module/)).toBeGreaterThan(0);
  });
});
