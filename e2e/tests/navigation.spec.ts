import { expect, test } from '../fixtures/test';

test.describe('Navegación y selección', () => {
  test('la raíz conserva la selección de la URL al redirigir', async ({ page, shell }) => {
    await page.goto('/?s=sb_open&stack=20');

    await expect(page).toHaveURL(/\/explorer\?s=sb_open&stack=20$/);
    await expect(shell.situation).toHaveValue('sb_open');
    await expect(shell.stack(20)).toHaveAttribute('aria-pressed', 'true');
  });

  test('la selección viaja en la URL al cambiar de pestaña', async ({ page, shell }) => {
    await shell.open('/explorer', { situation: 'btn_open', stack: 25 });

    await shell.chooseSituation('SB Open (BTN fold)');
    await shell.chooseStack(15);
    await shell.goTo('Builder');

    await expect(page).toHaveURL(/\/builder\?s=sb_open&stack=15$/);
    await expect(shell.situation).toHaveValue('sb_open');
    await expect(shell.stack(15)).toHaveAttribute('aria-pressed', 'true');
  });

  test('una selección que no existe se normaliza', async ({ shell }) => {
    await shell.open('/explorer', { situation: 'mtt_open', stack: 999 });

    await expect(shell.situation).toHaveValue('btn_open');
    await expect(shell.stack(25)).toHaveAttribute('aria-pressed', 'true');
  });

  test('"Any" activa el modo aleatorio', async ({ shell, explorer }) => {
    await shell.open('/explorer', { situation: 'any', stack: 'any' });

    await expect(shell.randomMode).toContainText('Random mode');
    await expect(explorer.page.getByTestId('explorer-random')).toBeVisible();
  });
});
