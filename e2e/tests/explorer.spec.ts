import { BTN_OPEN_25_HANDS } from '../data/reference';
import { allowErrors, expect, test } from '../fixtures/test';
import { ExplorerPage } from '../pages/ExplorerPage';

test.describe('Explorer: rango efectivo (ADR-0012)', () => {
  test.beforeEach(async ({ explorer }) => {
    await explorer.open('btn_open', 25);
  });

  test('sin rango personalizado muestra el de referencia', { tag: '@smoke' }, async ({ explorer }) => {
    await expect(explorer.referenceBadge).toBeVisible();
    await expect(explorer.handsCount).toHaveText(String(BTN_OPEN_25_HANDS));
    await expect(explorer.grid.cell('AA')).toHaveAttribute('data-action', 'MR_4B_C');
    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-action', 'FOLD');
    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-implicit', 'true');
    await expect(explorer.grid.cell('AA')).toHaveAccessibleName('AA: MR / 4bet vs 3b / Call AI');
  });

  test('guardar hace efectivo el rango personalizado y persiste al recargar', { tag: '@smoke' }, async ({ page, explorer }) => {
    await explorer.paint('ALLIN', '72o');
    await expect(explorer.modifiedBadge).toBeVisible();

    await explorer.save.click();

    await expect(explorer.savedBadge).toBeVisible();
    await expect(explorer.modifiedBadge).toBeHidden();
    await page.reload();
    await expect(explorer.savedBadge).toBeVisible();
    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-action', 'ALLIN');
    await expect(explorer.grid.cell('AA')).toHaveAttribute('data-action', 'MR_4B_C');
    await expect(explorer.handsCount).toHaveText(String(BTN_OPEN_25_HANDS + 1));
  });

  test('la goma devuelve la mano a la acción implícita', async ({ explorer }) => {
    await explorer.paint('ERASE', 'AA');

    await expect(explorer.grid.cell('AA')).toHaveAttribute('data-action', 'FOLD');
    await expect(explorer.handsCount).toHaveText(String(BTN_OPEN_25_HANDS - 1));
  });

  test('Reset borra el rango personalizado y vuelve al de referencia', async ({ explorer }) => {
    await explorer.paint('ALLIN', '72o');
    await explorer.save.click();
    await expect(explorer.savedBadge).toBeVisible();

    await explorer.resetToReference();

    await expect(explorer.referenceBadge).toBeVisible();
    await expect(explorer.savedBadge).toBeHidden();
    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-action', 'FOLD');
  });

  test('avisa de los cambios sin guardar antes de salir', async ({ page, shell, explorer }) => {
    await explorer.paint('ALLIN', '72o');

    await shell.goTo('Quiz');
    await expect(explorer.unsavedChanges).toBeVisible();
    await explorer.unsavedChanges.getByRole('button', { name: 'Keep editing' }).click();
    await expect(page).toHaveURL(/\/explorer/);
    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-action', 'ALLIN');

    await shell.goTo('Quiz');
    await explorer.unsavedChanges.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/quiz/);
  });

  test('elegir la situación y el stack ya activos no dispara el aviso', async ({ page, shell, explorer }) => {
    // Without ?s=&stack= (the defaults): choosing them wrote them into the URL, a navigation the guard blocked.
    await page.goto('/explorer');
    await explorer.paint('ALLIN', '72o');

    await shell.chooseStack(25);
    await shell.chooseSituation('BTN Open');

    await expect(explorer.unsavedChanges).toBeHidden();
    await expect(explorer.modifiedBadge).toBeVisible();
    await expect(page).toHaveURL(/\/explorer$/);
  });

  test('si los rangos personalizados no cargan, lo dice en vez de enseñar el del PDF', async ({ page, backend, explorer, consoleErrors }) => {
    test.skip(backend !== 'api', 'fallo de red inyectado sobre la API real');
    const USER_RANGES = /\/api\/v1\/ranges\/user$/;
    await page.route(USER_RANGES, (route) => route.fulfill({
      status: 500,
      contentType: 'application/problem+json',
      headers: { 'Access-Control-Allow-Origin': 'http://localhost:4174' },
      body: JSON.stringify({ type: 'urn:spin-trainer:internal', title: 'Internal error', status: 500, detail: 'Fallo inyectado' }),
    }));

    await page.reload();

    await expect(explorer.error).toContainText('Fallo inyectado');
    await expect(explorer.referenceBadge).toBeHidden();
    await page.unroute(USER_RANGES);
    await explorer.error.getByRole('button', { name: 'Retry' }).click();
    await expect(explorer.referenceBadge).toBeVisible();
    expect(allowErrors(consoleErrors, /^HTTP 500 GET \S+\/api\/v1\/ranges\/user$/)).toBe(1);
    expect(allowErrors(consoleErrors, /^console: Failed to load resource: the server responded with a status of 500\b/)).toBe(1);
  });

  test('dos pestañas guardando a la vez: la segunda recibe un conflicto y no pisa a la primera', async ({ page, backend, context, explorer, consoleErrors }) => {
    const otherTab = await context.newPage();
    const other = new ExplorerPage(otherTab);
    await other.open('btn_open', 25);
    await expect(other.referenceBadge).toBeVisible();

    await explorer.paint('ALLIN', '72o');
    await explorer.save.click();
    await expect(explorer.savedBadge).toBeVisible();

    await other.paint('ALLIN', '32o');
    await other.save.click();

    await expect(other.error).toHaveText('Conflict: The range is at version 1; reload');
    await other.reloadAfterConflict.click();
    await expect(other.grid.cell('72o')).toHaveAttribute('data-action', 'ALLIN');
    await expect(other.grid.cell('32o')).toHaveAttribute('data-action', 'FOLD');
    await page.reload();
    await expect(explorer.grid.cell('32o')).toHaveAttribute('data-action', 'FOLD');
    // The second tab's 409 is the conflict this test provokes (with the mock there is no HTTP).
    const conflicts = allowErrors(consoleErrors, /^HTTP 409 PUT \S+\/api\/v1\/ranges\/user\/btn_open\/25$|^console: Failed to load resource: the server responded with a status of 409\b/);
    expect(conflicts).toBe(backend === 'api' ? 2 : 0);
  });
});
