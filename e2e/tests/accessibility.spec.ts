import { BTN_OPEN_25_HANDS, btnOpen25 } from '../data/reference';
import { expectAccessible } from '../fixtures/a11y';
import { expect, test } from '../fixtures/test';

test.describe('Accesibilidad (WCAG 2.2 AA con axe)', () => {
  test('Explorer', async ({ page, explorer }, testInfo) => {
    await explorer.open('btn_open', 25);
    await expect(explorer.handsCount).toHaveText(String(BTN_OPEN_25_HANDS));
    await explorer.paint('ALLIN', '72o');
    await expectAccessible(page, testInfo, 'explorer');
  });

  test('Quiz con la corrección abierta', async ({ page, quiz }, testInfo) => {
    await quiz.open('btn_open', 25);
    await quiz.answerWith(btnOpen25);
    await expectAccessible(page, testInfo, 'quiz');
  });

  test('Builder verificado', async ({ page, builder }, testInfo) => {
    await builder.open('btn_open', 25);
    await builder.paint('ALLIN', '72o');
    await builder.verify.click();
    await expect(builder.score).toBeVisible();
    // Clicking Check scrolls the page; at some positions the sticky header leaves a sliver of a grid row, which axe's
    // target-size rule reports for that scroll position only. The scan is made from the top, the same every run.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expectAccessible(page, testInfo, 'builder');
  });

  test('Stats con histórico', async ({ page, shell, quiz, stats }, testInfo) => {
    await quiz.open('btn_open', 25);
    await quiz.answerWith(btnOpen25);
    await shell.goTo('Stats');
    await expect(stats.chart).toBeVisible();
    await expectAccessible(page, testInfo, 'stats');
    await stats.chartAsTable.click();
    await expectAccessible(page, testInfo, 'stats-tabla');
  });

  test('Login', async ({ page, shell, login }, testInfo) => {
    await shell.open('/explorer');
    await shell.signOut.click();
    await expect(login.screen).toBeVisible();
    await expectAccessible(page, testInfo, 'login');
  });

  test('Privacidad', async ({ page }, testInfo) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy', level: 1 })).toBeVisible();
    await expectAccessible(page, testInfo, 'privacidad');
  });
});
