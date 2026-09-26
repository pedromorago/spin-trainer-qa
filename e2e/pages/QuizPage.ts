import { expect, type Locator, type Page } from '@playwright/test';
import { ACTION_LABELS } from '../data/reference';

/** Quiz: la mesa con la mano del héroe, la respuesta (botones o teclas 1..n) y la corrección. */
export class QuizPage {
  // #region Localizadores
  readonly spot: Locator;
  readonly hand: Locator;
  readonly table: Locator;
  readonly answers: Locator;
  readonly feedback: Locator;
  readonly expected: Locator;
  readonly next: Locator;
  readonly round: Locator;
  readonly customRangeNote: Locator;
  // #endregion

  constructor(readonly page: Page) {
    this.spot = page.getByTestId('quiz-spot');
    this.hand = page.getByTestId('quiz-hand');
    this.table = page.getByTestId('poker-table');
    this.answers = page.getByRole('group', { name: 'Acciones' });
    this.feedback = page.getByTestId('quiz-feedback');
    this.expected = page.getByTestId('quiz-expected');
    this.next = page.getByRole('button', { name: 'Siguiente mano' });
    this.round = page.getByTestId('quiz-stats');
    this.customRangeNote = page.getByTestId('quiz-custom-range');
  }

  // #region Acciones
  async open(situation = 'btn_open', stack: number = 25): Promise<void> {
    await this.page.goto(`/quiz?s=${situation}&stack=${stack}`);
    await expect(this.hand).toBeVisible();
  }

  async currentHand(): Promise<string> {
    return (await this.hand.textContent()) ?? '';
  }

  async answer(action: string): Promise<void> {
    await this.answerButton(action).click();
    await expect(this.feedback).toBeVisible();
  }

  async answerWithKey(key: number): Promise<void> {
    await this.page.keyboard.press(String(key));
    await expect(this.feedback).toBeVisible();
  }

  /** Pasa a la siguiente mano con Enter (atajo) y espera a que la corrección desaparezca. */
  async nextHand(): Promise<void> {
    await this.page.keyboard.press('Enter');
    await expect(this.feedback).toBeHidden();
  }

  /** Responde la mano actual según el oráculo y devuelve la mano y la respuesta dada. */
  async answerWith(oracle: (hand: string) => string): Promise<{ hand: string; given: string }> {
    const hand = await this.currentHand();
    const given = oracle(hand);
    await this.answer(given);
    return { hand, given };
  }
  // #endregion

  // #region Consultas
  answerButton(action: string): Locator {
    return this.answers.getByRole('button', { name: ACTION_LABELS[action], exact: true });
  }
  // #endregion
}
