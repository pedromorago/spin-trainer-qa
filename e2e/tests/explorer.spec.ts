import { expect, test } from '../fixtures/test';
import { ExplorerPage } from '../pages/ExplorerPage';

test.describe('Explorer: rango efectivo (ADR-0012)', () => {
  test.beforeEach(async ({ explorer }) => {
    await explorer.open('btn_open', 25);
  });

  test('sin rango personalizado muestra el de referencia', { tag: '@smoke' }, async ({ explorer }) => {
    await expect(explorer.referenceBadge).toBeVisible();
    await expect(explorer.handsCount).toHaveText('28');
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
    await expect(explorer.handsCount).toHaveText('29');
  });

  test('la goma devuelve la mano a la acción implícita', async ({ explorer }) => {
    await explorer.paint('ERASE', 'AA');

    await expect(explorer.grid.cell('AA')).toHaveAttribute('data-action', 'FOLD');
    await expect(explorer.handsCount).toHaveText('27');
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
    await explorer.unsavedChanges.getByRole('button', { name: 'Seguir editando' }).click();
    await expect(page).toHaveURL(/\/explorer/);
    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-action', 'ALLIN');

    await shell.goTo('Quiz');
    await explorer.unsavedChanges.getByRole('button', { name: 'Descartar cambios' }).click();
    await expect(page).toHaveURL(/\/quiz/);
  });

  test('dos pestañas guardando a la vez: la segunda recibe un conflicto y no pisa a la primera', async ({ page, context, explorer }) => {
    const otherTab = await context.newPage();
    const other = new ExplorerPage(otherTab);
    await other.open('btn_open', 25);
    await expect(other.referenceBadge).toBeVisible();

    await explorer.paint('ALLIN', '72o');
    await explorer.save.click();
    await expect(explorer.savedBadge).toBeVisible();

    await other.paint('ALLIN', '32o');
    await other.save.click();

    await expect(other.error).toHaveText('Conflict: El rango está en la versión 1; recarga');
    await other.reloadAfterConflict.click();
    await expect(other.grid.cell('72o')).toHaveAttribute('data-action', 'ALLIN');
    await expect(other.grid.cell('32o')).toHaveAttribute('data-action', 'FOLD');
    await page.reload();
    await expect(explorer.grid.cell('32o')).toHaveAttribute('data-action', 'FOLD');
  });
});
