import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { BTN_OPEN_25_HANDS, btnOpen25 } from '../data/reference';
import { expect, test } from '../fixtures/test';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Analiza la página con axe (WCAG 2.2 AA), adjunta el resultado al informe y exige cero incumplimientos. */
async function expectAccessible(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  await testInfo.attach(`axe-${name}`, { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(summary, `incumplimientos de accesibilidad en ${name}`).toEqual([]);
}

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
