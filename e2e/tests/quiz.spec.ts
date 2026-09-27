import { ACTION_LABELS, BTN_OPEN_25, BTN_OPEN_ACTIONS, btnOpen25, referenceRange } from '../data/reference';
import { expect, test } from '../fixtures/test';

// HU SB Open: the only situation with ten actions; the tenth (FOLD) answers with 0.
const HU_SB_OPEN_ACTIONS = ['MR_4B_C', 'MR_C_C', 'MR_C_F', 'MR_F_F', 'L_PUSH', 'L_C_C', 'L_C_F', 'L_F', 'ALLIN', 'FOLD'];

test.describe('Quiz: corrección contra el rango efectivo (ADR-0012, ADR-0013)', () => {
  test('corrige cada respuesta con el rango de referencia', { tag: '@smoke' }, async ({ page, backend, shell, quiz }) => {
    await quiz.open('btn_open', 25);
    await expect(quiz.spot).toHaveText('BTN Open · 25 BB');

    for (let i = 0; i < 5; i++) {
      // Against the API, the server's grade too (ADR-0013): the verdict on screen is computed by the client.
      const recorded = backend === 'api'
        ? page.waitForResponse((r) => r.url().endsWith('/api/v1/quiz/attempts') && r.request().method() === 'POST')
        : null;
      const { hand, given } = await quiz.answerWith(btnOpen25);
      await expect(quiz.feedback, hand).toContainText('Correct');
      await expect(quiz.expected).toHaveText(ACTION_LABELS[given]);
      if (recorded) {
        const attempt = await (await recorded).json();
        expect(attempt, `${hand}: corrección del servidor`).toMatchObject({ hand, given, expected: given, correct: true, rangeSource: 'default' });
      }
      await quiz.nextHand();
    }

    await expect(quiz.round).toContainText('Round: 5 / 5 (100%)');
    await expect(shell.sessionTotal).toHaveText('5');
    await expect(shell.sessionAccuracy).toHaveText('100%');
  });

  test('una respuesta incorrecta enseña la acción correcta', async ({ shell, quiz }) => {
    await quiz.open('btn_open', 25);
    const hand = await quiz.currentHand();
    const expected = btnOpen25(hand);
    const wrong = BTN_OPEN_ACTIONS.find((action) => action !== expected)!;

    await quiz.answer(wrong);

    await expect(quiz.feedback).toContainText('Wrong');
    await expect(quiz.expected).toHaveText(ACTION_LABELS[expected]);
    await expect(quiz.feedback).toContainText(`(you answered ${ACTION_LABELS[wrong]})`);
    await expect(shell.sessionStreak).toHaveText('0');
  });

  test('se responde con el teclado: tecla de la acción y Enter para seguir', async ({ quiz }) => {
    await quiz.open('btn_open', 25);
    const hand = await quiz.currentHand();
    const key = BTN_OPEN_ACTIONS.indexOf(btnOpen25(hand) as (typeof BTN_OPEN_ACTIONS)[number]) + 1;
    await expect(quiz.answerButton(btnOpen25(hand))).toHaveAttribute('aria-keyshortcuts', String(key));

    await quiz.answerWithKey(key);
    await expect(quiz.feedback).toContainText('Correct');
    await expect(quiz.announcement).toHaveText(`Correct. ${hand}: ${ACTION_LABELS[btnOpen25(hand)]}.`);
    await expect(quiz.next).toHaveAttribute('aria-keyshortcuts', 'Enter ArrowRight');
    await quiz.nextHand();

    await expect(quiz.round).toContainText('Round: 1 / 1 (100%)');
    // The focus goes back to the answers, not to the page body.
    await expect(quiz.answers.getByRole('button').first()).toBeFocused();
  });

  test('la décima acción se responde con la tecla 0', async ({ quiz }) => {
    await quiz.open('hu_sb_open', 25);
    const tenth = quiz.answerButton(HU_SB_OPEN_ACTIONS[9]);
    await expect(tenth).toHaveAttribute('aria-keyshortcuts', '0');
    await expect(quiz.answerButton(HU_SB_OPEN_ACTIONS[8])).toHaveAttribute('aria-keyshortcuts', '9');

    await quiz.answerWithKey('0');

    await expect(quiz.givenAnswer()).toHaveAccessibleName(ACTION_LABELS.FOLD);
  });

  test('Enter sobre una pestaña navega en lugar de pasar de mano', async ({ page, shell, quiz }) => {
    await quiz.open('btn_open', 25);
    await quiz.answer(btnOpen25(await quiz.currentHand()));

    await shell.tab('Stats').focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/stats\?s=btn_open&stack=25$/);
  });

  // The PDF's "3H OS call" table (API V7): one threshold per hand, turned into one range per stack.
  test('ante el open-shove de la SB corrige con la tabla de umbrales «3H OS call»', async ({ quiz }) => {
    const range = referenceRange('bb_vs_sb_os', 10);
    await quiz.open('bb_vs_sb_os', 10);
    await expect(quiz.spot).toHaveText('BB vs SB Open-Shove · 10 BB');

    for (let i = 0; i < 5; i++) {
      const { hand } = await quiz.answerWith((h) => range[h] ?? 'FOLD');
      await expect(quiz.feedback, hand).toContainText('Correct');
      await quiz.nextHand();
    }
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
      await expect(quiz.feedback, hand).toContainText('Correct');
      await quiz.nextHand();
    }
  });
});
