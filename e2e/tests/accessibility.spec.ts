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
    await expect(login.form).toBeVisible();
    await expectAccessible(page, testInfo, 'login');
  });
});
