import { ACTION_LABELS, BTN_OPEN_25, BTN_OPEN_ACTIONS, btnOpen25 } from '../data/reference';
import { expect, test } from '../fixtures/test';

test.describe('Quiz: corrección contra el rango efectivo (ADR-0012, ADR-0013)', () => {
  test('corrige cada respuesta con el rango de referencia', { tag: '@smoke' }, async ({ shell, quiz }) => {
    await quiz.open('btn_open', 25);
    await expect(quiz.spot).toHaveText('BTN Open · 25 BB');

    for (let i = 0; i < 5; i++) {
      const { hand, given } = await quiz.answerWith(btnOpen25);
      await expect(quiz.feedback, hand).toContainText('Correcto');
      await expect(quiz.expected).toHaveText(ACTION_LABELS[given]);
      await quiz.nextHand();
    }

    await expect(quiz.round).toContainText('Ronda: 5 / 5 (100%)');
    await expect(shell.sessionTotal).toHaveText('5');
    await expect(shell.sessionAccuracy).toHaveText('100%');
  });

  test('una respuesta incorrecta enseña la acción correcta', async ({ shell, quiz }) => {
    await quiz.open('btn_open', 25);
    const hand = await quiz.currentHand();
    const expected = btnOpen25(hand);
    const wrong = BTN_OPEN_ACTIONS.find((action) => action !== expected)!;

    await quiz.answer(wrong);

    await expect(quiz.feedback).toContainText('Incorrecto');
    await expect(quiz.expected).toHaveText(ACTION_LABELS[expected]);
    await expect(quiz.feedback).toContainText(`(respondiste ${ACTION_LABELS[wrong]})`);
    await expect(shell.sessionStreak).toHaveText('0');
  });

  test('se responde con el teclado: tecla de la acción y Enter para seguir', async ({ quiz }) => {
    await quiz.open('btn_open', 25);
    const hand = await quiz.currentHand();
    const key = BTN_OPEN_ACTIONS.indexOf(btnOpen25(hand) as (typeof BTN_OPEN_ACTIONS)[number]) + 1;
    await expect(quiz.answerButton(btnOpen25(hand))).toHaveAttribute('aria-keyshortcuts', String(key));

    await quiz.answerWithKey(key);
    await expect(quiz.feedback).toContainText('Correcto');
    await quiz.nextHand();

    await expect(quiz.round).toContainText('Ronda: 1 / 1 (100%)');
  });

  test('con rango personalizado se corrige con el del jugador', async ({ shell, explorer, quiz }) => {
    // The whole reference range becomes all-in: any hand in it would be graded differently with the reference one.
    await explorer.open('btn_open', 25);
    await explorer.paint('ALLIN', ...Object.keys(BTN_OPEN_25));
    await explorer.save.click();
    await expect(explorer.savedBadge).toBeVisible();

    await shell.goTo('Quiz');
    await expect(quiz.customRangeNote).toBeVisible();
    for (let i = 0; i < 8; i++) {
      const { hand } = await quiz.answerWith((h) => (h in BTN_OPEN_25 ? 'ALLIN' : 'FOLD'));
      await expect(quiz.feedback, hand).toContainText('Correcto');
      await quiz.nextHand();
    }
  });
});
