import { BTN_OPEN_ACTIONS, btnOpen25 } from '../data/reference';
import { expect, test } from '../fixtures/test';

test.describe('Stats: agregados de la API sobre los intentos (ADR-0013)', () => {
  test('un jugador nuevo no tiene histórico', async ({ page, stats }) => {
    await page.goto('/stats');

    await expect(stats.globalTotal).toHaveText('0');
    await expect(page.getByTestId('progress-empty')).toBeVisible();
    await expect(stats.weakest).toHaveText('Sin fallos todavía.');
    // Without attempts there is nothing to measure: no situation announces a meter at 0 %.
    await expect(stats.situationMeters).toHaveCount(0);
  });

  test('el histórico cuenta las respuestas corregidas por el servidor', { tag: '@smoke' }, async ({ page, shell, quiz, stats }) => {
    await quiz.open('btn_open', 25);
    const answered: string[] = [];
    for (let i = 0; i < 3; i++) {
      answered.push((await quiz.answerWith(btnOpen25)).hand);
      await quiz.nextHand();
    }
    const missed = await quiz.currentHand();
    await quiz.answer(BTN_OPEN_ACTIONS.find((action) => action !== btnOpen25(missed))!);
    // The Quiz may repeat an earlier hand: misses/attempts of the missed one.
    const attemptsOfMissed = answered.filter((hand) => hand === missed).length + 1;

    await shell.goTo('Stats');

    await expect(stats.globalTotal).toHaveText('4');
    await expect(stats.globalAccuracy).toHaveText(/^75\s?%$/); // Intl es-ES: "75 %"
    await expect(stats.sessionTotal).toHaveText('4');
    await expect(stats.weakest.getByRole('row').filter({ hasText: missed })).toContainText(`1/${attemptsOfMissed}`);
    await expect(stats.chart).toBeVisible();
    await expect(stats.situationMeters).toHaveCount(1);
    await expect(stats.situationMeters).toHaveAccessibleName('Precisión en BTN Open');
    await expect(stats.situationMeters).toHaveAttribute('aria-valuenow', '75');

    await stats.chartAsTable.click();
    await expect(stats.progressTable).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver gráfico' })).toHaveAttribute('aria-pressed', 'true');
  });
});
